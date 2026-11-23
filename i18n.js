/* دو زبانه (فارسی / انگلیسی) — مشترک بین index.html و products.html */
(function () {
  const STORAGE_KEY = "arzem_lang_v1";

  const DICT = {
    fa: {
      brand_name: "محاسبه‌گر کوپن",
      brand_aria: "صفحه اصلی",
      nav_calc: "محاسبه‌گر",
      nav_products: "لیست قیمت محصولات",
      lang_toggle: "EN",
      lang_toggle_aria: "تغییر زبان به انگلیسی",
      status_loading: "در حال دریافت نرخ...",
      status_live: "نرخ زنده",
      status_cached: "آخرین نرخ ذخیره‌شده",
      status_none: "نرخ در دسترس نیست",
      select_currency_first: "ابتدا ارز را انتخاب کنید",
      toman: "تومان",
      footer_updated: "آخرین بروزرسانی: {0}",

      title_index: "محاسبه‌گر کوپن",
      meta_index: "محاسبه‌گر کوپن؛ محاسبه مبلغ به تومان و کوپن دریافتی بر اساس نرخ زنده ارز",
      brand_sub_index: "محاسبه سریع و دقیق کوپن ارزی",
      hero_h1: "کوپن خودت را<br><em>سریع و دقیق</em> محاسبه کن.",
      hero_p: "ارز را انتخاب کن، مبلغ را وارد کن و جزئیات کوپن دریافتی را ببین.",
      kicker_input: "اطلاعات محاسبه",
      label_currency: "انتخاب ارز",
      label_amount: "مبلغ",
      amount_placeholder: "مثلاً ۱٬۰۰۰",
      calc_btn: "محاسبه کوپن",
      calc_arrow: "←",
      helper: "درصد کوپن بر اساس معادل تومانی مبلغ محاسبه می‌شود.",
      kicker_result: "نتیجه محاسبه",
      result_title: "خلاصه کوپن شما",
      res_toman: "مبلغ به تومان",
      res_coupon_toman: "میزان کوپن دریافتی به تومان",
      res_coupon_currency: "میزان کوپن به ارز انتخاب‌شده",
      msg_default: "برای مشاهده نتیجه، ارز و مبلغ را وارد کنید.",
      msg_choose_currency: "ابتدا ارز موردنظر را انتخاب کنید.",
      msg_rate_unavailable: "نرخ این ارز در حال حاضر در دسترس نیست.",
      msg_enter_amount: "مبلغ را وارد کنید و دکمه محاسبه را بزنید.",
      msg_percent: "درصد کوپن برای این محاسبه {0} درصد است.",
      msg_no_rates: "هنوز نرخی برای محاسبه دریافت یا ذخیره نشده است.",
      footer_rates_source: "نرخ ارز از منبع آنلاین دریافت می‌شود.",

      title_products: "لیست قیمت محصولات | محاسبه‌گر کوپن",
      meta_products: "لیست قیمت محصولات با امکان مشاهده قیمت پیشنهادی فروش به ارز انتخابی",
      brand_sub_products: "فهرست و قیمت محصولات",
      products_h1: "لیست قیمت <em>محصولات</em>",
      products_hero_p: "قیمت پیشنهادی فروش با توجه به ارز انتخاب‌شده و نرخ روز محاسبه می‌شود.",
      label_show_currency: "نمایش قیمت پیشنهادی به ارز",
      view_group_aria: "نحوه نمایش محصولات",
      view_table: "نمایش جدولی",
      view_cards: "نمایش کارتی",
      download_pdf: "دانلود PDF",
      download_busy: "در حال ساخت PDF...",
      pdf_failed: "ساخت PDF ناموفق بود. لطفاً دوباره تلاش کنید.",
      search_label: "جستجو در محصولات",
      search_placeholder: "نام محصول یا قیمت را وارد کنید...",
      search_aria: "جستجوی محصول یا قیمت",
      count_loading: "در حال بارگذاری محصولات...",
      rate_hint_initial: "قیمت پیشنهادی پس از دریافت نرخ نمایش داده می‌شود.",
      th_name: "نام محصول",
      th_rep: "قیمت نماینده در ایران",
      th_retail: "قیمت مصرف‌کننده در ایران",
      th_suggested: "قیمت پیشنهادی فروش",
      th_image: "تصویر محصول",
      loading_row: "در حال بارگذاری...",
      footer_products: "قیمت نماینده و قیمت پیشنهادی بر اساس قیمت مصرف‌کننده و نرخ روز محاسبه می‌شوند.",
      back_calc: "بازگشت به محاسبه‌گر",
      count_all: "{0} محصول در فهرست",
      count_filtered: "{0} محصول از {1} محصول",
      rate_ok: "نرخ {0} دریافت شد؛ قیمت‌های پیشنهادی محاسبه شده‌اند.",
      rate_missing: "نرخ ارز انتخاب‌شده در دسترس نیست.",
      rate_choose: "برای محاسبه قیمت پیشنهادی، ارز را انتخاب کنید.",
      no_results: "محصولی پیدا نشد",
      price_stopped: "توقف تولید",
      price_unavailable: "قیمت ناموجود",
      choose_currency_short: "ارز را انتخاب کنید",
      view_image: "مشاهده تصویر",
      no_image_cell: "ندارد",
      img_missing: "تصویر موجود نیست",
      img_unavailable: "تصویر در دسترس نیست",
      products_load_failed: "بارگذاری فهرست محصولات ناموفق بود.",
      products_file_missing: "فایل فهرست محصولات پیدا نشد.",

      pdf_title: "لیست قیمت محصولات",
      pdf_date: "تاریخ",
      pdf_currency: "ارز قیمت پیشنهادی",
      pdf_page: "صفحه {0} از {1}"
    },
    en: {
      brand_name: "Coupon Calculator",
      brand_aria: "Home",
      nav_calc: "Calculator",
      nav_products: "Product Price List",
      lang_toggle: "فارسی",
      lang_toggle_aria: "Switch language to Persian",
      status_loading: "Fetching rates...",
      status_live: "Live rate",
      status_cached: "Last saved rate",
      status_none: "Rate unavailable",
      select_currency_first: "Select a currency first",
      toman: "Toman",
      footer_updated: "Last updated: {0}",

      title_index: "Coupon Calculator",
      meta_index: "Coupon Calculator: calculate the Toman amount and the coupon you receive based on live exchange rates",
      brand_sub_index: "Fast and accurate currency coupon calculation",
      hero_h1: "Calculate your coupon<br><em>fast and accurately</em>.",
      hero_p: "Choose a currency, enter an amount and see your coupon details.",
      kicker_input: "Calculation details",
      label_currency: "Select currency",
      label_amount: "Amount",
      amount_placeholder: "e.g. 1,000",
      calc_btn: "Calculate coupon",
      calc_arrow: "→",
      helper: "The coupon percentage is based on the amount's Toman equivalent.",
      kicker_result: "Result",
      result_title: "Your coupon summary",
      res_toman: "Amount in Toman",
      res_coupon_toman: "Coupon received in Toman",
      res_coupon_currency: "Coupon in the selected currency",
      msg_default: "Enter a currency and an amount to see the result.",
      msg_choose_currency: "Please select a currency first.",
      msg_rate_unavailable: "The rate for this currency is currently unavailable.",
      msg_enter_amount: "Enter an amount and press Calculate.",
      msg_percent: "The coupon percentage for this calculation is {0}%.",
      msg_no_rates: "No rate has been fetched or saved yet.",
      footer_rates_source: "Exchange rates are fetched from an online source.",

      title_products: "Product Price List | Coupon Calculator",
      meta_products: "Product price list with the suggested selling price in your chosen currency",
      brand_sub_products: "Product list & prices",
      products_h1: "Product <em>Price List</em>",
      products_hero_p: "The suggested selling price is calculated from the selected currency and today's rate.",
      label_show_currency: "Show suggested price in currency",
      view_group_aria: "Product display mode",
      view_table: "Table view",
      view_cards: "Card view",
      download_pdf: "Download PDF",
      download_busy: "Building PDF...",
      pdf_failed: "Could not build the PDF. Please try again.",
      search_label: "Search products",
      search_placeholder: "Enter a product name or price...",
      search_aria: "Search by product name or price",
      count_loading: "Loading products...",
      rate_hint_initial: "The suggested price appears once the rate is fetched.",
      th_name: "Product name",
      th_rep: "Representative price in Iran",
      th_retail: "Consumer price in Iran",
      th_suggested: "Suggested selling price",
      th_image: "Product image",
      loading_row: "Loading...",
      footer_products: "Representative and suggested prices are calculated from the consumer price and today's rate.",
      back_calc: "Back to calculator",
      count_all: "{0} products listed",
      count_filtered: "{0} of {1} products",
      rate_ok: "{0} rate fetched; suggested prices have been calculated.",
      rate_missing: "The selected currency's rate is unavailable.",
      rate_choose: "Select a currency to calculate the suggested price.",
      no_results: "No products found",
      price_stopped: "Discontinued",
      price_unavailable: "Price unavailable",
      choose_currency_short: "Select a currency",
      view_image: "View image",
      no_image_cell: "None",
      img_missing: "No image available",
      img_unavailable: "Image unavailable",
      products_load_failed: "Failed to load the product list.",
      products_file_missing: "Product list file not found.",

      pdf_title: "Product Price List",
      pdf_date: "Date",
      pdf_currency: "Suggested price currency",
      pdf_page: "Page {0} of {1}"
    }
  };

  // نام و واحد ارزها به انگلیسی (فارسی در script.js / products.js است)
  window.CURRENCY_EN = {
    dollar: ["US Dollar", "USD"], euro: ["Euro", "EUR"], yuan: ["Chinese Yuan", "CNY"],
    aed: ["UAE Dirham", "AED"], lira: ["Turkish Lira", "TRY"], pound: ["British Pound", "GBP"],
    afn: ["Afghan Afghani", "AFN"], rub: ["Russian Ruble", "RUB"], inr: ["Indian Rupee", "INR"],
    sar: ["Saudi Riyal", "SAR"], qar: ["Qatari Riyal", "QAR"], kwd: ["Kuwaiti Dinar", "KWD"],
    omr: ["Omani Rial", "OMR"], iqd: ["Iraqi Dinar", "IQD"], chf: ["Swiss Franc", "CHF"],
    cad: ["Canadian Dollar", "CAD"], aud: ["Australian Dollar", "AUD"], tether: ["Tether", "USDT"]
  };

  let lang = "fa";
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "fa") lang = saved;
  } catch {}

  window.getLang = () => lang;
  window.isEn = () => lang === "en";
  window.numLocale = () => (lang === "en" ? "en-US" : "fa-IR");

  window.t = function (key, ...args) {
    let text = DICT[lang][key] ?? DICT.fa[key] ?? key;
    args.forEach((value, index) => { text = text.split(`{${index}}`).join(value); });
    return text;
  };

  function applyI18n() {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = lang === "en" ? "ltr" : "rtl";
    document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = window.t(el.dataset.i18n); });
    document.querySelectorAll("[data-i18n-html]").forEach(el => { el.innerHTML = window.t(el.dataset.i18nHtml); });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(el => { el.placeholder = window.t(el.dataset.i18nPlaceholder); });
    document.querySelectorAll("[data-i18n-aria]").forEach(el => { el.setAttribute("aria-label", window.t(el.dataset.i18nAria)); });
    document.querySelectorAll("[data-i18n-content]").forEach(el => { el.setAttribute("content", window.t(el.dataset.i18nContent)); });
  }

  window.setLang = function (next) {
    if (next !== "fa" && next !== "en") return;
    lang = next;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
    applyI18n();
    if (typeof window.onLangChange === "function") window.onLangChange();
  };

  applyI18n();
  const toggle = document.getElementById("langToggle");
  if (toggle) toggle.addEventListener("click", () => window.setLang(lang === "fa" ? "en" : "fa"));
})();
