/* ============================================================
   데일리 리포트 탭 (SB/SP 광고 성과 확장 리포트 추가 모듈)
   - index.html 맨 아래(</body> 바로 위)에 <script src="/daily-report.js"></script> 한 줄만 추가하면 동작한다.
   - 주간 리포트와 저장소가 완전히 분리되어 있다: /daily-data, /daily-upload, /daily-reset (D1 테이블 daily_ad_days)
   - 기존 페이지의 XLSX(SheetJS), 업로드 비밀번호 입력창을 그대로 재사용한다.
   - 날짜는 Amazon Ads 리포트 그대로 PST(미국 태평양 시간) 기준.
   ============================================================ */
(function () {
  'use strict';
  if (window.__dailyReportLoaded) return;
  window.__dailyReportLoaded = true;

  const API = { get: '/daily-data?days=120', upload: '/daily-upload', reset: '/daily-reset' };
  const TARGET_ROAS = 1.5;   // 권장 입찰가·ROAS 색 기준
  const TOP_N = 30;          // 일자별 표에 보여줄 키워드/검색어 수
  const GRID_DAYS = 14;      // 일자별 표에 보여줄 날짜 수
  const WINDOW = 7;          // "최근 7일" 집계 기간
  const CHART_DAYS = 30;     // 일별 차트 날짜 수
  const DAYS_PER_REQUEST = 40;
  const KIND_LABEL = { sp_targeting: 'SP 타겟팅', sp_searchterm: 'SP 검색어', campaign: '캠페인 목록' };

  /* ---------------- 스타일 ---------------- */
  const css = `
  .dr-switch{ display:flex; gap:6px; margin-left:16px; }
  .dr-switch button{ background:transparent; border-color:#3a4260; color:#dfe3ee; padding:6px 12px; font-size:13px; }
  .dr-switch button.on{ background:#2563eb; border-color:#2563eb; color:#fff; }
  .topbar-left{ display:flex; align-items:center; flex-wrap:wrap; gap:8px; }
  body.dr-daily #uploadPanel, body.dr-daily #dashboard, body.dr-daily #refreshBtn, body.dr-daily #topActions{ display:none !important; }
  #dailyView{ display:none; }
  body.dr-daily #dailyView{ display:block; }
  .dr-upload{ display:grid; grid-template-columns: minmax(0,1.4fr) minmax(0,1fr); gap:12px; margin-bottom:18px; }
  @media (max-width: 860px){ .dr-upload{ grid-template-columns:1fr; } }
  .dr-drop{ border:2px dashed #c7cedb; border-radius:12px; background:#fff; padding:18px; cursor:pointer; transition:all .15s; }
  .dr-drop.drag{ border-color:#2563eb; background:#eaf0ff; }
  .dr-drop h3{ margin:0 0 4px; font-size:14px; }
  .dr-drop p{ margin:2px 0; font-size:12px; color:#6b7280; }
  .dr-side{ background:#fff; border:1px solid #e3e7ee; border-radius:12px; padding:14px 16px; display:flex; flex-direction:column; gap:8px; font-size:12.5px; }
  .dr-side label{ font-size:12px; color:#6b7280; }
  .dr-side input[type=date], .dr-bar select{ font:inherit; padding:5px 8px; border-radius:8px; border:1px solid #e3e7ee; }
  .dr-row{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
  .dr-status{ font-size:12.5px; min-height:18px; }
  .dr-status.ok{ color:#16a34a; } .dr-status.err{ color:#dc2626; }
  .dr-stored{ color:#6b7280; font-size:12px; line-height:1.6; }
  .dr-bar{ background:#fff; border:1px solid #e3e7ee; border-radius:12px; padding:10px 16px; display:flex; align-items:center; gap:14px; flex-wrap:wrap; margin-bottom:18px; font-size:13px; }
  .dr-bar .sub{ color:#6b7280; font-size:12px; }
  .dr-take{ font-size:13px; } .dr-take b{ font-size:14px; }
  .dr-note{ font-size:11.5px; color:#6b7280; padding:8px 14px; border-bottom:1px solid #e3e7ee; }
  .dr-pill{ display:inline-block; padding:1px 8px; border-radius:999px; border:1px solid currentColor; font-size:11.5px; font-weight:600; }
  .dr-lv-긴급{ color:#dc2626; } .dr-lv-주의{ color:#d97706; } .dr-lv-기회{ color:#16a34a; } .dr-lv-정리{ color:#6b7280; }
  .dr-table td.wrap{ white-space:normal; min-width:180px; }
  .dr-table td.ab{ text-decoration:underline dotted #9ca3af; text-underline-offset:3px; cursor:help; }
  .dr-table td.z{ color:#9ca3af; }
  .dr-table td.tot{ font-weight:600; }
  .dr-table tr.sel td{ background:#eef3ff !important; }
  .dr-table.click tbody tr{ cursor:pointer; }
  .dr-table thead th{ border-right:1px solid #eef0f4; }
  .dr-table thead th.edge{ box-shadow: inset -3px 0 0 #93a4c7; cursor:col-resize; }
  .dr-table.fixed{ table-layout:fixed; }
  .dr-table.fixed td, .dr-table.fixed th{ overflow:hidden; text-overflow:ellipsis; min-width:0 !important; }
  html.dr-resizing, html.dr-resizing *{ cursor:col-resize !important; user-select:none; }
  .dr-chart{ position:relative; }
  .dr-tip{ position:absolute; pointer-events:none; background:#fff; border:1px solid #e3e7ee; border-radius:8px; box-shadow:0 6px 18px rgba(0,0,0,.08); padding:6px 10px; font-size:12px; white-space:nowrap; z-index:5; }
  .dr-tip .d{ color:#6b7280; }
  .dr-legend{ display:flex; gap:16px; font-size:12px; color:#374151; padding:10px 14px 0; }
  .dr-legend i{ display:inline-block; width:10px; height:10px; border-radius:2px; margin-right:5px; vertical-align:middle; }
  .dr-seg{ display:flex; gap:6px; flex-wrap:wrap; padding:10px 14px; border-bottom:1px solid #e3e7ee; }
  .dr-seg button{ padding:5px 10px; font-size:12.5px; }
  .dr-seg button.on{ background:#2563eb; border-color:#2563eb; color:#fff; }
  .dr-grid2{ display:grid; grid-template-columns:repeat(auto-fit, minmax(min(100%, 460px), 1fr)); gap:12px; }
  .dr-empty{ padding:28px; text-align:center; color:#6b7280; font-size:13px; background:#fff; border:1px solid #e3e7ee; border-radius:12px; }
  `;
  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  /* ---------------- 유틸 ---------------- */
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = (v) => { if (v == null || v === '') return 0; if (typeof v === 'number') return isFinite(v) ? v : 0; const n = Number(String(v).replace(/[$,%\s]/g, '')); return isFinite(n) ? n : 0; };
  const share = (v) => { if (v == null || v === '') return null; if (typeof v === 'number') return v; const s = String(v).trim(); if (s.startsWith('<')) return 0; return s.includes('%') ? num(s) / 100 : num(s); };
  const iso = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  function toDateKey(v) {
    if (v == null || v === '') return '';
    if (typeof v === 'number') { const x = new Date(Date.UTC(1899, 11, 30) + Math.round(v * 86400) * 1000); return iso(x.getUTCFullYear(), x.getUTCMonth() + 1, x.getUTCDate()); }
    if (v instanceof Date) return iso(v.getFullYear(), v.getMonth() + 1, v.getDate());
    const s = String(v).trim();
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return iso(+m[1], +m[2], +m[3]);
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if (m) return iso(+m[3], +m[1], +m[2]);
    const d = new Date(s); return isNaN(d) ? '' : iso(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }
  const shortDate = (d) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;
  const F = {
    money: (v) => (v == null || !isFinite(v) ? '–' : (v < 0 ? '-$' : '$') + Math.round(Math.abs(v)).toLocaleString('en-US')),
    money2: (v) => (v == null || !isFinite(v) ? '–' : (v < 0 ? '-$' : '$') + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })),
    ratio: (v) => (v == null || !isFinite(v) ? '–' : v.toFixed(2)),
    int: (v) => (v == null || !isFinite(v) ? '–' : Math.round(v).toLocaleString('en-US')),
    pct: (v) => (v == null || !isFinite(v) ? '–' : (v * 100).toFixed(0) + '%'),
    text: (v) => (v == null ? '' : String(v)),
  };
  const secret = () => (typeof getSavedUploadSecret === 'function' ? getSavedUploadSecret() : '');

  // 제품 코드: 기존 앱의 ASIN_TO_CODE를 그대로 쓰고, 없으면 기본 매핑
  const CODE = (typeof ASIN_TO_CODE !== 'undefined' && ASIN_TO_CODE) || { B0DZNT7SWG: 'GL30', B0FR8Z7D81: 'GL30', B0GZV7GMDD: 'GL30', B0FQN7VN4R: 'CR', B0FQMJMKF6: 'GL15', B0GR4MNH5R: 'BIO', B0GR4G78GL: 'MEL30' };
  const asinOf = (t) => (String(t || '').split(/[^A-Za-z0-9]+/).find((p) => /^B0[A-Z0-9]{8}$/i.test(p)) || '').toUpperCase();
  const productOf = (c) => { const a = asinOf(c); if (a) return CODE[a] || a; return /bundle/i.test(c) ? 'Bundle' : '기타'; };
  const KIND_CODE = { validation: 'VAL', exploitation_manual_keyword: 'EXP-KW', exploitation_manual_product: 'EXP-PT', exploration: 'AUTO' };
  const campShort = (c) => { const m = String(c).match(/_sp_campaign_(validation|exploitation_manual_keyword|exploitation_manual_product|exploration)/); return m ? `${productOf(c)}-${KIND_CODE[m[1]]}` : String(c).replace(/^SP_/, ''); };
  const groupShort = (g) => { const m = String(g).match(/_sp_adgroup_([a-z_]+?)_\d{8,}$/); if (!m) return g; return m[1].replace('validation_manual_keyword', 'VAL-KW').replace('validation_manual_product', 'VAL-PT').replace(/^exploitation_manual_keyword_?/, 'KW-').replace(/^exploitation_manual_product_?/, 'PT-').replace('exploration', 'AUTO').replace('others', 'OTH').replace('brand', 'BRD').replace('generic', 'GEN').replace(/-$/, ''); };
  const tKey = (r) => `${r.campaign}|${r.adgroup}|${r.targeting}|${r.match}`;

  /* ---------------- 화면 뼈대 ---------------- */
  const header = document.querySelector('header.topbar');
  const main = document.querySelector('main');
  if (!header || !main) return;

  const left = header.firstElementChild;
  const leftWrap = document.createElement('div');
  leftWrap.className = 'topbar-left';
  header.insertBefore(leftWrap, left);
  leftWrap.appendChild(left);
  const sw = document.createElement('div');
  sw.className = 'dr-switch';
  sw.innerHTML = '<button type="button" data-view="weekly" class="on">주간 리포트</button><button type="button" data-view="daily">데일리 리포트</button>';
  leftWrap.appendChild(sw);

  const view = document.createElement('div');
  view.id = 'dailyView';
  view.innerHTML = `
    <div class="dr-upload">
      <div class="dr-drop" id="drDrop">
        <h3>데일리 리포트 파일 올리기</h3>
        <p>SP Targeting 리포트 · SP Search term 리포트 (xlsx/csv, Time unit = Daily) · 캠페인 목록 내보내기(csv)</p>
        <p>여러 파일을 한 번에 끌어다 놓거나 클릭해서 선택하세요. 주간 리포트와 따로 저장됩니다.</p>
        <p>같은 날짜를 다시 올리면 그 날짜만 최신 값으로 교체되고, 나머지 날짜는 계속 누적됩니다.</p>
      </div>
      <div class="dr-side">
        <div class="dr-row"><label for="drCampDate">캠페인 목록 파일의 날짜 (PST)</label><input type="date" id="drCampDate"></div>
        <div class="dr-stored" id="drStored">저장된 데일리 데이터가 없습니다.</div>
        <div class="dr-row"><button type="button" id="drRefresh">새로고침</button><button type="button" id="drReset">데일리 데이터 초기화</button></div>
        <div class="dr-status" id="drStatus"></div>
      </div>
      <input type="file" id="drFile" accept=".xlsx,.xls,.csv" multiple hidden>
    </div>
    <div id="drDash"></div>`;
  main.appendChild(view);

  function setView(v) {
    document.body.classList.toggle('dr-daily', v === 'daily');
    sw.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.view === v));
    try { localStorage.setItem('sbsp_view', v); } catch (e) {}
    if (v === 'daily' && !state.loaded) load();
  }
  sw.addEventListener('click', (e) => { const b = e.target.closest('button[data-view]'); if (b) setView(b.dataset.view); });

  const statusEl = document.getElementById('drStatus');
  const setStatus = (msg, kind) => { statusEl.textContent = msg || ''; statusEl.className = 'dr-status' + (kind ? ' ' + kind : ''); };

  /* ---------------- 상태 ---------------- */
  const state = {
    loaded: false,
    data: { sp_targeting: [], sp_searchterm: [], campaign: [] },
    dayInfo: [],
    base: null,
    kwMetric: 'spend',
    stMetric: 'spend',
    kw: null,
    sort: {},
    widths: {},
  };

  /* ---------------- 서버 ---------------- */
  async function load() {
    try {
      setStatus('데일리 데이터를 불러오는 중입니다...');
      const res = await fetch(API.get, { cache: 'no-store' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `불러오기 실패 (${res.status})`);
      const data = { sp_targeting: [], sp_searchterm: [], campaign: [] };
      (body.days || []).forEach((d) => { if (data[d.kind]) d.rows.forEach((r) => data[d.kind].push(Object.assign({ date: d.date }, r))); });
      state.data = data;
      state.dayInfo = body.days || [];
      state.loaded = true;
      const dates = targetingDates();
      if (!state.base || !dates.includes(state.base)) state.base = dates[dates.length - 1] || null;
      setStatus('');
      renderStored();
      render();
    } catch (err) {
      console.error(err);
      setStatus(err.message, 'err');
    }
  }

  function renderStored() {
    const el = document.getElementById('drStored');
    const by = {};
    state.dayInfo.forEach((d) => { (by[d.kind] = by[d.kind] || []).push(d.date); });
    const lines = Object.keys(KIND_LABEL).filter((k) => by[k]).map((k) => { const ds = by[k].sort(); return `${KIND_LABEL[k]}: ${ds[0]} ~ ${ds[ds.length - 1]} (${ds.length}일)`; });
    el.innerHTML = lines.length ? '<b>저장된 데이터 (최근 120일)</b><br>' + lines.map(esc).join('<br>') : '저장된 데일리 데이터가 없습니다.';
  }

  /* ---------------- 파일 파싱 ---------------- */
  function colIdx(h, names, re) {
    for (const n of names) { const i = h.indexOf(n); if (i !== -1) return i; }
    if (re) for (let i = 0; i < h.length; i++) if (typeof h[i] === 'string' && re.test(h[i])) return i;
    return -1;
  }
  function parseSheets(wb, fileName) {
    const out = [];
    for (const sn of wb.SheetNames) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: true, defval: null });
      const hi = rows.findIndex((r) => r && r.some((c) => c === 'Campaign Name' || c === 'Campaign name'));
      if (hi < 0) continue;
      const h = rows[hi].map((x) => (typeof x === 'string' ? x.trim() : x));
      const body = rows.slice(hi + 1).filter((r) => r && r.some((c) => c != null && c !== ''));
      const has = (n) => h.indexOf(n) !== -1;
      const isSB = /sponsored[_ ]?brands/i.test(fileName + ' ' + sn) || h.some((x) => typeof x === 'string' && /^14 Day Total Sales|Video (First Quartile|Complete) Views/i.test(x));
      if ((has('Customer Search Term') || has('Targeting')) && isSB) { out.push({ error: `${fileName}: SB 리포트는 데일리 탭에서 받지 않습니다. 주간 리포트 업로드에 넣어주세요.` }); continue; }
      const c = {
        date: h.indexOf('Date'), campaign: colIdx(h, ['Campaign Name', 'Campaign name']), adgroup: h.indexOf('Ad Group Name'),
        targeting: h.indexOf('Targeting'), match: h.indexOf('Match Type'), term: h.indexOf('Customer Search Term'),
        impr: h.indexOf('Impressions'), tos: colIdx(h, ['Top-of-search Impression Share', 'Top-of-search impression share']), clicks: h.indexOf('Clicks'),
        spend: colIdx(h, ['Spend', 'Total cost']), sales: colIdx(h, ['7 Day Total Sales', 'Sales'], /^\d+ Day Total Sales/i), orders: colIdx(h, ['7 Day Total Orders (#)', 'Purchases'], /^\d+ Day Total Orders/i),
        type: h.indexOf('Type'), status: h.indexOf('Status'), budget: h.indexOf('Campaign budget amount'),
      };
      if (has('Customer Search Term') && c.date !== -1) {
        out.push({ kind: 'sp_searchterm', rows: body.map((r) => ({ date: toDateKey(r[c.date]), campaign: r[c.campaign] || '', adgroup: r[c.adgroup] || '', targeting: r[c.targeting] || '', match: r[c.match] || '', term: r[c.term] || '', impr: num(r[c.impr]), clicks: num(r[c.clicks]), spend: num(r[c.spend]), sales: num(r[c.sales]), orders: num(r[c.orders]) })) });
      } else if (has('Targeting') && c.date !== -1) {
        out.push({ kind: 'sp_targeting', rows: body.map((r) => ({ date: toDateKey(r[c.date]), campaign: r[c.campaign] || '', adgroup: r[c.adgroup] || '', targeting: r[c.targeting] || '', match: r[c.match] || '', impr: num(r[c.impr]), tos: c.tos === -1 ? null : share(r[c.tos]), clicks: num(r[c.clicks]), spend: num(r[c.spend]), sales: num(r[c.sales]), orders: num(r[c.orders]) })) });
      } else if (has('Campaign name') && c.budget !== -1) {
        out.push({ kind: 'campaign', rows: body.map((r) => ({ date: null, campaign: r[c.campaign] || '', type: /^SB/.test(String(r[c.type] || '')) ? 'SB' : 'SP', status: r[c.status] || '', budget: num(r[c.budget]), impr: num(r[c.impr]), clicks: num(r[c.clicks]), spend: num(r[c.spend]), sales: num(r[c.sales]), orders: num(r[c.orders]) })) });
      }
    }
    return out;
  }
  const readFile = (file) => new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = (e) => { try { resolve(XLSX.read(new Uint8Array(e.target.result), { type: 'array', cellDates: false })); } catch (err) { reject(new Error(`${file.name}: ${err.message}`)); } };
    fr.onerror = () => reject(new Error(`${file.name} 파일을 읽을 수 없습니다.`));
    fr.readAsArrayBuffer(file);
  });

  async function handleFiles(list) {
    const files = Array.from(list).filter((f) => /\.(xlsx|xls|csv)$/i.test(f.name));
    if (!files.length) return setStatus('xlsx / xls / csv 파일만 올릴 수 있습니다.', 'err');
    if (!secret()) return setStatus('위쪽 업로드 비밀번호 입력창에 비밀번호를 먼저 넣어주세요.', 'err');
    setStatus(`파일 ${files.length}개를 읽는 중입니다...`);
    try {
      const parsed = [];
      const errors = [];
      for (const f of files) {
        const wb = await readFile(f);
        const sheets = parseSheets(wb, f.name);
        if (!sheets.length) errors.push(`${f.name}: 인식할 수 있는 리포트가 아닙니다.`);
        sheets.forEach((s) => (s.error ? errors.push(s.error) : parsed.push(s)));
      }
      if (!parsed.length) return setStatus(errors.join(' / ') || '올릴 데이터가 없습니다.', 'err');

      // 캠페인 목록에는 날짜 열이 없어서 입력한 날짜를 붙인다 (없으면 같이 올린 SP 리포트의 마지막 날짜)
      const campDateInput = document.getElementById('drCampDate');
      const spDates = parsed.filter((p) => p.kind !== 'campaign').flatMap((p) => p.rows.map((r) => r.date)).filter(Boolean).sort();
      for (const p of parsed.filter((x) => x.kind === 'campaign')) {
        const d = campDateInput.value || spDates[spDates.length - 1];
        if (!d) return setStatus('캠페인 목록 파일은 날짜 열이 없습니다. 오른쪽 "캠페인 목록 파일의 날짜"를 선택해주세요.', 'err');
        p.rows.forEach((r) => { r.date = d; });
      }

      // (종류, 날짜) 단위로 묶는다. 같은 종류·날짜가 여러 파일에 있으면 합친다.
      const days = new Map();
      parsed.forEach((p) => p.rows.forEach((r) => {
        if (!r.date) return;
        const k = p.kind + '|' + r.date;
        if (!days.has(k)) days.set(k, { kind: p.kind, date: r.date, rows: [] });
        const copy = Object.assign({}, r); delete copy.date;
        days.get(k).rows.push(copy);
      }));
      const list2 = [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
      for (let i = 0; i < list2.length; i += DAYS_PER_REQUEST) {
        setStatus(`서버에 저장하는 중입니다... (${Math.min(i + DAYS_PER_REQUEST, list2.length)}/${list2.length})`);
        const res = await fetch(API.upload, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret: secret(), days: list2.slice(i, i + DAYS_PER_REQUEST) }) });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || `업로드 실패 (${res.status})`);
      }
      const summary = Object.keys(KIND_LABEL).map((k) => { const ds = list2.filter((d) => d.kind === k).map((d) => d.date); return ds.length ? `${KIND_LABEL[k]} ${ds[0]}~${ds[ds.length - 1]}` : ''; }).filter(Boolean).join(', ');
      state.base = null;
      await load();
      setStatus(`저장했습니다: ${summary}` + (errors.length ? ` (제외: ${errors.join(' / ')})` : ''), 'ok');
    } catch (err) {
      console.error(err);
      setStatus(err.message, 'err');
    }
  }

  const drop = document.getElementById('drDrop');
  const fileInput = document.getElementById('drFile');
  drop.addEventListener('click', () => fileInput.click());
  ['dragover', 'dragenter'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove('drag'); }));
  drop.addEventListener('drop', (e) => { if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files); });
  fileInput.addEventListener('change', (e) => { if (e.target.files.length) handleFiles(e.target.files); e.target.value = ''; });
  document.getElementById('drRefresh').addEventListener('click', load);
  document.getElementById('drReset').addEventListener('click', async () => {
    if (!secret()) return setStatus('초기화하려면 업로드 비밀번호를 먼저 넣어주세요.', 'err');
    if (!confirm('데일리 리포트 데이터를 모두 지울까요? 주간 리포트 데이터는 그대로 남습니다.')) return;
    try {
      const res = await fetch(API.reset, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret: secret() }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `초기화 실패 (${res.status})`);
      state.base = null;
      await load();
      setStatus('데일리 데이터를 초기화했습니다.', 'ok');
    } catch (err) { setStatus(err.message, 'err'); }
  });

  /* ---------------- 계산 ---------------- */
  function targetingDates() { return [...new Set(state.data.sp_targeting.map((r) => r.date))].sort(); }

  function compute() {
    const all = targetingDates();
    const base = state.base || all[all.length - 1];
    const upto = all.filter((d) => d <= base);
    const prior = upto[upto.length - 2] || null;
    const win = new Set(upto.slice(-WINDOW));
    const gridDates = upto.slice(-GRID_DAYS);
    const tRows = state.data.sp_targeting.filter((r) => r.date <= base);
    const sRows = state.data.sp_searchterm.filter((r) => r.date <= base);

    // 일별 합계
    const dayMap = new Map();
    tRows.forEach((r) => { const o = dayMap.get(r.date) || { date: r.date, impr: 0, clicks: 0, spend: 0, sales: 0, orders: 0 }; o.impr += r.impr; o.clicks += r.clicks; o.spend += r.spend; o.sales += r.sales; o.orders += r.orders; dayMap.set(r.date, o); });
    const daily = [...dayMap.values()].sort((a, b) => a.date.localeCompare(b.date)).map((o) => Object.assign(o, { roas: o.spend ? o.sales / o.spend : 0, cpc: o.clicks ? o.spend / o.clicks : 0 }));
    const L = daily.find((d) => d.date === base), P = daily.find((d) => d.date === prior);

    // 캠페인 전일 대비
    const cm = new Map();
    tRows.forEach((r) => {
      if (r.date !== base && r.date !== prior) return;
      const o = cm.get(r.campaign) || { campaign: r.campaign, name: campShort(r.campaign), product: productOf(r.campaign), sp: 0, sl: 0, ap: 0, al: 0, ip: 0, il: 0 };
      if (r.date === base) { o.sl += r.spend; o.al += r.sales; o.il += r.impr; } else { o.sp += r.spend; o.ap += r.sales; o.ip += r.impr; }
      cm.set(r.campaign, o);
    });
    const campaigns = [...cm.values()].map((o) => ({ campaign: o.campaign, name: o.name, product: o.product, spend_prior: o.sp, spend_latest: o.sl, spend_change: o.sl - o.sp, roas_prior: o.sp ? o.ap / o.sp : null, roas_latest: o.sl ? o.al / o.sl : null, impr_prior: o.ip, impr_latest: o.il }));

    // 타겟팅(키워드) 일자별 + 7일 + 권장 입찰
    const tm = new Map();
    tRows.forEach((r) => {
      const key = tKey(r);
      const o = tm.get(key) || { key, campaign: r.campaign, adgroup: r.adgroup, campaign_short: campShort(r.campaign), adgroup_short: groupShort(r.adgroup), product: productOf(r.campaign), targeting: r.targeting, match: r.match, d: {}, ws: 0, wa: 0, wc: 0, wo: 0, tp: [], tl: null, il: 0 };
      const x = o.d[r.date] || (o.d[r.date] = { spend: 0, sales: 0, clicks: 0, orders: 0, tos: null });
      x.spend += r.spend; x.sales += r.sales; x.clicks += r.clicks; x.orders += r.orders; if (r.impr > 0) x.tos = r.tos;
      if (win.has(r.date)) { o.ws += r.spend; o.wa += r.sales; o.wc += r.clicks; o.wo += r.orders; if (r.date !== base && r.impr > 0 && r.tos != null) o.tp.push(r.tos); }
      if (r.date === base) { o.il += r.impr; if (r.impr > 0 && r.tos != null) o.tl = r.tos; }
      tm.set(key, o);
    });
    const targets = [...tm.values()].map((o) => {
      const cpc = o.wc ? o.ws / o.wc : null, roas = o.ws ? o.wa / o.ws : null;
      const row = { key: o.key, campaign: o.campaign, adgroup: o.adgroup, campaign_short: o.campaign_short, adgroup_short: o.adgroup_short, product: o.product, targeting: o.targeting, match: o.match,
        spend_total: o.ws, sales_total: o.wa, clicks_total: o.wc, orders_total: o.wo, roas_total: roas, cpc_total: cpc, tos_total: null,
        bid: cpc && roas && o.ws >= 20 && o.wc >= 10 ? (cpc * roas) / TARGET_ROAS : null, impr_latest: o.il,
        spend_latest: (o.d[base] || {}).spend || 0, sales_latest: (o.d[base] || {}).sales || 0, spend_prior: prior ? (o.d[prior] || {}).spend || 0 : 0,
        tos_latest: o.tl, tos_prior_avg: o.tp.length ? o.tp.reduce((s, x) => s + x, 0) / o.tp.length : null };
      row.roas_latest = row.spend_latest ? row.sales_latest / row.spend_latest : null;
      gridDates.forEach((d) => { const x = o.d[d]; row['spend_' + d] = x ? x.spend : 0; row['sales_' + d] = x ? x.sales : 0; row['clicks_' + d] = x ? x.clicks : 0; row['orders_' + d] = x ? x.orders : 0; row['roas_' + d] = x && x.spend ? x.sales / x.spend : null; row['cpc_' + d] = x && x.clicks ? x.spend / x.clicks : null; row['tos_' + d] = x ? x.tos : null; });
      return row;
    });
    const topTargets = targets.filter((t) => t.spend_total > 0).sort((a, b) => b.spend_total - a.spend_total).slice(0, TOP_N);

    // 검색어 7일 + 일자별
    const targeted = new Set(sRows.map((r) => String(r.targeting).toLowerCase()));
    const exact = new Set(sRows.filter((r) => r.match === 'EXACT').map((r) => String(r.targeting).toLowerCase()));
    const sm = new Map();
    sRows.forEach((r) => {
      const t = String(r.term).toLowerCase();
      const o = sm.get(t) || { term: r.term, d: {}, ws: 0, wa: 0, wc: 0, wo: 0, by: new Map() };
      const x = o.d[r.date] || (o.d[r.date] = { spend: 0, sales: 0, clicks: 0, orders: 0 });
      x.spend += r.spend; x.sales += r.sales; x.clicks += r.clicks; x.orders += r.orders;
      if (win.has(r.date)) { o.ws += r.spend; o.wa += r.sales; o.wc += r.clicks; o.wo += r.orders; const b = o.by.get(r.campaign) || { campaign: r.campaign, spend: 0 }; b.spend += r.spend; o.by.set(r.campaign, b); }
      sm.set(t, o);
    });
    const terms = [...sm.values()].filter((o) => o.ws > 0).map((o) => {
      const top = [...o.by.values()].sort((a, b) => b.spend - a.spend)[0];
      const t = String(o.term).toLowerCase(), roas = o.ws ? o.wa / o.ws : null;
      const flag = o.wo === 0 && (o.wc >= 10 || o.ws >= 30) && !targeted.has(t) ? '제외 후보' : o.wo >= 2 && o.wc >= 3 && roas >= 3 && t.length <= 60 && !exact.has(t) ? '확장 후보' : '';
      const row = { term: o.term, flag, product: top ? productOf(top.campaign) : '', campaign_name: top ? campShort(top.campaign) : '', campaign_full: top ? top.campaign : '', spend_total: o.ws, clicks_total: o.wc, orders_total: o.wo, sales_total: o.wa, roas_total: roas };
      gridDates.forEach((d) => { const x = o.d[d]; row['spend_' + d] = x ? x.spend : 0; row['clicks_' + d] = x ? x.clicks : 0; row['orders_' + d] = x ? x.orders : 0; row['roas_' + d] = x && x.spend ? x.sales / x.spend : null; });
      return row;
    }).sort((a, b) => b.spend_total - a.spend_total);
    const termTop = terms.slice(0, TOP_N);
    const termList = terms.filter((r, i) => i < 40 || r.flag);

    // 알림
    const $ = (x) => '$' + Math.round(x).toLocaleString('en-US');
    const alerts = [];
    if (prior) {
      campaigns.forEach((c) => {
        if (c.spend_prior >= 30 && c.spend_latest < c.spend_prior * 0.2) alerts.push({ level: '긴급', category: '노출 급감', item: c.name, full: c.campaign, detail: `광고비 ${$(c.spend_prior)} → ${$(c.spend_latest)}, 노출 ${F.int(c.impr_prior)} → ${F.int(c.impr_latest)}`, action: '바이박스(Featured Offer)·재고·캠페인 상태·mop 일시중지 확인' });
        else if (c.spend_latest >= c.spend_prior * 1.5 && c.spend_latest - c.spend_prior >= 100) alerts.push({ level: '주의', category: '광고비 급증', item: c.name, full: c.campaign, detail: `광고비 ${$(c.spend_prior)} → ${$(c.spend_latest)}, ROAS ${F.ratio(c.roas_latest)}`, action: '예산·입찰 변경 이력 확인 (mop 자동 조정 포함)' });
      });
    }
    targets.forEach((t) => {
      const name = `${t.campaign_short} · ${t.targeting} (${t.match})`;
      if (t.spend_latest >= 50 && (t.roas_latest || 0) < 1) alerts.push({ level: '주의', category: '저효율 키워드', item: name, full: t.campaign, detail: `기준일 광고비 ${$(t.spend_latest)}, ROAS ${F.ratio(t.roas_latest || 0)}`, action: t.bid ? `입찰 인하: 7일 CPC ${F.money2(t.cpc_total)} → 약 ${F.money2(t.bid)}` : '입찰 인하 검토' });
      if ((t.roas_total || 0) >= 2.5 && t.impr_latest > 0 && t.tos_latest != null && (t.tos_prior_avg || 0) >= 0.1 && t.tos_latest < t.tos_prior_avg * 0.5) alerts.push({ level: '기회', category: '상단 노출 하락', item: name, full: t.campaign, detail: `7일 ROAS ${F.ratio(t.roas_total)}, 상단 점유 ${F.pct(t.tos_prior_avg)} → ${F.pct(t.tos_latest || 0)}`, action: '입찰 상향 검토' });
    });
    termList.forEach((s) => {
      if (s.flag === '제외 후보') alerts.push({ level: '정리', category: '제외 키워드 후보', item: s.term, full: s.campaign_full, detail: `7일 광고비 ${$(s.spend_total)}, 클릭 ${s.clicks_total}, 주문 0 · ${s.campaign_name}`, action: '해당 캠페인에 제외 키워드(Negative exact) 추가' });
      if (s.flag === '확장 후보') alerts.push({ level: '기회', category: 'EXACT 확장 후보', item: s.term, full: s.campaign_full, detail: `7일 주문 ${s.orders_total}, ROAS ${F.ratio(s.roas_total)} · ${s.campaign_name}`, action: 'EXACT 키워드로 추가' });
    });
    const ord = { 긴급: 0, 주의: 1, 기회: 2, 정리: 3 };
    alerts.sort((a, b) => ord[a.level] - ord[b.level]).forEach((a, i) => { a.order = i; });

    // 캠페인 목록 (예산 소진율, SP/SB 일별)
    const cRows = state.data.campaign.filter((r) => r.date <= base);
    const cDates = [...new Set(cRows.map((r) => r.date))].sort();
    const cLast = cDates[cDates.length - 1] || null;
    const budget = cRows.filter((r) => r.date === cLast).map((r) => ({ campaign: r.campaign, name: campShort(r.campaign), type: r.type, budget: r.budget, spend: r.spend, util: r.budget ? r.spend / r.budget : null, roas: r.spend ? r.sales / r.spend : null, status: r.status }));
    const atm = new Map();
    cRows.filter((r) => cDates.slice(-GRID_DAYS).includes(r.date)).forEach((r) => { const k = r.date + ' ' + r.type; const o = atm.get(k) || { k, date: r.date, type: r.type, spend: 0, sales: 0, clicks: 0 }; o.spend += r.spend; o.sales += r.sales; o.clicks += r.clicks; atm.set(k, o); });
    const adType = [...atm.values()].map((o) => Object.assign(o, { roas: o.spend ? o.sales / o.spend : null }));

    return { all, base, prior, gridDates, daily: daily.slice(-CHART_DAYS), L, P, campaigns, targets, topTargets, terms, termTop, termList, alerts, budget, cLast, adType, sRows };
  }

  /* ---------------- 표 공통 (정렬 / 너비 조절) ---------------- */
  function sortRows(id, rows, defKey, defDir) {
    const st = state.sort[id] || { key: defKey, dir: defDir || 'desc' };
    if (!st.key) return rows;
    const dir = st.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = a[st.key], y = b[st.key];
      if (x == null || x === '') return y == null || y === '' ? 0 : 1;
      if (y == null || y === '') return -1;
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'ko')) * dir;
    });
  }
  function arrow(id, key, defKey, defDir) { const st = state.sort[id] || { key: defKey, dir: defDir || 'desc' }; return st.key === key ? `<span class="arrow">${st.dir === 'asc' ? '▲' : '▼'}</span>` : ''; }

  // cols: [{key, label, fmt, cls, tip, left, heat}]
  function table(id, rows, cols, opts) {
    opts = opts || {};
    const defKey = opts.defKey, defDir = opts.defDir;
    const sorted = sortRows(id, rows, defKey, defDir);
    const maxHeat = {};
    cols.filter((c) => c.heat === 'size').forEach((c) => { maxHeat[c.key] = Math.max(0, ...rows.map((r) => r[c.key] || 0)); });
    const heatMax = opts.sharedHeat ? Math.max(0, ...Object.values(maxHeat)) : null;
    const th = cols.map((c) => `<th class="${c.left ? 'left' : ''}" data-key="${esc(c.key)}" data-type="${c.fmt === 'text' ? 'str' : 'num'}">${esc(c.label)}${arrow(id, c.key, defKey, defDir)}</th>`).join('');
    const body = sorted.map((r) => {
      const tds = cols.map((c) => {
        const v = r[c.key];
        let cls = [c.left ? 'left' : '', c.cls || ''];
        let style = '';
        let inner;
        if (c.fmt === 'level') inner = `<span class="dr-pill dr-lv-${esc(v)}">${esc(v)}</span>`;
        else inner = esc(F[c.fmt || 'text'](v));
        if (c.heat === 'size') { const m = heatMax != null ? heatMax : maxHeat[c.key]; if (v > 0 && m > 0) style = `background:rgba(37,99,235,${(0.06 + (v / m) * 0.42).toFixed(3)})`; if (!v) cls.push('z'); }
        if (c.heat === 'roas' && v != null) { const good = v >= TARGET_ROAS; const a = Math.min(0.45, 0.1 + Math.abs(v - TARGET_ROAS) * 0.15); style = `background:${good ? `rgba(22,163,74,${a.toFixed(3)})` : `rgba(220,38,38,${a.toFixed(3)})`}`; }
        if (c.heat && v == null) { inner = '·'; cls.push('z'); }
        const title = c.tip && r[c.tip] ? ` title="${esc(r[c.tip])}"` : '';
        return `<td class="${cls.join(' ').trim()}"${style ? ` style="${style}"` : ''}${title}>${inner}</td>`;
      }).join('');
      const key = opts.keyOf ? opts.keyOf(r) : '';
      const sel = opts.selected && key === opts.selected ? ' class="sel"' : '';
      return `<tr data-key="${esc(key)}"${sel}>${tds}</tr>`;
    }).join('') || `<tr><td colspan="${cols.length}" class="empty-note">데이터가 없습니다</td></tr>`;
    return `<table class="dr-table${opts.click ? ' click' : ''}" data-id="${id}"><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table>`;
  }

  function applyWidths(root) {
    (root || document).querySelectorAll('#dailyView table.dr-table').forEach((t) => {
      const w = state.widths[t.dataset.id];
      const ths = [...t.querySelectorAll('thead th')];
      if (!w) { t.classList.remove('fixed'); t.style.width = ''; ths.forEach((th) => { th.style.width = ''; }); return; }
      let sum = 0;
      ths.forEach((th) => { const x = w[th.dataset.key] != null ? w[th.dataset.key] : 72; th.style.width = x + 'px'; sum += x; });
      t.classList.add('fixed'); t.style.width = sum + 'px';
    });
  }
  const EDGE = 7;
  let drag = null, hot = null;
  const edgeTh = (e) => { const th = e.target instanceof Element ? e.target.closest('#dailyView table.dr-table thead th') : null; return th && th.getBoundingClientRect().right - e.clientX <= EDGE ? th : null; };
  document.addEventListener('pointermove', (e) => {
    if (drag) { state.widths[drag.id][drag.key] = Math.max(40, Math.round(drag.w0 + e.clientX - drag.x0)); applyWidths(); e.preventDefault(); return; }
    const th = edgeTh(e);
    if (hot && hot !== th) hot.classList.remove('edge');
    if (th) th.classList.add('edge');
    hot = th;
  });
  document.addEventListener('pointerdown', (e) => {
    const th = edgeTh(e); if (!th) return;
    const t = th.closest('table'), id = t.dataset.id;
    const w = (state.widths[id] = state.widths[id] || {});
    t.querySelectorAll('thead th').forEach((h) => { if (w[h.dataset.key] == null) w[h.dataset.key] = Math.round(h.getBoundingClientRect().width); });
    drag = { id, key: th.dataset.key, x0: e.clientX, w0: w[th.dataset.key] };
    document.documentElement.classList.add('dr-resizing');
    e.preventDefault(); e.stopPropagation();
  }, true);
  const endDrag = () => { if (!drag) return; setTimeout(() => { drag = null; }, 0); document.documentElement.classList.remove('dr-resizing'); };
  document.addEventListener('pointerup', endDrag);
  document.addEventListener('pointercancel', endDrag);
  document.addEventListener('dblclick', (e) => { const th = edgeTh(e); if (!th) return; delete state.widths[th.closest('table').dataset.id]; applyWidths(); });

  // 머리글 클릭 = 정렬, 줄 클릭 = 키워드 선택, 버튼 = 지표 전환
  view.addEventListener('click', (e) => {
    if (drag) return;
    const th = e.target.closest('table.dr-table thead th');
    if (th) {
      if (edgeTh(e)) return;
      const id = th.closest('table').dataset.id, key = th.dataset.key;
      const cur = state.sort[id] || {};
      state.sort[id] = { key, dir: cur.key === key ? (cur.dir === 'asc' ? 'desc' : 'asc') : th.dataset.type === 'str' ? 'asc' : 'desc' };
      render();
      return;
    }
    const tr = e.target.closest('table.dr-table.click tbody tr[data-key]');
    if (tr) { state.kw = tr.dataset.key; render(); const d = document.getElementById('drKwDetail'); if (d) d.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); return; }
    const mb = e.target.closest('button[data-metric]');
    if (mb) { state[mb.dataset.group] = mb.dataset.metric; render(); }
  });
  view.addEventListener('change', (e) => { if (e.target.id === 'drBase') { state.base = e.target.value; state.kw = null; render(); } });

  /* ---------------- 차트 ---------------- */
  function comboChart(rows, extraTip) {
    if (!rows.length) return '<div class="empty-note">데이터가 없습니다</div>';
    const W = 1000, H = 260, padL = 58, padR = 44, padT = 14, padB = 26;
    const pw = W - padL - padR, ph = H - padT - padB;
    const maxS = Math.max(1, ...rows.map((r) => r.spend)) * 1.12;
    const maxR = Math.max(1, ...rows.map((r) => r.roas || 0)) * 1.15;
    const step = pw / rows.length, bw = Math.min(32, step * 0.6);
    const x = (i) => padL + i * step + step / 2;
    const yS = (v) => padT + ph - (v / maxS) * ph, yR = (v) => padT + ph - (v / maxR) * ph;
    let g = '';
    for (let k = 0; k <= 4; k++) { const yy = padT + ph - (k / 4) * ph; g += `<line x1="${padL}" y1="${yy}" x2="${W - padR}" y2="${yy}" stroke="#eef0f4"/><text x="${padL - 8}" y="${yy + 3}" font-size="10" fill="#6b7280" text-anchor="end">$${Math.round((maxS * k) / 4).toLocaleString('en-US')}</text><text x="${W - padR + 8}" y="${yy + 3}" font-size="10" fill="#f59e0b">${((maxR * k) / 4).toFixed(1)}</text>`; }
    const bars = rows.map((r, i) => `<rect x="${(x(i) - bw / 2).toFixed(1)}" y="${yS(r.spend).toFixed(1)}" width="${bw.toFixed(1)}" height="${(padT + ph - yS(r.spend)).toFixed(1)}" rx="3" fill="rgba(37,99,235,0.6)"/>`).join('');
    let path = '', pen = false;
    rows.forEach((r, i) => { if (r.roas == null) { pen = false; return; } path += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${yR(r.roas).toFixed(1)} `; pen = true; });
    const dots = rows.map((r, i) => (r.roas == null ? '' : `<circle cx="${x(i).toFixed(1)}" cy="${yR(r.roas).toFixed(1)}" r="3" fill="#f59e0b"/>`)).join('');
    const every = Math.max(1, Math.ceil(rows.length / 12));
    const xl = rows.map((r, i) => (i % every === 0 || i === rows.length - 1 ? `<text x="${x(i).toFixed(1)}" y="${H - 8}" font-size="10" fill="#6b7280" text-anchor="middle">${shortDate(r.date)}</text>` : '')).join('');
    const hits = rows.map((r, i) => `<rect class="hit" data-i="${i}" x="${(padL + i * step).toFixed(1)}" y="${padT}" width="${step.toFixed(1)}" height="${ph}" fill="transparent"/>`).join('');
    const tipData = esc(JSON.stringify(rows.map((r) => [r.date, F.money(r.spend), F.ratio(r.roas)].concat((extraTip ? extraTip(r) : []).map((p) => p[0] + ' ' + p[1])))));
    return `<div class="dr-legend"><span><i style="background:rgba(37,99,235,.6)"></i>광고비</span><span><i style="background:#f59e0b"></i>ROAS (오른쪽 축)</span></div>
      <div class="dr-chart" data-tip="${tipData}"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="width:100%;height:260px;display:block">${g}<line x1="${padL}" y1="${padT + ph}" x2="${W - padR}" y2="${padT + ph}" stroke="#d1d5db"/>${bars}<path d="${path}" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>${dots}${xl}${hits}</svg><div class="dr-tip" hidden></div></div>`;
  }
  view.addEventListener('mousemove', (e) => {
    const hit = e.target.closest('.dr-chart rect.hit');
    view.querySelectorAll('.dr-tip').forEach((t) => { if (!hit || !t.parentElement.contains(hit)) t.hidden = true; });
    if (!hit) return;
    const box = hit.closest('.dr-chart'), tip = box.querySelector('.dr-tip');
    const d = JSON.parse(box.dataset.tip)[Number(hit.dataset.i)];
    tip.innerHTML = `<div class="d">${esc(d[0])} (PST)</div><div>광고비 ${esc(d[1])}</div><div>ROAS ${esc(d[2])}</div>` + d.slice(3).map((s) => `<div>${esc(s)}</div>`).join('');
    tip.hidden = false;
    const rb = box.getBoundingClientRect();
    tip.style.left = Math.min(Math.max(e.clientX - rb.left + 12, 0), rb.width - tip.offsetWidth) + 'px';
    tip.style.top = '8px';
  });

  /* ---------------- 렌더링 ---------------- */
  const KW_METRICS = [['spend', '광고비', 'money', 'size'], ['roas', 'ROAS', 'ratio', 'roas'], ['clicks', '클릭', 'int', 'size'], ['cpc', 'CPC', 'money2', 'size'], ['orders', '주문', 'int', 'size'], ['tos', '상단 점유', 'pct', 'size']];
  const ST_METRICS = KW_METRICS.filter((m) => ['spend', 'roas', 'clicks', 'orders'].includes(m[0]));
  const seg = (group, list, cur) => `<div class="dr-seg">${list.map((m) => `<button type="button" data-group="${group}" data-metric="${m[0]}" class="${cur === m[0] ? 'on' : ''}">${m[1]}</button>`).join('')}</div>`;
  const dateCols = (dates, metric) => { const m = KW_METRICS.find((x) => x[0] === metric); return dates.map((d) => ({ key: `${metric}_${d}`, label: shortDate(d), fmt: m[2], heat: m[3] })); };

  function kpiCard(label, cur, prev, fmt, dir) {
    let delta = '';
    if (prev != null && prev !== 0 && isFinite(prev)) {
      const chg = (cur - prev) / Math.abs(prev) * 100, up = chg >= 0;
      const cls = dir === 0 ? 'neutral' : (up === (dir > 0) ? 'good' : 'bad');
      delta = `<div class="card-delta"><span class="delta ${cls}">${up ? '▲' : '▼'} ${Math.abs(chg).toFixed(1)}%</span> 전일 대비</div>`;
    }
    return `<div class="card"><div class="card-label">${label}</div><div class="card-value">${fmt(cur)}</div>${delta}</div>`;
  }

  function render() {
    const dash = document.getElementById('drDash');
    if (!state.data.sp_targeting.length) {
      dash.innerHTML = '<div class="dr-empty">아직 데일리 데이터가 없습니다. 위에 SP Targeting · Search term 리포트(일별)를 올려주세요.</div>';
      return;
    }
    const c = compute();
    if (!state.kw || !c.topTargets.some((t) => t.key === state.kw)) state.kw = c.topTargets[0] ? c.topTargets[0].key : null;
    const sel = c.targets.find((t) => t.key === state.kw);
    const cnt = (lv) => c.alerts.filter((a) => a.level === lv).length;
    const L = c.L || {}, P = c.P || null;
    const km = KW_METRICS.find((m) => m[0] === state.kwMetric), sm = ST_METRICS.find((m) => m[0] === state.stMetric) || ST_METRICS[0];

    const selTerms = sel ? (() => {
      const m = new Map();
      c.sRows.filter((r) => tKey(r) === sel.key).forEach((r) => {
        const o = m.get(r.term) || { term: r.term, spend_total: 0, orders_total: 0, sales_total: 0 };
        if (c.gridDates.slice(-WINDOW).includes(r.date)) { o.spend_total += r.spend; o.orders_total += r.orders; o.sales_total += r.sales; }
        o['spend_' + r.date] = (o['spend_' + r.date] || 0) + r.spend; o['orders_' + r.date] = (o['orders_' + r.date] || 0) + r.orders;
        m.set(r.term, o);
      });
      return [...m.values()].map((o) => { o.roas_total = o.spend_total ? o.sales_total / o.spend_total : null; c.gridDates.forEach((d) => { if (o['spend_' + d] == null) o['spend_' + d] = 0; }); return o; }).sort((a, b) => b.spend_total - a.spend_total).slice(0, 25);
    })() : [];

    dash.innerHTML = `
      <div class="dr-bar">
        <label for="drBase">기준일 (PST)</label>
        <select id="drBase">${c.all.slice().reverse().map((d) => `<option value="${d}" ${d === c.base ? 'selected' : ''}>${d}</option>`).join('')}</select>
        <span class="sub">비교일 ${c.prior || '–'} · 최근 7일 = ${c.gridDates.slice(-WINDOW)[0] || ''} ~ ${c.base}</span>
        <span class="dr-take">오늘 할 일 <b>${c.alerts.length}</b>건 · <span class="dr-lv-긴급">긴급 ${cnt('긴급')}</span> · <span class="dr-lv-주의">주의 ${cnt('주의')}</span> · <span class="dr-lv-기회">기회 ${cnt('기회')}</span> · 정리 ${cnt('정리')}</span>
      </div>

      <section class="block"><h2>기준일 요약 <span class="sub">(Sponsored Products, 매출은 클릭 후 7일 기준이라 최근 1~2일은 더 오를 수 있음)</span></h2>
        <div class="card-grid">
          ${kpiCard('광고비', L.spend || 0, P && P.spend, F.money2, 0)}
          ${kpiCard('광고 매출', L.sales || 0, P && P.sales, F.money2, 1)}
          ${kpiCard('ROAS', L.roas || 0, P && P.roas, (v) => v.toFixed(2) + 'x', 1)}
          ${kpiCard('CPC', L.cpc || 0, P && P.cpc, F.money2, -1)}
          ${kpiCard('주문', L.orders || 0, P && P.orders, F.int, 1)}
          ${kpiCard('클릭', L.clicks || 0, P && P.clicks, F.int, 1)}
        </div></section>

      <section class="block"><h2>오늘 할 일 <span class="sub">(기준일 vs 비교일 자동 규칙)</span></h2>
        <div class="table-card"><div class="dr-note">노출 급감: 전일 광고비 $30 이상 캠페인이 80% 넘게 감소 · 광고비 급증: 1.5배 이상이면서 $100 넘게 증가 · 저효율: 기준일 광고비 $50 이상 & ROAS 1 미만 · 상단 노출 하락: 7일 ROAS 2.5 이상인데 상단 점유가 이전 평균의 절반 미만 · 권장 입찰 = 7일 CPC × 7일 ROAS ÷ ${TARGET_ROAS}</div>
        <div class="table-scroll">${table('alerts', c.alerts, [{ key: 'level', label: '수준', fmt: 'level', left: 1 }, { key: 'category', label: '구분', fmt: 'text', left: 1 }, { key: 'item', label: '대상', fmt: 'text', left: 1, cls: 'wrap', tip: 'full' }, { key: 'detail', label: '내용', fmt: 'text', left: 1, cls: 'wrap' }, { key: 'action', label: '조치', fmt: 'text', left: 1, cls: 'wrap' }], { defKey: 'order', defDir: 'asc' })}</div></div></section>

      <section class="block"><h2>일별 광고비와 ROAS <span class="sub">(최근 ${CHART_DAYS}일, PST)</span></h2>
        <div class="table-card">${comboChart(c.daily, (r) => [['매출', F.money(r.sales)], ['주문', F.int(r.orders)], ['CPC', F.money2(r.cpc)]])}</div></section>

      <section class="block"><h2>키워드 일자별 추이 <span class="sub">(최근 7일 광고비 상위 ${TOP_N}개 · 최근 ${GRID_DAYS}일 · 줄을 누르면 아래에 상세)</span></h2>
        <div class="table-card">${seg('kwMetric', KW_METRICS, state.kwMetric)}
        <div class="dr-note">캠페인·세트 약자에 마우스를 올리면 전체 이름이 보입니다 (VAL 검증 · EXP-KW/EXP-PT 키워드·상품 집행 · AUTO 자동 · BRD 브랜드 · GEN 일반 · OTH 기타). ROAS 칸은 ${TARGET_ROAS} 이상 초록, 미만 빨강.</div>
        <div class="table-scroll">${table('kwgrid', c.topTargets, [{ key: 'campaign_short', label: '캠페인', fmt: 'text', left: 1, cls: 'ab', tip: 'campaign' }, { key: 'adgroup_short', label: '세트', fmt: 'text', left: 1, cls: 'ab', tip: 'adgroup' }, { key: 'product', label: '제품', fmt: 'text', left: 1 }, { key: 'targeting', label: '타겟팅', fmt: 'text', left: 1 }, { key: 'match', label: '매치', fmt: 'text', left: 1 }, { key: `${state.kwMetric}_total`, label: `7일 ${km[1]}`, fmt: km[2], cls: 'tot' }, { key: 'bid', label: '권장 입찰', fmt: 'money2' }].concat(dateCols(c.gridDates, state.kwMetric)), { defKey: 'spend_total', keyOf: (r) => r.key, click: 1, selected: state.kw, sharedHeat: km[3] === 'size' })}</div></div></section>

      <section class="block" id="drKwDetail"><h2>선택한 키워드 · ${sel ? esc(`${sel.campaign_short} / ${sel.adgroup_short} · ${sel.targeting} (${sel.match})`) : '–'}</h2>
        <div class="dr-grid2">
          <div class="table-card">${sel ? comboChart(c.gridDates.map((d) => ({ date: d, spend: sel['spend_' + d], roas: sel['roas_' + d], cpc: sel['cpc_' + d], tos: sel['tos_' + d], orders: sel['orders_' + d] })), (r) => [['CPC', F.money2(r.cpc)], ['상단 점유', F.pct(r.tos)], ['주문', F.int(r.orders)]]) : ''}</div>
          <div class="table-card"><div class="dr-note">이 키워드로 실제 들어온 검색어 · 일자별 광고비 (7일 광고비 상위 25개)</div>
            <div class="table-scroll">${table('kwterms', selTerms, [{ key: 'term', label: '검색어', fmt: 'text', left: 1 }, { key: 'spend_total', label: '7일 광고비', fmt: 'money2', cls: 'tot' }, { key: 'orders_total', label: '7일 주문', fmt: 'int', cls: 'tot' }, { key: 'roas_total', label: '7일 ROAS', fmt: 'ratio', cls: 'tot' }].concat(dateCols(c.gridDates, 'spend')), { defKey: 'spend_total', sharedHeat: 1 })}</div></div>
        </div></section>

      <section class="block"><h2>검색어 일자별 추이 <span class="sub">(최근 7일 광고비 상위 ${TOP_N}개 · 모든 캠페인 합계)</span></h2>
        <div class="table-card">${seg('stMetric', ST_METRICS, sm[0])}
        <div class="table-scroll">${table('stgrid', c.termTop, [{ key: 'term', label: '검색어', fmt: 'text', left: 1 }, { key: 'flag', label: '판정', fmt: 'text', left: 1 }, { key: `${sm[0]}_total`, label: `7일 ${sm[1]}`, fmt: sm[2], cls: 'tot' }].concat(dateCols(c.gridDates, sm[0])), { defKey: 'spend_total', sharedHeat: sm[3] === 'size' })}</div></div></section>

      <section class="block"><h2>캠페인별 전일 대비 <span class="sub">(${c.prior || '–'} → ${c.base})</span></h2>
        <div class="table-card"><div class="table-scroll">${table('camp', c.campaigns, [{ key: 'name', label: '캠페인', fmt: 'text', left: 1, cls: 'ab', tip: 'campaign' }, { key: 'product', label: '제품', fmt: 'text', left: 1 }, { key: 'spend_prior', label: '광고비 전일', fmt: 'money2' }, { key: 'spend_latest', label: '광고비 기준일', fmt: 'money2' }, { key: 'spend_change', label: '증감', fmt: 'money2' }, { key: 'roas_prior', label: 'ROAS 전일', fmt: 'ratio' }, { key: 'roas_latest', label: 'ROAS 기준일', fmt: 'ratio' }, { key: 'impr_prior', label: '노출 전일', fmt: 'int' }, { key: 'impr_latest', label: '노출 기준일', fmt: 'int' }], { defKey: 'spend_latest' })}</div></div></section>

      <section class="block"><h2>검색어 (최근 7일) <span class="sub">(제외 후보: 주문 0 & 클릭 10회 이상 또는 광고비 $30 이상 · 확장 후보: 클릭 3·주문 2 이상, ROAS 3 이상, EXACT 미등록)</span></h2>
        <div class="table-card"><div class="table-scroll">${table('terms', c.termList, [{ key: 'term', label: '검색어', fmt: 'text', left: 1 }, { key: 'flag', label: '판정', fmt: 'text', left: 1 }, { key: 'product', label: '제품', fmt: 'text', left: 1 }, { key: 'campaign_name', label: '주요 캠페인', fmt: 'text', left: 1, cls: 'ab', tip: 'campaign_full' }, { key: 'spend_total', label: '광고비', fmt: 'money2' }, { key: 'clicks_total', label: '클릭', fmt: 'int' }, { key: 'orders_total', label: '주문', fmt: 'int' }, { key: 'sales_total', label: '매출', fmt: 'money2' }, { key: 'roas_total', label: 'ROAS', fmt: 'ratio' }], { defKey: 'spend_total' })}</div></div></section>

      <div class="dr-grid2">
        <section class="block"><h2>예산 소진율 (SP + SB) <span class="sub">(${c.cLast || '캠페인 목록 없음'} 하루 기준 · 예산은 내보낸 시점 설정값)</span></h2>
          <div class="table-card"><div class="table-scroll">${table('budget', c.budget, [{ key: 'name', label: '캠페인', fmt: 'text', left: 1, cls: 'ab', tip: 'campaign' }, { key: 'type', label: '유형', fmt: 'text', left: 1 }, { key: 'budget', label: '일 예산', fmt: 'money' }, { key: 'spend', label: '광고비', fmt: 'money2' }, { key: 'util', label: '소진율', fmt: 'pct' }, { key: 'roas', label: 'ROAS', fmt: 'ratio' }, { key: 'status', label: '상태', fmt: 'text', left: 1 }], { defKey: 'spend' })}</div></div></section>
        <section class="block"><h2>SP / SB 일별 <span class="sub">(캠페인 목록 기준)</span></h2>
          <div class="table-card"><div class="table-scroll">${table('adtype', c.adType, [{ key: 'date', label: '날짜', fmt: 'text', left: 1 }, { key: 'type', label: '유형', fmt: 'text', left: 1 }, { key: 'spend', label: '광고비', fmt: 'money2' }, { key: 'sales', label: '매출', fmt: 'money2' }, { key: 'roas', label: 'ROAS', fmt: 'ratio' }, { key: 'clicks', label: '클릭', fmt: 'int' }], { defKey: 'date' })}</div></div></section>
      </div>`;
    applyWidths(dash);
  }

  /* ---------------- 시작 ---------------- */
  let initial = 'weekly';
  try { initial = localStorage.getItem('sbsp_view') || 'weekly'; } catch (e) {}
  if (location.hash === '#daily') initial = 'daily';
  setView(initial === 'daily' ? 'daily' : 'weekly');
})();
