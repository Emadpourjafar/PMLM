const API = "https://nerkh.jahankhahan.shop/data/live.json";
const CACHE = "arzem_rates_v4";
const META = "arzem_rates_meta_v4";

const currencies = {
  dollar: ["دلار آمریکا", "دلار", "$"], euro: ["یورو", "یورو", "€"],
  yuan: ["یوان چین", "یوان", "¥"], aed: ["درهم امارات", "درهم", "AED"],
  lira: ["لیر ترکیه", "لیر", "₺"], pound: ["پوند انگلیس", "پوند", "£"],
  afn: ["افغانی", "افغانی", "AFN"], rub: ["روبل روسیه", "روبل", "RUB"],
  inr: ["روپیه هند", "روپیه", "INR"], sar: ["ریال سعودی", "ریال", "SAR"],
  qar: ["ریال قطر", "ریال", "QAR"], kwd: ["دینار کویت", "دینار", "KWD"],
  omr: ["ریال عمان", "ریال", "OMR"], iqd: ["دینار عراق", "دینار", "IQD"],
  chf: ["فرانک سوئیس", "فرانک", "CHF"], cad: ["دلار کانادا", "دلار کانادا", "C$"],
  aud: ["دلار استرالیا", "دلار استرالیا", "A$"], tether: ["تتر", "تتر", "USDT"]
};

const $ = (s) => document.querySelector(s);
const fmt = (n) => new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 }).format(n);
let products = [];
let rates = null;
let currentView = "table";

function getCachedRates() {
  try {
    return {
      rates: JSON.parse(localStorage.getItem(CACHE) || "null"),
      meta: JSON.parse(localStorage.getItem(META) || "null")
    };
  } catch {
    return { rates: null, meta: null };
  }
}

function getRate(key) {
  const raw = rates?.[key];
  const n = Number(String(raw ?? "").replace(/[,\s٬]/g, "").replace(/٫/g, "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function formatToman(value) {
  return value == null ? "ثبت نشده" : `${fmt(value)} تومان`;
}

function suggestedPrice(product, currencyKey) {
  const price = product.retailPriceToman;
  const rate = getRate(currencyKey);
  if (price == null || !rate) return null;
  const multiplier = price < 3000000 ? 1.6 : 1.5;
  return (price * multiplier) / rate;
}

function safeUrl(url) {
  try {
    const parsed = new URL(url);
    return ["https:", "http:"].includes(parsed.protocol) ? parsed.href : "";
  } catch {
    return "";
  }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}

function imageMarkup(product, className = "") {
  const url = safeUrl(product.imageUrl);
  if (!url) return `<div class="image-placeholder ${className}">تصویر موجود نیست</div>`;
  return `<img class="${className}" src="${escapeHtml(url)}" alt="${escapeHtml(product.name)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'image-placeholder',textContent:'تصویر در دسترس نیست'}))">`;
}

function fillCurrencySelect() {
  Object.entries(currencies).forEach(([key, data]) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = `${data[2]}  ${data[0]}`;
    $("#productCurrency").appendChild(option);
  });
}

function renderTable() {
  const key = $("#productCurrency").value;
  $("#suggestedHeading").textContent = key
    ? `قیمت پیشنهادی فروش (${currencies[key][1]})`
    : "قیمت پیشنهادی فروش";
  $("#productTableBody").innerHTML = products.map(product => {
    const suggestion = suggestedPrice(product, key);
    const image = safeUrl(product.imageUrl);
    const imageCell = image
      ? `<a class="table-image-link" href="${escapeHtml(image)}" target="_blank" rel="noopener">${imageMarkup(product, "table-image")}<span>مشاهده تصویر</span></a>`
      : `<span class="muted">ندارد</span>`;
    return `<tr>
      <td class="product-name">${escapeHtml(product.name)}</td>
      <td>${formatToman(product.representativePriceToman)}</td>
      <td>${formatToman(product.retailPriceToman)}</td>
      <td class="suggested">${key ? (suggestion == null ? "قیمت ناموجود" : `${fmt(suggestion)} ${currencies[key][1]}`) : "ارز را انتخاب کنید"}</td>
      <td>${imageCell}</td>
    </tr>`;
  }).join("");
}

function renderCards() {
  const key = $("#productCurrency").value;
  $("#cardsContainer").innerHTML = products.map(product => {
    const suggestion = suggestedPrice(product, key);
    return `<article class="product-card card">
      ${imageMarkup(product, "product-card-image")}
      <h3>${escapeHtml(product.name)}</h3>
      <div class="product-card-prices">
        <div><small>قیمت نماینده در ایران</small><b>${formatToman(product.representativePriceToman)}</b></div>
        <div><small>قیمت مصرف‌کننده در ایران</small><b>${formatToman(product.retailPriceToman)}</b></div>
        <div class="card-suggested"><small>قیمت پیشنهادی فروش</small><b>${key ? (suggestion == null ? "قیمت ناموجود" : `${fmt(suggestion)} ${currencies[key][1]}`) : "ارز را انتخاب کنید"}</b></div>
      </div>
    </article>`;
  }).join("");
}

function render() {
  if (currentView === "table") renderTable();
  else renderCards();
  $("#productCount").textContent = `${fmt(products.length)} محصول در فهرست`;
  const key = $("#productCurrency").value;
  $("#productRate").textContent = key
    ? (getRate(key) ? `نرخ ${currencies[key][0]} دریافت شد؛ قیمت‌های پیشنهادی محاسبه شده‌اند.` : "نرخ ارز انتخاب‌شده در دسترس نیست.")
    : "برای محاسبه قیمت پیشنهادی، ارز را انتخاب کنید.";
}

function setView(view) {
  currentView = view;
  const table = view === "table";
  $("#tableContainer").hidden = !table;
  $("#cardsContainer").hidden = table;
  $("#tableView").classList.toggle("selected", table);
  $("#cardView").classList.toggle("selected", !table);
  render();
}

async function loadProducts() {
  try {
    const response = await fetch("products.json", { cache: "no-cache" });
    if (!response.ok) throw new Error("PRODUCTS");
    products = await response.json();
    render();
  } catch {
    $("#productCount").textContent = "بارگذاری فهرست محصولات ناموفق بود.";
    $("#productTableBody").innerHTML = `<tr><td colspan="5" class="empty-state">فایل فهرست محصولات پیدا نشد.</td></tr>`;
  }
}

async function loadRates() {
  const cached = getCachedRates();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    let response;
    try {
      response = await fetch(API, { cache: "no-store", signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) throw new Error("HTTP");
    const data = await response.json();
    if (!data.rates || typeof data.rates !== "object") throw new Error("BAD_DATA");
    rates = data.rates;
    localStorage.setItem(CACHE, JSON.stringify(data.rates));
    localStorage.setItem(META, JSON.stringify({ date: data.date, time: data.time }));
    $("#status").textContent = "نرخ زنده";
    $("#status").previousElementSibling.style.background = "#69cf9a";
  } catch {
    if (cached.rates && typeof cached.rates === "object") {
      rates = cached.rates;
      $("#status").textContent = "آخرین نرخ ذخیره‌شده";
      $("#status").previousElementSibling.style.background = "#d9a75e";
    } else {
      $("#status").textContent = "نرخ در دسترس نیست";
      $("#status").previousElementSibling.style.background = "#d97878";
    }
  }
  render();
}

fillCurrencySelect();
$("#productCurrency").addEventListener("change", render);
$("#tableView").addEventListener("click", () => setView("table"));
$("#cardView").addEventListener("click", () => setView("cards"));
loadProducts();
loadRates();
