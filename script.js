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
  dollar: ["دلار آمریکا", "دلار", "$"],
  euro: ["یورو", "یورو", "€"],
  yuan: ["یوان چین", "یوان", "¥"],
  aed: ["درهم امارات", "درهم", "AED"],
  lira: ["لیر ترکیه", "لیر", "₺"],
  pound: ["پوند انگلیس", "پوند", "£"],
  afn: ["افغانی", "افغانی", "AFN"],
  rub: ["روبل روسیه", "روبل", "RUB"],
  inr: ["روپیه هند", "روپیه", "INR"],
  sar: ["ریال سعودی", "ریال", "SAR"],
  qar: ["ریال قطر", "ریال", "QAR"],
  kwd: ["دینار کویت", "دینار", "KWD"],
  omr: ["ریال عمان", "ریال", "OMR"],
  iqd: ["دینار عراق", "دینار", "IQD"],
  chf: ["فرانک سوئیس", "فرانک", "CHF"],
  cad: ["دلار کانادا", "دلار کانادا", "C$"],
  aud: ["دلار استرالیا", "دلار استرالیا", "A$"],
  tether: ["تتر", "تتر", "USDT"]
};

const $ = (selector) => document.querySelector(selector);
const fmt = (n) => new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 }).format(n);

function parseNumber(value) {
  const persian = "۰۱۲۳۴۵۶۷۸۹";
  const arabic = "٠١٢٣٤٥٦٧٨٩";
  let normalized = String(value ?? "");
  normalized = normalized.replace(/[۰-۹]/g, d => String(persian.indexOf(d)));
  normalized = normalized.replace(/[٠-٩]/g, d => String(arabic.indexOf(d)));
  normalized = normalized.replace(/[,\s٬]/g, "").replace(/٫/g, ".");
  normalized = normalized.replace(/[^\d.]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function fillCurrencySelect(select) {
  Object.entries(currencies).forEach(([key, data]) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = `${data[2]}  ${data[0]}`;
    select.appendChild(option);
  });
}

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

function setRateStatus(online, meta) {
  $("#status").textContent = online ? "نرخ زنده" : "آخرین نرخ ذخیره‌شده";
  const dot = $("#status").previousElementSibling;
  dot.style.background = online ? "#69cf9a" : "#d9a75e";
  dot.style.boxShadow = online ? "0 0 10px #69cf9a" : "0 0 10px #d9a75e";
  if (meta?.date && meta?.time) {
    $("#updated").textContent = `آخرین بروزرسانی: ${meta.date} - ${meta.time}`;
  }
}

function applyRates(rates, meta, online) {
  window.couponRates = rates;
  setRateStatus(online, meta);
  calculate();
}

function getRate(key) {
  const raw = window.couponRates?.[key];
  const rate = Number(String(raw ?? "").replace(/[,\s٬]/g, "").replace(/٫/g, "."));
  return Number.isFinite(rate) && rate > 0 ? rate : 0;
}

function percentFor(toman) {
  if (toman < 3000000) return 5;
  if (toman < 10000000) return 10;
  if (toman < 20000000) return 20;
  return 30;
}

function clearResults(message) {
  $("#percent").textContent = "—";
  $("#tomans").textContent = "—";
  $("#couponToman").textContent = "—";
  $("#couponCurrency").textContent = "—";
  $("#couponUnit").textContent = "—";
  $("#resultMessage").textContent = message;
}

function calculate() {
  const key = $("#currency").value;
  const amount = parseNumber($("#amount").value);

  if (!key) {
    clearResults("ابتدا ارز موردنظر را انتخاب کنید.");
    return;
  }
  $("#unit").textContent = currencies[key][1];
  $("#couponUnit").textContent = currencies[key][1];

  const rate = getRate(key);
  if (!rate) {
    clearResults("نرخ این ارز در حال حاضر در دسترس نیست.");
    return;
  }
  if (!amount) {
    clearResults("مبلغ را وارد کنید و دکمه محاسبه را بزنید.");
    return;
  }

  const tomanValue = amount * rate;
  const percent = percentFor(tomanValue);
  const couponToman = tomanValue * percent / 100;
  const couponCurrency = couponToman / rate;

  $("#percent").textContent = `${fmt(percent)}٪`;
  $("#tomans").textContent = `${fmt(tomanValue)} تومان`;
  $("#couponToman").textContent = `${fmt(couponToman)} تومان`;
  $("#couponCurrency").textContent = fmt(couponCurrency);
  $("#couponUnit").textContent = currencies[key][1];
  $("#resultMessage").textContent = `درصد کوپن برای این محاسبه ${fmt(percent)} درصد است.`;
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

    try {
      localStorage.setItem(CACHE, JSON.stringify(parsed.rates));
      localStorage.setItem(META, JSON.stringify(parsed.meta));
    } catch {}
    applyRates(parsed.rates, parsed.meta, true);
  } catch {
    if (cached.rates && typeof cached.rates === "object") {
      applyRates(cached.rates, cached.meta, false);
    } else {
      $("#status").textContent = "نرخ در دسترس نیست";
      $("#status").previousElementSibling.style.background = "#d97878";
      $("#updated").textContent = "—";
      clearResults("هنوز نرخی برای محاسبه دریافت یا ذخیره نشده است.");
    }
  }
}

fillCurrencySelect($("#currency"));
$("#currency").addEventListener("change", calculate);
$("#amount").addEventListener("input", calculate);
$("#calc").addEventListener("click", calculate);
loadRates();
