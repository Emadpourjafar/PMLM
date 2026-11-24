firebase.initializeApp(window.FB_CONFIG);
const db = firebase.firestore();
const COL = db.collection('tournaments');
const TYPES = {
  sales:   { label: 'روز فروش',  col: 'میزان فروش',          sum: 'مجموع فروش' },
  present: { label: 'روز پرزنت', col: 'تعداد پرزنت ست‌شده', sum: 'مجموع پرزنت ست‌شده' }
};
const MEDAL = { 1: ['🥇', 'طلا', 'gold'], 2: ['🥈', 'نقره', 'silver'], 3: ['🥉', 'برنز', 'bronze'] };
const nf = n => Number(n || 0).toLocaleString('fa-IR');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const total = rows => rows.reduce((a, x) => a + (+x.value || 0), 0);

// مرتب‌سازی نزولی؛ امتیاز برابر = رتبه‌ی برابر
function ranked(rows) {
  const s = [...(rows || [])].sort((a, b) => b.value - a.value);
  let r = 0;
  return s.map((x, i) => { if (i === 0 || x.value !== s[i - 1].value) r = i + 1; return { ...x, rank: r }; });
}
function rankCell(r) {
  const m = MEDAL[r];
  return m ? `<span class="medal ${m[2]}">${m[0]} ${m[1]}</span>` : nf(r);
}
// act: تابعی که HTML ستون عملیات را می‌دهد (برای مدیر)؛ بدون آن جدول فقط‌خواندنی است
function tableHTML(t, act) {
  const T = TYPES[t.type], rows = ranked(t.rows);
  if (!rows.length) return '<p class="empty">هنوز رکوردی ثبت نشده است.</p>';
  return `<table><thead><tr><th>رتبه</th><th>نام و نام‌خانوادگی</th><th>شهر</th><th>${T.col}</th>${act ? '<th class="noprint">عملیات</th>' : ''}</tr></thead><tbody>` +
    rows.map(r => `<tr class="${MEDAL[r.rank] ? 'top ' + MEDAL[r.rank][2] : ''}"><td>${rankCell(r.rank)}</td><td>${esc(r.name)}</td><td>${esc(r.city)}</td><td class="num">${act ? act(r) : nf(r.value)}</td>${act ? `<td class="noprint">${act(r, true)}</td>` : ''}</tr>`).join('') +
    `</tbody><tfoot><tr><td colspan="3">${T.sum}</td><td class="num">${nf(total(t.rows))}</td>${act ? '<td class="noprint"></td>' : ''}</tr></tfoot></table>`;
}
