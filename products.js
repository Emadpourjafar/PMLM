const API = "https://raw.githubusercontent.com/iran-market/iran-market.github.io/main/data/latest-toman.json";
const CACHE = "arzem_rates_v5";
const META = "arzem_rates_meta_v5";

const SYMBOLS = {
  dollar: "USD_IRR_FREE", euro: "EUR_IRR_FREE", yuan: "CNY_IRR_FREE", aed: "AED_IRR_FREE",
  lira: "TRY_IRR_FREE", pound: "GBP_IRR_FREE", afn: "AFN_IRR_FREE", rub: "RUB_IRR_FREE",
  inr: "INR_IRR_FREE", sar: "SAR_IRR_FREE", qar: "QAR_IRR_FREE", kwd: "KWD_IRR_FREE",
  omr: "OMR_IRR_FREE", iqd: "IQD_IRR_FREE", chf: "CHF_IRR_FREE", cad: "CAD_IRR_FREE",
  aud: "AUD_IRR_FREE", tether: "USDT_IRR"
};

// استخراج نرخ‌ها از payload.data.categories؛ رکوردهای stale نادیده گرفته می‌شوند.
// قیمت‌ها از قبل تومان هستند و تقسیم بر ۱۰ نمی‌شوند.
function parseRatesPayload(payload) {
  const categories = payload?.data?.categories;
  if (!categories || typeof categories !== "object") throw new Error("BAD_DATA");
  const records = Object.values(categories).flat();
  const bySymbol = {};
  records.forEach(record => {
    if (!record || record.stale === true) return;
    const price = Number(record.price);
    if (Number.isFinite(price) && price > 0) bySymbol[record.symbol] = price;
  });
  const rates = {};
  Object.entries(SYMBOLS).forEach(([key, symbol]) => {
    if (bySymbol[symbol]) rates[key] = bySymbol[symbol];
  });
  if (!Object.keys(rates).length) throw new Error("NO_VALID_RATES");
  const jalali = String(payload.data.generated_at_jalali || "").trim().split(/\s+/);
  return { rates, meta: { date: jalali[0] || "", time: jalali[1] || "" } };
}

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
  return value == null ? "قیمت ثبت نشده" : `${fmt(value)} تومان`;
}

// فقط retailPriceToman از products.json خوانده می‌شود؛ مقدار نامعتبر → null (بدون حدس)
function validRetail(value) {
  if (value === null || value === undefined || value === "" || typeof value === "boolean") return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// قیمت نماینده همیشه محاسبه می‌شود: مصرف‌کننده ÷ 1.1
function representativePrice(product) {
  return product.retailPriceToman == null ? null : product.retailPriceToman / 1.1;
}

// قیمت پیشنهادی: زیر ۳ میلیون ×1.6، از ۳ میلیون به بالا ×1.5، تقسیم بر نرخ ارز
function suggestedPrice(product, currencyKey) {
  const price = product.retailPriceToman;
  const rate = getRate(currencyKey);
  if (price == null || !rate) return null;
  const multiplier = price < 3000000 ? 1.6 : 1.5;
  return (price * multiplier) / rate;
}

/* ---------- جستجو ---------- */
function normalizeDigits(value) {
  return String(value ?? "")
    .replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
}

function normalizeText(value) {
  return normalizeDigits(value)
    .replace(/[يى]/g, "ی").replace(/ك/g, "ک").replace(/ۀ/g, "ه")
    .replace(/[\u200c\u200f\u200e]/g, " ").replace(/[\u064b-\u065f\u0640]/g, "")
    .toLowerCase().replace(/\s+/g, " ").trim();
}

// نسخه‌های متنی یک قیمت (بدون جداکننده) برای جستجوی بخشی از عدد
function priceHaystack(value) {
  if (value == null || !Number.isFinite(value)) return "";
  const shown = normalizeDigits(fmt(value)).replace(/[,٬\s]/g, "").replace(/٫/g, ".");
  return [String(Math.round(value)), String(Math.floor(value)), value.toFixed(2), shown].join(" ");
}

function matchesSearch(product, query, currencyKey) {
  const tokens = normalizeText(query).split(" ").filter(Boolean);
  if (!tokens.length) return true;
  const name = normalizeText(product.name);
  const prices = [
    priceHaystack(product.retailPriceToman),
    priceHaystack(representativePrice(product)),
    priceHaystack(suggestedPrice(product, currencyKey))
  ].join(" ");
  return tokens.every(token => {
    if (name.includes(token)) return true;
    const numeric = token.replace(/[,٬]/g, "").replace(/٫/g, ".");
    return /^[\d.]+$/.test(numeric) && prices.includes(numeric);
  });
}

function visibleProducts() {
  const key = $("#productCurrency").value;
  const query = $("#productSearch")?.value || "";
  return products.filter(product => matchesSearch(product, query, key));
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
  const list = visibleProducts();
  if (!list.length) {
    $("#productTableBody").innerHTML = `<tr><td colspan="5" class="empty-state">محصولی پیدا نشد</td></tr>`;
    return;
  }
  $("#productTableBody").innerHTML = list.map(product => {
    const suggestion = suggestedPrice(product, key);
    const image = safeUrl(product.imageUrl);
    const imageCell = image
      ? `<a class="table-image-link" href="${escapeHtml(image)}" target="_blank" rel="noopener">${imageMarkup(product, "table-image")}<span>مشاهده تصویر</span></a>`
      : `<span class="muted">ندارد</span>`;
    return `<tr>
      <td class="product-name">${escapeHtml(product.name)}</td>
      <td>${formatToman(representativePrice(product))}</td>
      <td>${formatToman(product.retailPriceToman)}</td>
      <td class="suggested">${key ? (suggestion == null ? "قیمت ناموجود" : `${fmt(suggestion)} ${currencies[key][1]}`) : "ارز را انتخاب کنید"}</td>
      <td>${imageCell}</td>
    </tr>`;
  }).join("");
}

function renderCards() {
  const key = $("#productCurrency").value;
  const list = visibleProducts();
  if (!list.length) {
    $("#cardsContainer").innerHTML = `<div class="card empty-state search-empty">محصولی پیدا نشد</div>`;
    return;
  }
  $("#cardsContainer").innerHTML = list.map(product => {
    const suggestion = suggestedPrice(product, key);
    return `<article class="product-card card">
      ${imageMarkup(product, "product-card-image")}
      <h3>${escapeHtml(product.name)}</h3>
      <div class="product-card-prices">
        <div><small>قیمت نماینده در ایران</small><b>${formatToman(representativePrice(product))}</b></div>
        <div><small>قیمت مصرف‌کننده در ایران</small><b>${formatToman(product.retailPriceToman)}</b></div>
        <div class="card-suggested"><small>قیمت پیشنهادی فروش</small><b>${key ? (suggestion == null ? "قیمت ناموجود" : `${fmt(suggestion)} ${currencies[key][1]}`) : "ارز را انتخاب کنید"}</b></div>
      </div>
    </article>`;
  }).join("");
}

function render() {
  if (currentView === "table") renderTable();
  else renderCards();
  const shown = visibleProducts().length;
  const searching = ($("#productSearch")?.value || "").trim() !== "";
  $("#productCount").textContent = searching
    ? `${fmt(shown)} محصول از ${fmt(products.length)} محصول`
    : `${fmt(products.length)} محصول در فهرست`;
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
    const raw = await response.json();
    // قیمت نماینده/پیشنهادی از فایل خوانده نمی‌شود؛ فقط name، imageUrl و retailPriceToman
    products = (Array.isArray(raw) ? raw : []).map(item => ({
      name: String(item?.name ?? ""),
      imageUrl: item?.imageUrl ?? "",
      retailPriceToman: validRetail(item?.retailPriceToman)
    }));
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
    const parsed = parseRatesPayload(await response.json());
    rates = parsed.rates;
    try {
      localStorage.setItem(CACHE, JSON.stringify(parsed.rates));
      localStorage.setItem(META, JSON.stringify(parsed.meta));
    } catch {}
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
$("#productSearch").addEventListener("input", render);
$("#tableView").addEventListener("click", () => setView("table"));
$("#cardView").addEventListener("click", () => setView("cards"));
loadProducts();
loadRates();
