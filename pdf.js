/* ساخت PDF لیست قیمت در مرورگر — بدون کتابخانه خارجی.
   هر صفحه روی canvas کشیده می‌شود (تا شکل‌گیری حروف فارسی توسط خود مرورگر انجام شود)
   و سپس به‌صورت JPEG داخل یک فایل PDF بسته‌بندی می‌شود. */
(function () {
  const PAGE_W = 794, PAGE_H = 1123;      // A4 در 96dpi
  const PT_W = 595.28, PT_H = 841.89;     // A4 به پوینت
  const SCALE = 2;                        // کیفیت (≈ 190dpi)
  const MARGIN = 30;
  const FONT = '"Vazirmatn", Tahoma, "Segoe UI", Arial, sans-serif';
  const COLS = [["name", 286], ["rep", 142], ["retail", 142], ["suggested", 164]];
  const LINE_H = 17, ROW_PAD = 8, HEAD_PAD = 10, TOP = 104, BOTTOM = PAGE_H - 52;

  const hasArabic = (text) => /[\u0600-\u06FF]/.test(text);

  async function ensureFonts() {
    if (!document.fonts || !document.fonts.load) return;
    try {
      const sample = "محاسبه‌گر کوپن Aa 0123 ۰۱۲۳";
      await Promise.all(["500", "700", "800"].map(w => document.fonts.load(`${w} 14px Vazirmatn`, sample)));
    } catch {}
  }

  function setFont(ctx, weight, size, text) {
    ctx.font = `${weight} ${size}px ${FONT}`;
    ctx.direction = hasArabic(text) ? "rtl" : "ltr";
  }

  function wrapText(ctx, text, maxWidth, weight, size) {
    const words = String(text).split(/\s+/).filter(Boolean);
    const lines = [];
    let line = "";
    const width = (value) => { setFont(ctx, weight, size, value); return ctx.measureText(value).width; };
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (width(test) <= maxWidth) { line = test; continue; }
      if (line) { lines.push(line); line = ""; }
      if (width(word) <= maxWidth) { line = word; continue; }
      let chunk = "";                        // کلمه‌ی خیلی بلند: شکستن حرف‌به‌حرف
      for (const ch of word) {
        if (width(chunk + ch) > maxWidth && chunk) { lines.push(chunk); chunk = ch; } else chunk += ch;
      }
      line = chunk;
    }
    if (line) lines.push(line);
    return lines.length ? lines : [""];
  }

  function columnBox(index, rtl) {
    const before = COLS.slice(0, index).reduce((sum, c) => sum + c[1], 0);
    const width = COLS[index][1];
    return rtl
      ? { left: PAGE_W - MARGIN - before - width, width }
      : { left: MARGIN + before, width };
  }

  function drawText(ctx, text, weight, size, color, x, y, align) {
    setFont(ctx, weight, size, text);
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y);
  }

  function drawPageFrame(ctx, o, pageNo, total) {
    const rtl = o.rtl;
    const startX = rtl ? PAGE_W - MARGIN : MARGIN;
    const endX = rtl ? MARGIN : PAGE_W - MARGIN;
    const startAlign = rtl ? "right" : "left";
    const endAlign = rtl ? "left" : "right";

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, PAGE_W, PAGE_H);

    drawText(ctx, o.siteName, 800, 21, "#1d1a2b", startX, 46, startAlign);
    drawText(ctx, o.title, 600, 13, "#5b5670", startX, 72, startAlign);
    drawText(ctx, `${o.dateLabel}: ${o.dateText}`, 600, 12, "#2b2838", endX, 46, endAlign);
    drawText(ctx, `${o.currencyLabel}: ${o.currencyText}`, 500, 11.5, "#5b5670", endX, 72, endAlign);

    const grad = ctx.createLinearGradient(MARGIN, 0, PAGE_W - MARGIN, 0);
    grad.addColorStop(0, "#6a2de0");
    grad.addColorStop(1, "#d6b36a");
    ctx.fillStyle = grad;
    ctx.fillRect(MARGIN, 86, PAGE_W - 2 * MARGIN, 2.5);

    drawText(ctx, o.pageText(pageNo, total), 500, 10.5, "#8a8698", PAGE_W / 2, PAGE_H - 28, "center");
  }

  function drawCells(ctx, o, cells, top, height, opts) {
    const rtl = o.rtl;
    COLS.forEach(([key], index) => {
      const box = columnBox(index, rtl);
      const lines = cells[key];
      const x = rtl ? box.left + box.width - 9 : box.left + 9;
      const startY = top + (height - lines.length * LINE_H) / 2 + LINE_H / 2;
      lines.forEach((line, i) => {
        const stopped = opts.stopped && key !== "name";
        const color = stopped ? "#c0392b" : (opts.color?.[key] || opts.defaultColor);
        const weight = stopped ? 800 : (opts.weight?.[key] || opts.defaultWeight);
        drawText(ctx, line, weight, opts.size, color, x, startY + i * LINE_H, rtl ? "right" : "left");
      });
    });
  }

  async function renderPages(o) {
    const canvas = document.createElement("canvas");
    canvas.width = PAGE_W * SCALE;
    canvas.height = PAGE_H * SCALE;
    const ctx = canvas.getContext("2d");

    // اندازه‌گیری: خط‌های هر سلول و ارتفاع هر ردیف
    const headerCells = {};
    COLS.forEach(([key], i) => { headerCells[key] = wrapText(ctx, o.headers[key], columnBox(i, o.rtl).width - 18, 800, 11.5); });
    const headerH = Math.max(...Object.values(headerCells).map(l => l.length)) * LINE_H + 2 * HEAD_PAD;

    const rows = o.rows.map(row => {
      const cells = {};
      COLS.forEach(([key], i) => { cells[key] = wrapText(ctx, row[key], columnBox(i, o.rtl).width - 18, key === "name" ? 500 : 600, 11.5); });
      const h = Math.max(32, Math.max(...Object.values(cells).map(l => l.length)) * LINE_H + 2 * ROW_PAD);
      return { cells, h, stopped: !!row.stopped };
    });

    // تقسیم به صفحه‌ها (متعادل، تا ردیف تنها در صفحه آخر نیفتد)
    const capacity = BOTTOM - TOP - headerH;
    const split = (limit) => {
      const result = [];
      let current = [], used = 0;
      rows.forEach(row => {
        if (current.length && used + row.h > limit) { result.push(current); current = []; used = 0; }
        current.push(row);
        used += row.h;
      });
      if (current.length || !result.length) result.push(current);
      return result;
    };
    const minPages = split(capacity).length;
    const totalH = rows.reduce((sum, row) => sum + row.h, 0);
    let pages = split(capacity);
    for (let limit = Math.ceil(totalH / minPages); limit <= capacity; limit++) {
      const attempt = split(limit);
      if (attempt.length <= minPages) { pages = attempt; break; }
    }

    const out = [];
    for (let p = 0; p < pages.length; p++) {
      ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
      drawPageFrame(ctx, o, p + 1, pages.length);

      ctx.fillStyle = "#efe9fb";
      ctx.fillRect(MARGIN, TOP, PAGE_W - 2 * MARGIN, headerH);
      drawCells(ctx, o, headerCells, TOP, headerH, { size: 11.5, defaultColor: "#3b1d8f", defaultWeight: 800 });

      let y = TOP + headerH;
      pages[p].forEach((row, i) => {
        if (i % 2 === 1) { ctx.fillStyle = "#f8f6fd"; ctx.fillRect(MARGIN, y, PAGE_W - 2 * MARGIN, row.h); }
        drawCells(ctx, o, row.cells, y, row.h, {
          size: 11.5, stopped: row.stopped, defaultColor: "#22202e", defaultWeight: 500,
          color: { suggested: "#4c1fb8" }, weight: { rep: 600, retail: 600, suggested: 700 }
        });
        y += row.h;
        ctx.fillStyle = "#e7e3f1";
        ctx.fillRect(MARGIN, y - 1, PAGE_W - 2 * MARGIN, 1);
      });

      const blob = await new Promise((resolve, reject) =>
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error("JPEG"))), "image/jpeg", 0.92));
      out.push({ bytes: new Uint8Array(await blob.arrayBuffer()), w: canvas.width, h: canvas.height });
    }
    return out;
  }

  /* ---------- نوشتن ساختار PDF ---------- */
  function utf16Hex(text) {
    let hex = "FEFF";
    for (let i = 0; i < text.length; i++) hex += text.charCodeAt(i).toString(16).padStart(4, "0");
    return hex.toUpperCase();
  }

  function buildPdf(pages, title) {
    const enc = new TextEncoder();
    const chunks = [];
    const offsets = [];
    let offset = 0;
    const push = (data) => {
      const bytes = typeof data === "string" ? enc.encode(data) : data;
      chunks.push(bytes);
      offset += bytes.length;
    };
    const begin = (id) => { offsets[id] = offset; };

    const n = pages.length;
    const infoId = 3 + n * 3;
    const total = infoId;
    const kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(" ");
    const now = new Date();
    const pad = (v) => String(v).padStart(2, "0");
    const created = `D:${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

    push("%PDF-1.4\n");
    push(new Uint8Array([0x25, 0xE2, 0xE3, 0xCF, 0xD3, 0x0A]));
    begin(1); push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
    begin(2); push(`2 0 obj\n<< /Type /Pages /Count ${n} /Kids [${kids}] >>\nendobj\n`);

    pages.forEach((page, i) => {
      const pageId = 3 + i * 3, contentId = pageId + 1, imageId = pageId + 2;
      const content = `q ${PT_W} 0 0 ${PT_H} 0 0 cm /Im${i} Do Q`;
      begin(pageId);
      push(`${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PT_W} ${PT_H}] /Resources << /XObject << /Im${i} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`);
      begin(contentId);
      push(`${contentId} 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`);
      begin(imageId);
      push(`${imageId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${page.w} /Height ${page.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.bytes.length} >>\nstream\n`);
      push(page.bytes);
      push("\nendstream\nendobj\n");
    });

    begin(infoId);
    push(`${infoId} 0 obj\n<< /Title <${utf16Hex(title)}> /Producer (Coupon Calculator) /CreationDate (${created}) >>\nendobj\n`);

    const xrefAt = offset;
    let xref = `xref\n0 ${total + 1}\n0000000000 65535 f \n`;
    for (let id = 1; id <= total; id++) xref += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
    push(xref);
    push(`trailer\n<< /Size ${total + 1} /Root 1 0 R /Info ${infoId} 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`);
    return new Blob(chunks, { type: "application/pdf" });
  }

  function saveBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    setTimeout(() => { link.remove(); URL.revokeObjectURL(url); }, 4000);
  }

  window.PriceListPdf = {
    async download(options) {
      await ensureFonts();
      const pages = await renderPages(options);
      saveBlob(buildPdf(pages, options.pdfTitle), options.filename);
    }
  };
})();
