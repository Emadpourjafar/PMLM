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
  return { rates, meta: { date: jalali[0] || "", time: jalali[1] || "", iso: String(payload.data.generated_at || "") } };
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
const fmt = (n) => new Intl.NumberFormat(numLocale(), { maximumFractionDigits: 2 }).format(n);
const cName = (key) => (isEn() ? CURRENCY_EN[key][0] : currencies[key][0]);
const cUnit = (key) => (isEn() ? CURRENCY_EN[key][1] : currencies[key][1]);
let products = [];
let rates = null;
let currentView = "table";
let productsState = "loading"; // loading | ok | error
let ratesState = "loading";    // loading | live | cached | none

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

// فقط retailPriceToman از products.json خوانده می‌شود؛ صفر، خالی یا نامعتبر → null (توقف تولید)
function validRetail(value) {
  if (value === null || value === undefined || value === "" || typeof value === "boolean") return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// محصولی که قیمتش صفر / بدون قیمت است: «توقف تولید»
const isStopped = (product) => product.retailPriceToman == null;

function formatToman(value) {
  return value == null ? t("price_stopped") : `${fmt(value)} ${t("toman")}`;
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

function suggestedText(product, key) {
  if (isStopped(product)) return t("price_stopped");
  if (!key) return t("choose_currency_short");
  const suggestion = suggestedPrice(product, key);
  return suggestion == null ? t("price_unavailable") : `${fmt(suggestion)} ${cUnit(key)}`;
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
  if (!url) return `<div class="image-placeholder ${className}">${t("img_missing")}</div>`;
  return `<img class="${className}" src="${escapeHtml(url)}" alt="${escapeHtml(product.name)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'image-placeholder',textContent:t('img_unavailable')}))">`;
}

function fillCurrencySelect() {
  const select = $("#productCurrency");
  const current = select.value;
  while (select.options.length > 1) select.remove(1);
  Object.entries(currencies).forEach(([key, data]) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = `${data[2]}  ${cName(key)}`;
    select.appendChild(option);
  });
  select.value = current;
}

function renderTable() {
  const key = $("#productCurrency").value;
  $("#suggestedHeading").textContent = key
    ? `${t("th_suggested")} (${cUnit(key)})`
    : t("th_suggested");
  const list = visibleProducts();
  if (!list.length) {
    $("#productTableBody").innerHTML = `<tr><td colspan="5" class="empty-state">${t("no_results")}</td></tr>`;
    return;
  }
  $("#productTableBody").innerHTML = list.map(product => {
    const stoppedAttr = isStopped(product) ? ' class="stopped"' : "";
    const image = safeUrl(product.imageUrl);
    const imageCell = image
      ? `<a class="table-image-link" href="${escapeHtml(image)}" target="_blank" rel="noopener">${imageMarkup(product, "table-image")}<span>${t("view_image")}</span></a>`
      : `<span class="muted">${t("no_image_cell")}</span>`;
    return `<tr>
      <td class="product-name">${escapeHtml(product.name)}</td>
      <td${stoppedAttr}>${formatToman(representativePrice(product))}</td>
      <td${stoppedAttr}>${formatToman(product.retailPriceToman)}</td>
      <td class="suggested${isStopped(product) ? " stopped" : ""}">${suggestedText(product, key)}</td>
      <td>${imageCell}</td>
    </tr>`;
  }).join("");
}

function renderCards() {
  const key = $("#productCurrency").value;
  const list = visibleProducts();
  if (!list.length) {
    $("#cardsContainer").innerHTML = `<div class="card empty-state search-empty">${t("no_results")}</div>`;
    return;
  }
  $("#cardsContainer").innerHTML = list.map(product => {
    const off = isStopped(product) ? ' class="stopped"' : "";
    return `<article class="product-card card">
      ${imageMarkup(product, "product-card-image")}
      <h3>${escapeHtml(product.name)}</h3>
      <div class="product-card-prices">
        <div><small>${t("th_rep")}</small><b${off}>${formatToman(representativePrice(product))}</b></div>
        <div><small>${t("th_retail")}</small><b${off}>${formatToman(product.retailPriceToman)}</b></div>
        <div class="card-suggested"><small>${t("th_suggested")}</small><b${off}>${suggestedText(product, key)}</b></div>
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
    ? t("count_filtered", fmt(shown), fmt(products.length))
    : t("count_all", fmt(products.length));
  const key = $("#productCurrency").value;
  $("#productRate").textContent = key
    ? (getRate(key) ? t("rate_ok", cName(key)) : t("rate_missing"))
    : t("rate_choose");
  // دکمه دانلود PDF فقط بعد از انتخاب ارز نمایش داده می‌شود
  $("#downloadPdf").hidden = !key;
  $("#downloadPdf").disabled = !!key && !getRate(key);
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

function showProductsError() {
  $("#productCount").textContent = t("products_load_failed");
  $("#productTableBody").innerHTML = `<tr><td colspan="5" class="empty-state">${t("products_file_missing")}</td></tr>`;
}

/* ---------- خواندن لیست محصولات از فایل اکسل (products.xlsx) ----------
   اگر اکسل در دسترس نبود، فایل products.json جایگزین می‌شود. */
const XLSX_FILE = "products.xlsx";
const XLSX_LIB = "xlsx.mini.min.js?v=5";

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error("LIB"));
    document.head.appendChild(script);
  });
}

function excelPrice(cell) {
  if (!cell) return null;
  if (cell.t === "n") return cell.v;
  if (cell.t === "s") {
    const n = Number(normalizeDigits(cell.v).replace(/[,٬\s]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null; // خطای فرمول (#REF! و ...) → بدون قیمت
}

// ستون‌ها از روی عنوان‌ها پیدا می‌شوند: «نام محصول» و «قیمت مصرف‌کننده»؛
// عکس = لینک داخل ستون سمت راستِ ستون نام (کلمه «تصویر»)
function excelRows(workbook) {
  const has = (text, words) => words.every(word => normalizeText(text).includes(word));
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet || !sheet["!ref"]) continue;
    const range = XLSX.utils.decode_range(sheet["!ref"]);
    const cell = (r, c) => sheet[XLSX.utils.encode_cell({ r, c })];
    let headerRow = -1, nameCol = -1, retailCol = -1;
    for (let r = range.s.r; r <= Math.min(range.e.r, range.s.r + 9) && headerRow < 0; r++) {
      let nameAt = -1, retailAt = -1;
      for (let c = range.s.c; c <= range.e.c; c++) {
        const text = cell(r, c) ? String(cell(r, c).v ?? "") : "";
        if (nameAt < 0 && has(text, ["نام", "محصول"])) nameAt = c;
        if (retailAt < 0 && has(text, ["مصرف"])) retailAt = c;
      }
      if (nameAt >= 0 && retailAt >= 0) { headerRow = r; nameCol = nameAt; retailCol = retailAt; }
    }
    if (headerRow < 0) continue;
    const imageCol = nameCol > range.s.c ? nameCol - 1 : -1;
    const list = [];
    for (let r = headerRow + 1; r <= range.e.r; r++) {
      const nameCell = cell(r, nameCol);
      const name = nameCell ? String(nameCell.v ?? "").trim() : "";
      if (!name) continue;
      const linkCell = imageCol >= 0 ? cell(r, imageCol) : null;
      list.push({
        name,
        imageUrl: linkCell?.l?.Target || "",
        retailPriceToman: excelPrice(cell(r, retailCol))
      });
    }
    if (list.length) return list;
  }
  return [];
}

async function loadProductsRaw() {
  try {
    const [response] = await Promise.all([
      fetch(XLSX_FILE, { cache: "no-cache" }),
      typeof XLSX === "undefined" ? loadScript(XLSX_LIB) : null
    ]);
    if (!response.ok) throw new Error("XLSX");
    const workbook = XLSX.read(await response.arrayBuffer(), { type: "array" });
    const list = excelRows(workbook);
    if (list.length) return list;
  } catch (error) {
    console.warn("Excel unavailable, falling back to products.json", error);
  }
  const response = await fetch("products.json", { cache: "no-cache" });
  if (!response.ok) throw new Error("PRODUCTS");
  return response.json();
}

async function loadProducts() {
  try {
    const raw = await loadProductsRaw();
    // قیمت نماینده/پیشنهادی از فایل خوانده نمی‌شود؛ فقط name، imageUrl و retailPriceToman
    products = (Array.isArray(raw) ? raw : []).map(item => ({
      name: String(item?.name ?? ""),
      imageUrl: item?.imageUrl ?? "",
      retailPriceToman: validRetail(item?.retailPriceToman)
    }));
    productsState = "ok";
    render();
  } catch {
    productsState = "error";
    showProductsError();
  }
}

function renderStatus() {
  const dot = $("#status").previousElementSibling;
  const states = {
    loading: ["status_loading", null],
    live: ["status_live", "#69cf9a"],
    cached: ["status_cached", "#d9a75e"],
    none: ["status_none", "#d97878"]
  };
  const [key, color] = states[ratesState];
  $("#status").textContent = t(key);
  if (color) dot.style.background = color;
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
    ratesState = "live";
  } catch {
    if (cached.rates && typeof cached.rates === "object") {
      rates = cached.rates;
      ratesState = "cached";
    } else {
      ratesState = "none";
    }
  }
  renderStatus();
  render();
}

/* ---------- دانلود PDF ---------- */
function pdfDateText() {
  const now = new Date();
  const locale = isEn() ? "en-GB" : "fa-IR";
  const date = isEn()
    ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(now)
    : new Intl.DateTimeFormat(locale, { year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hour12: false }).format(now);
  return `${date} - ${time}`;
}

async function downloadPdf() {
  const key = $("#productCurrency").value;
  if (!key || !products.length || !getRate(key)) return;
  const button = $("#downloadPdf");
  const label = button.querySelector("span");
  button.disabled = true;
  label.textContent = t("download_busy");
  try {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    await window.PriceListPdf.download({
      rtl: !isEn(),
      siteName: t("brand_name"),
      title: t("pdf_title"),
      dateLabel: t("pdf_date"),
      dateText: pdfDateText(),
      currencyLabel: t("pdf_currency"),
      currencyText: `${cName(key)} (${cUnit(key)})`,
      headers: {
        name: t("th_name"),
        rep: t("th_rep"),
        retail: t("th_retail"),
        suggested: `${t("th_suggested")} (${cUnit(key)})`
      },
      rows: products.map(product => ({
        name: product.name,
        rep: formatToman(representativePrice(product)),
        retail: formatToman(product.retailPriceToman),
        suggested: suggestedText(product, key),
        stopped: isStopped(product)
      })),
      pageText: (page, total) => t("pdf_page", fmt(page), fmt(total)),
      pdfTitle: `${t("brand_name")} - ${t("pdf_title")}`,
      filename: `price-list-${CURRENCY_EN[key][1]}-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.pdf`
    });
  } catch (error) {
    console.error(error);
    alert(t("pdf_failed"));
  } finally {
    label.textContent = t("download_pdf");
    button.disabled = !getRate($("#productCurrency").value);
  }
}

// تغییر زبان: متن‌های پویا دوباره ساخته می‌شوند (متن‌های ثابت را i18n.js عوض می‌کند)
window.onLangChange = function () {
  fillCurrencySelect();
  renderStatus();
  if (productsState === "ok") render();
  else if (productsState === "error") showProductsError();
};

fillCurrencySelect();
$("#productCurrency").addEventListener("change", render);
$("#productSearch").addEventListener("input", render);
$("#tableView").addEventListener("click", () => setView("table"));
$("#cardView").addEventListener("click", () => setView("cards"));
$("#downloadPdf").addEventListener("click", downloadPdf);
loadProducts();
loadRates();
