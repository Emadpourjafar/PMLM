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
// ---- جستجو ----
// یکسان‌سازی متن: ی/ک عربی و فارسی، اعداد فارسی/عربی، نیم‌فاصله، اعراب و حروف بزرگ/کوچک
const normQ = s => String(s ?? '').toLowerCase()
  .replace(/[\u064A\u0649]/g, '\u06CC').replace(/\u0643/g, '\u06A9')
  .replace(/[\u06F0-\u06F9]/g, d => d.charCodeAt(0) - 0x06F0).replace(/[\u0660-\u0669]/g, d => d.charCodeAt(0) - 0x0660)
  .replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/[\u200C\u200D]/g, ' ').replace(/\s+/g, ' ').trim();
// همه‌ی کلمه‌های جستجو باید در «نام» یا «شهر» باشند (ترتیب مهم نیست)
function matchRow(r, q) {
  const w = normQ(q).split(' ').filter(Boolean); if (!w.length) return true;
  const hay = normQ((r.name || '') + ' ' + (r.city || ''));
  return w.every(x => hay.includes(x));
}
// act: تابعی که HTML ستون عملیات را می‌دهد (برای مدیر)؛ بدون آن جدول فقط‌خواندنی است
// q: عبارت جستجو (اختیاری)؛ رتبه‌ها همیشه از کل لیست محاسبه می‌شوند، نه فقط نتایج
function tableHTML(t, act, q) {
  const T = TYPES[t.type], all = ranked(t.rows);
  if (!all.length) return '<p class="empty">هنوز رکوردی ثبت نشده است.</p>';
  const rows = normQ(q) ? all.filter(r => matchRow(r, q)) : all;
  if (!rows.length) return `<p class="empty">رکوردی با «${esc(q)}» پیدا نشد.</p>`;
  return `<table><thead><tr><th>رتبه</th><th>نام و نام‌خانوادگی</th><th>شهر</th><th>${T.col}</th>${act ? '<th class="noprint">عملیات</th>' : ''}</tr></thead><tbody>` +
    rows.map(r => `<tr class="${MEDAL[r.rank] ? 'top ' + MEDAL[r.rank][2] : ''}"><td>${rankCell(r.rank)}</td><td>${esc(r.name)}</td><td>${esc(r.city)}</td><td class="num">${act ? act(r) : nf(r.value)}</td>${act ? `<td class="noprint">${act(r, true)}</td>` : ''}</tr>`).join('') +
    `</tbody><tfoot><tr><td colspan="3">${T.sum}${rows.length !== all.length ? ' (همه‌ی رکوردها)' : ''}</td><td class="num">${nf(total(t.rows))}</td>${act ? '<td class="noprint"></td>' : ''}</tr></tfoot></table>`;
}

// ---- تایمر ----
let SKEW = 0;
const now = () => Date.now() + SKEW;
const faD = s => String(s).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
function fmtT(ms, html) {
  const s = Math.max(0, Math.ceil(ms / 1000)), p = n => String(n).padStart(2, '0');
  const d = Math.floor(s / 86400), r = s % 86400, h = Math.floor(r / 3600);
  const hms = faD((d ? p(h) : h) + ':' + p(Math.floor(r % 3600 / 60)) + ':' + p(s % 60));
  if (!d) return hms;
  // html=true: برای صفحه‌ی کلاینت؛ حروف فارسی «روز» نباید letter-spacing بگیرند وگرنه از هم جدا می‌شوند
  return (html ? `<span style="letter-spacing:0">${faD(d)} روز</span> · ` : faD(d) + ' روز · ') + hms;
  
}
const isEnded = t => !!t.endsAt && now() >= t.endsAt;

// همگام‌سازی ساعت با سرور (هدر Date همان سایت)، تا مدیر و کلاینت دقیقاً یک زمان ببینند
function skewFrom(res, t0, t1) {
  const d = res.headers.get('Date'); if (!d) return null;
  return new Date(d).getTime() + 500 + (+res.headers.get('Age') || 0) * 1000 + (t1 - t0) / 2 - t1;
}
async function syncClock(url) {
  try {
    const t0 = Date.now(), r = await fetch(url + '?t=' + t0, { method: 'HEAD', cache: 'no-store' }), s = skewFrom(r, t0, Date.now());
    if (s !== null) SKEW = s;
  } catch (e) {}
}

// ---- تم‌های صفحه‌ی کلاینت (فقط نورهای پس‌زمینه عوض می‌شود) ----
const THEMES = [
  { id: 'violet',   name: 'بنفش و آبی',   g1: '#4c1d95', g2: '#1e40af', bg: '#0b1020' },
  { id: 'ocean',    name: 'اقیانوس',      g1: '#0e7490', g2: '#1e3a8a', bg: '#06131d' },
  { id: 'emerald',  name: 'زمرد',         g1: '#047857', g2: '#0f766e', bg: '#07140f' },
  { id: 'sunset',   name: 'غروب',         g1: '#7c2d12', g2: '#9d174d', bg: '#170b0f' },
  { id: 'ruby',     name: 'یاقوت',        g1: '#7f1d1d', g2: '#450a0a', bg: '#120808' },
  { id: 'rose',     name: 'صورتی شب',     g1: '#831843', g2: '#6d28d9', bg: '#150a17' },
  { id: 'amber',    name: 'کهربایی',      g1: '#92400e', g2: '#854d0e', bg: '#130e08' },
  { id: 'aurora',   name: 'شفق قطبی',     g1: '#0f766e', g2: '#4338ca', bg: '#07121a' },
  { id: 'midnight', name: 'نیمه‌شب',      g1: '#1d4ed8', g2: '#312e81', bg: '#070c1d' },
  { id: 'graphite', name: 'خاکستری نقره‌ای', g1: '#475569', g2: '#334155', bg: '#0c1017' }
];

// ---- تورنومنت جایزه‌دار ----
const ORD = ['اول', 'دوم', 'سوم', 'چهارم', 'پنجم', 'ششم', 'هفتم', 'هشتم', 'نهم', 'دهم'];
const ordFa = n => n <= 10 ? ORD[n - 1] : nf(n) + 'ام';
const pUnit = type => type === 'sales' ? 'تومان فروش' : 'پرزنت';
const valText = (type, v) => type === 'sales' ? nf(v) + ' تومان' : nf(v) + ' پرزنت';
const prizeRule = t => `هر ${nf(t.prize.per)} ${pUnit(t.type)} = ${nf(t.prize.ch)} شانس · ${nf(t.prize.count)} برنده`;
// افراد دارای حداقل یک شانس، به ترتیب رتبه
const eligible = t => ranked(t.rows).map(r => ({ ...r, ch: Math.floor(r.value / t.prize.per) * t.prize.ch })).filter(r => r.ch > 0);
// باکس «برنده‌ها» (برای صفحه‌ی مدیر، کلاینت و PDF)
function winnersHTML(t) {
  if (!t.prize) return '';
  const w = t.winners || [], K = t.prize.count;
  const body = !w.length
    ? '<div class="wq">🤔 به‌نظرت کی برنده می‌شه؟</div>'
    : w.map((x, i) => `<div class="wit"><span class="wo">برنده‌ی ${ordFa(i + 1)}</span><div class="wm"><div class="wn">🏆 ${esc(x.name)}</div><small>📍 ${esc(x.city)} · 🍀 ${nf(x.ch)} شانس · ${t.type === 'sales' ? '💰' : '🎯'} ${valText(t.type, x.value)}</small></div></div>`).join('')
      + (w.length < K ? '<div class="wmore">قرعه‌کشی ادامه دارد…</div>' : '');
  return `<div class="wbx"><div class="wh">🏆 برنده‌ها</div><div class="wrule">${prizeRule(t)}</div>${body}</div>`;
}
