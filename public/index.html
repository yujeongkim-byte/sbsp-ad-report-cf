/* 세트별 주차 비교 + 세트 x 주차 한눈에 보기 모듈
   index.html 맨 아래에 <script src="/set-weekly.js"></script> 한 줄만 추가하면 동작. 기존 코드는 수정하지 않음. */
(function(){
  if(window.__setWeeklyLoaded) return; window.__setWeeklyLoaded=true;
  function inject(){
    if(document.getElementById('setWeeklySection')) return true;
    const wb=document.getElementById('weeklyBody'); const host=wb&&wb.closest('section'); if(!host) return false;
    host.insertAdjacentHTML('afterend', `    <section class="block" id="setWeeklySection">
      <h2>세트별 주차 비교 <span class="sub" id="setWeeklySub">(세트를 골라 주차/일별 성과를 봅니다)</span></h2>
      <div style="display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;margin-bottom:10px;">
        <div class="toggle-btns" id="setByBtns"><button data-by="campaign" class="active">캠페인 기준</button><button data-by="adgroup">광고그룹 기준</button></div>
        <select id="setWeeklySelect" style="font:inherit;padding:6px 8px;border-radius:8px;border:1px solid var(--border);background:#fff;max-width:480px;"><option value="all">전체 세트</option></select>
        <div class="toggle-btns" id="setUnitBtns"><button data-unit="week" class="active">주별</button><button data-unit="day">일별</button></div>
      </div>
      <div class="table-card">
        <div class="table-scroll">
          <table id="setWeeklyTable">
            <thead><tr>
              <th class="left" id="setWeeklyFirstHeader">주차</th>
              <th>노출수</th><th>클릭수</th><th>CTR</th><th>광고비</th><th>CPC</th><th>매출</th><th>ROAS</th><th>ACOS</th><th>주문수</th><th>CVR</th>
            </tr></thead>
            <tbody id="setWeeklyBody"></tbody>
          </table>
        </div>
      </div>
      <div id="setMatrixBlock" style="margin-top:14px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
          <span style="font-size:13px;font-weight:600;">세트 × 주차 한눈에 보기</span>
          <div class="toggle-btns" id="setMatrixMetricBtns">
            <button data-m="spend" class="active">광고비</button><button data-m="roas">ROAS</button><button data-m="sales">매출</button><button data-m="clicks">클릭수</button>
          </div>
          <span class="sub" style="font-size:11.5px;color:var(--sub);">ROAS 2.0 이상 초록 · 1.5 미만 붉은색 / 최근 8주</span>
        </div>
        <div class="table-card"><div class="table-scroll"><table id="setMatrixTable"></table></div></div>
      </div>
    </section>`);
    return true;
  }
  if(!inject()) return;
let setWeeklyState = { by:'campaign', set:'all', unit:'week', matrixMetric:'spend' };
function setLabelOf(r){
  return setWeeklyState.by==='adgroup' ? `${r.campaign||'-'} \u203a ${r.adgroup||'-'}` : (r.campaign||'-');
}
function renderSetWeekly(){
  const body = document.getElementById('setWeeklyBody');
  if(!body) return;
  const rows = currentKeywordRecords();
  const spendBySet = new Map();
  rows.forEach(r=>{ const k=setLabelOf(r); spendBySet.set(k,(spendBySet.get(k)||0)+r.spend); });
  const names = [...spendBySet.entries()].sort((a,b)=>b[1]-a[1]).map(x=>x[0]);
  if(setWeeklyState.set!=='all' && !spendBySet.has(setWeeklyState.set)) setWeeklyState.set='all';
  const sel = document.getElementById('setWeeklySelect');
  sel.innerHTML = '<option value="all">전체 세트</option>' + names.map(n=>`<option value="${escapeHtml(n)}">${escapeHtml(n)} ($${Math.round(spendBySet.get(n)).toLocaleString('en-US')})</option>`).join('');
  sel.value = setWeeklyState.set;

  const unit = setWeeklyState.unit;
  const bucketFn = unit==='day' ? dayInfo : weekInfo;
  document.getElementById('setWeeklyFirstHeader').textContent = unit==='day' ? '날짜' : '주차';
  document.getElementById('setWeeklySub').textContent = `(${setWeeklyState.set==='all'?'전체 세트':setWeeklyState.set} · ${unit==='day'?'일별':'일~토 주별'}, 전체 기간)`;

  const filtered = setWeeklyState.set==='all' ? rows : rows.filter(r=>setLabelOf(r)===setWeeklyState.set);
  const map = new Map();
  filtered.forEach(r=>{
    const wi = bucketFn(r.dateKey);
    if(!map.has(wi.key)) map.set(wi.key, {label:wi.label, agg:emptyAgg()});
    addInto(map.get(wi.key).agg, r);
  });
  const asc = [...map.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
  const derived = asc.map(([k,v])=>Object.assign({key:k,label:v.label}, derive(Object.assign({}, v.agg))));
  const wow = new Map();
  for(let i=1;i<derived.length;i++){
    const p=derived[i-1], c=derived[i];
    wow.set(c.key,{ spend:p.spend?(c.spend-p.spend)/p.spend*100:null, cpc:p.cpc?(c.cpc-p.cpc)/p.cpc*100:null, roas:p.roas?(c.roas-p.roas)/p.roas*100:null });
  }
  const md = (v,goodUp)=>{
    if(v===null||v===undefined||!isFinite(v)) return '';
    const up=v>=0, cls=goodUp?(up?'good':'bad'):(up?'bad':'good');
    return ` <span class="mini-delta delta ${cls}">${up?'\u25b2':'\u25bc'}${Math.abs(v).toFixed(0)}%</span>`;
  };
  body.innerHTML = derived.slice().reverse().map(w=>{
    const d = wow.get(w.key);
    return `<tr><td class="left weekly-week">${w.label}</td><td>${intFmt(w.impressions)}</td><td>${intFmt(w.clicks)}</td><td>${pctFmt(w.ctr)}</td>`+
      `<td>${usdFmt(w.spend)}${d?md(d.spend,false):''}</td><td>${usdFmt(w.cpc)}${d?md(d.cpc,false):''}</td><td>${usdFmt(w.sales)}</td>`+
      `<td>${roasFmt(w.roas)}${d?md(d.roas,true):''}</td><td>${pctFmt(w.acos)}</td><td>${intFmt(w.orders)}</td><td>${pctFmt(w.cvr)}</td></tr>`;
  }).join('') || '<tr><td colspan="11" class="empty-note">데이터가 없습니다</td></tr>';

  renderSetMatrix(rows, names);
}
function renderSetMatrix(rows, names){
  const block = document.getElementById('setMatrixBlock');
  const table = document.getElementById('setMatrixTable');
  if(!block || !table) return;
  const weeksMap = new Map();
  rows.forEach(r=>{ const w=weekInfo(r.dateKey); if(!weeksMap.has(w.key)) weeksMap.set(w.key,w.label); });
  const weekKeys = [...weeksMap.keys()].sort().slice(-8);
  if(!weekKeys.length){ table.innerHTML=''; return; }
  const cell = new Map(); // set -> week -> agg
  rows.forEach(r=>{
    const wk = weekInfo(r.dateKey).key;
    if(!weekKeys.includes(wk)) return;
    const s = setLabelOf(r);
    if(!cell.has(s)) cell.set(s,new Map());
    const m = cell.get(s);
    if(!m.has(wk)) m.set(wk, emptyAgg());
    addInto(m.get(wk), r);
  });
  const metric = setWeeklyState.matrixMetric;
  const fmtMap = { spend:usdFmt, sales:usdFmt, clicks:intFmt, roas:roasFmt };
  const order = names.filter(n=>cell.has(n));
  const head = '<thead><tr><th class="left">세트</th>' + weekKeys.map(k=>`<th>${escapeHtml(weeksMap.get(k))}</th>`).join('') + '</tr></thead>';
  const bodyHtml = order.map(n=>{
    const tds = weekKeys.map(k=>{
      const a = cell.get(n).get(k);
      if(!a) return '<td style="color:#c4c9d4;">-</td>';
      derive(a);
      let style='';
      if(metric==='roas' && a.spend>0){ style = a.roas>=2 ? 'background:#e8f7ee;' : (a.roas<1.5 ? 'background:#fdecec;' : ''); }
      return `<td style="${style}">${fmtMap[metric](a[metric])}</td>`;
    }).join('');
    const hl = n===setWeeklyState.set ? ' style="background:#f3f7ff;"' : '';
    return `<tr${hl}><td class="left" title="${escapeHtml(n)}" style="max-width:360px;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(n)}</td>${tds}</tr>`;
  }).join('');
  table.innerHTML = head + '<tbody>' + bodyHtml + '</tbody>';
}
document.addEventListener('click', e=>{
  const by = e.target.closest('#setByBtns button');
  if(by){ setWeeklyState.by = by.dataset.by; setWeeklyState.set='all';
    document.querySelectorAll('#setByBtns button').forEach(b=>b.classList.toggle('active', b===by)); renderSetWeekly(); return; }
  const un = e.target.closest('#setUnitBtns button');
  if(un){ setWeeklyState.unit = un.dataset.unit;
    document.querySelectorAll('#setUnitBtns button').forEach(b=>b.classList.toggle('active', b===un)); renderSetWeekly(); return; }
  const mm = e.target.closest('#setMatrixMetricBtns button');
  if(mm){ setWeeklyState.matrixMetric = mm.dataset.m;
    document.querySelectorAll('#setMatrixMetricBtns button').forEach(b=>b.classList.toggle('active', b===mm)); renderSetWeekly(); return; }
});
document.addEventListener('change', e=>{
  if(e.target.id==='setWeeklySelect'){ setWeeklyState.set = e.target.value; renderSetWeekly(); }
});


  const _orig = window.renderWeeklyTable;
  window.renderWeeklyTable = function(rows){ const r=_orig.apply(this, arguments); try{ renderSetWeekly(); }catch(e){ console.warn('setWeekly',e); } return r; };
  try{ renderSetWeekly(); }catch(e){}
})();

/* ===================== 추가 모듈: 제품 x 주차 / 추이 그래프 / 총계 행 숨기기 ===================== */
(function(){
  if(window.__trendLoaded) return; window.__trendLoaded = true;

  /* ---------- 공통 ---------- */
  const ASIN_CODE = { B0DZNT7SWG:'GL30', B0FQN7VN4R:'CR', B0FQMJMKF6:'GL15', B0GR4MNH5R:'BIO', B0GR4G78GL:'MEL30' };
  const CODE_ASIN = {}; Object.keys(ASIN_CODE).forEach(a=>{ CODE_ASIN[ASIN_CODE[a]] = a; });
  const esc = s => String(s==null?'':s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const usd0 = v => '$' + Math.round(v).toLocaleString('en-US');
  const int0 = v => Math.round(v).toLocaleString('en-US');
  const MET = {
    spend:      {l:'광고비(소진)', g:'money', c:'#2563eb', v:a=>a.spend, f:usd0},
    sales:      {l:'매출',        g:'money', c:'#16a34a', v:a=>a.sales, f:usd0},
    cpc:        {l:'CPC',         g:'money', c:'#9333ea', v:a=>a.clicks?a.spend/a.clicks:0, f:v=>'$'+v.toFixed(2)},
    roas:       {l:'ROAS',        g:'x',     c:'#dc2626', v:a=>a.spend?a.sales/a.spend:0, f:v=>v.toFixed(2)+'x'},
    clicks:     {l:'클릭수',      g:'count', c:'#ea580c', v:a=>a.clicks, f:int0},
    impressions:{l:'노출수',      g:'count', c:'#0891b2', v:a=>a.impressions, f:int0},
    orders:     {l:'주문수',      g:'count', c:'#ca8a04', v:a=>a.orders, f:int0},
    acos:       {l:'ACOS',        g:'pct',   c:'#be185d', v:a=>a.sales?a.spend/a.sales:0, f:v=>(v*100).toFixed(0)+'%'},
    ctr:        {l:'CTR',         g:'pct',   c:'#0d9488', v:a=>a.impressions?a.clicks/a.impressions:0, f:v=>(v*100).toFixed(2)+'%'},
    cvr:        {l:'CVR',         g:'pct',   c:'#64748b', v:a=>a.clicks?a.orders/a.clicks:0, f:v=>(v*100).toFixed(1)+'%'}
  };
  const MET_ORDER = ['spend','sales','roas','cpc','clicks','impressions','orders','acos','ctr','cvr'];
  const newAgg = () => ({impressions:0, clicks:0, spend:0, sales:0, orders:0});
  const addAgg = (a, r) => { a.impressions+=r.impressions||0; a.clicks+=r.clicks||0; a.spend+=r.spend||0; a.sales+=r.sales||0; a.orders+=r.orders||0; };

  const style = document.createElement('style');
  style.textContent = `
    .tr-ctl{ display:flex; flex-wrap:wrap; gap:10px 14px; align-items:center; margin-bottom:10px; }
    .tr-ctl select{ font:inherit; padding:6px 8px; border-radius:8px; border:1px solid var(--border,#e3e7ee); background:#fff; max-width:420px; }
    .tr-chip{ display:inline-flex; align-items:center; gap:5px; padding:4px 10px; border:1px solid var(--border,#e3e7ee); border-radius:999px; font-size:12.5px; cursor:pointer; background:#fff; user-select:none; }
    .tr-chip i{ width:10px; height:10px; border-radius:2px; display:inline-block; }
    .tr-chip input{ margin:0; }
    .tr-chip.on{ border-color:#2563eb; background:#f3f7ff; }
    .tr-chartwrap{ position:relative; background:#fff; border:1px solid var(--border,#e3e7ee); border-radius:12px; padding:10px 8px 4px; }
    .tr-tip{ position:absolute; pointer-events:none; background:#fff; border:1px solid #e3e7ee; border-radius:8px; box-shadow:0 6px 18px rgba(0,0,0,.1); padding:6px 10px; font-size:12px; white-space:nowrap; z-index:5; display:none; }
    .tr-note{ font-size:11.5px; color:var(--sub,#6b7280); margin:4px 2px 0; }
    #kwTable.kw-hide-totals .kw-group-total{ display:none; }
    .tr-hidechk{ display:inline-flex; align-items:center; gap:5px; font-size:12.5px; margin-left:8px; cursor:pointer; }
  `;
  document.head.appendChild(style);

  /* ---------- 1) 키워드 성과: 총계 행 숨기기 ---------- */
  (function(){
    const kw = document.getElementById('kwTable'); const s = document.getElementById('kwSearch');
    if(!kw || !s || document.getElementById('kwHideTotals')) return;
    const tb = s.closest('.table-toolbar') || s.parentNode;
    const lab = document.createElement('label'); lab.className = 'tr-hidechk';
    lab.innerHTML = '<input type="checkbox" id="kwHideTotals"> 총계 행 숨기기';
    tb.appendChild(lab);
    lab.querySelector('input').addEventListener('change', e=> kw.classList.toggle('kw-hide-totals', e.target.checked));
  })();

  /* ---------- 2) 추이 그래프 (공용 팩토리) ---------- */
  function drawChart(wrap, labels, series, normalized){
    const W=1000, H=320, padL=66, padR=66, padT=16, padB=34;
    const plotW=W-padL-padR, plotH=H-padT-padB, n=labels.length;
    const groups = [...new Set(series.map(s=>MET[s.k].g))];
    const axes = groups.map(g=>{
      const ss = series.filter(s=>MET[s.k].g===g);
      const mx = Math.max(...ss.map(s=>Math.max(...s.values, 0)), 0) || 1;
      return {g, max:mx*1.1, fmt:MET[ss[0].k].f};
    });
    const axisOf = s => normalized ? null : axes[groups.indexOf(MET[s.k].g)];
    const sMax = s => (Math.max(...s.values,0) || 1) * 1.1;
    const xAt = i => padL + (n>1 ? plotW*i/(n-1) : plotW/2);
    const yAt = (s,v) => padT + plotH - plotH * (v / (normalized ? sMax(s) : axisOf(s).max));
    let grid='', labelsL='', labelsR='';
    for(let t=0;t<=4;t++){
      const y = padT + plotH*t/4;
      grid += `<line x1="${padL}" y1="${y}" x2="${W-padR}" y2="${y}" stroke="#eef0f4"/>`;
      if(normalized){ labelsL += `<text x="${padL-8}" y="${y+4}" font-size="11" fill="#6b7280" text-anchor="end">${100-25*t}%</text>`; }
      else{
        labelsL += `<text x="${padL-8}" y="${y+4}" font-size="11" fill="#6b7280" text-anchor="end">${axes[0].fmt(axes[0].max*(1-t/4))}</text>`;
        if(axes[1]) labelsR += `<text x="${W-padR+8}" y="${y+4}" font-size="11" fill="#6b7280" text-anchor="start">${axes[1].fmt(axes[1].max*(1-t/4))}</text>`;
      }
    }
    let xl=''; const every = Math.max(1, Math.ceil(n/10));
    for(let i=0;i<n;i+=every) xl += `<text x="${xAt(i)}" y="${H-10}" font-size="10.5" fill="#6b7280" text-anchor="middle">${esc(labels[i])}</text>`;
    let lines='';
    series.forEach(s=>{
      const pts = s.values.map((v,i)=>`${xAt(i).toFixed(1)},${yAt(s,v).toFixed(1)}`).join(' ');
      lines += `<polyline points="${pts}" fill="none" stroke="${MET[s.k].c}" stroke-width="2.4"/>`;
      s.values.forEach((v,i)=>{ lines += `<circle cx="${xAt(i).toFixed(1)}" cy="${yAt(s,v).toFixed(1)}" r="2.8" fill="${MET[s.k].c}"/>`; });
    });
    wrap.innerHTML = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;display:block;">${grid}
      <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT+plotH}" stroke="#d1d5db"/>
      <line x1="${padL}" y1="${padT+plotH}" x2="${W-padR}" y2="${padT+plotH}" stroke="#d1d5db"/>
      ${axes[1]&&!normalized?`<line x1="${W-padR}" y1="${padT}" x2="${W-padR}" y2="${padT+plotH}" stroke="#d1d5db"/>`:''}
      ${lines}${labelsL}${labelsR}${xl}
      <line class="tr-guide" x1="0" y1="${padT}" x2="0" y2="${padT+plotH}" stroke="#9ca3af" stroke-dasharray="3 3" style="display:none"/>
    </svg><div class="tr-tip"></div>`;
    const svg = wrap.querySelector('svg'), tip = wrap.querySelector('.tr-tip'), guide = wrap.querySelector('.tr-guide');
    svg.addEventListener('mousemove', e=>{
      const rect = svg.getBoundingClientRect();
      const x = (e.clientX-rect.left)/rect.width*W;
      let i = n>1 ? Math.round((x-padL)/plotW*(n-1)) : 0; i = Math.max(0, Math.min(n-1, i));
      guide.setAttribute('x1', xAt(i)); guide.setAttribute('x2', xAt(i)); guide.style.display='';
      tip.innerHTML = `<div style="color:#6b7280;margin-bottom:2px;">${esc(labels[i])}</div>` + series.map(s=>`<div><i style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${MET[s.k].c};margin-right:5px;"></i>${MET[s.k].l}: <b>${MET[s.k].f(s.values[i])}</b></div>`).join('');
      tip.style.display='block';
      const wr = wrap.getBoundingClientRect();
      let left = e.clientX-wr.left+14; if(left > wr.width-190) left = e.clientX-wr.left-190;
      tip.style.left = left+'px'; tip.style.top = Math.max(4, e.clientY-wr.top-10)+'px';
    });
    svg.addEventListener('mouseleave', ()=>{ tip.style.display='none'; guide.style.display='none'; });
  }

  function makeTrend(mount, cfg){
    const st = { by:'product', item:'all', unit:cfg.units[0], range:cfg.defaultRange||30, metrics:new Set(['spend','roas']) };
    mount.innerHTML = `
      <div class="tr-ctl">
        <select class="by"><option value="product">제품별</option><option value="campaign">세트(캠페인)별</option><option value="adgroup">세트(광고그룹)별</option></select>
        <select class="item"><option value="all">전체</option></select>
        ${cfg.units.length>1 ? '<div class="toggle-btns unit"><button data-unit="week" class="active">주별</button><button data-unit="day">일별</button></div>' : ''}
        ${cfg.ranges ? '<select class="range">'+cfg.ranges.map(r=>`<option value="${r[0]}"${r[0]==st.range?' selected':''}>${r[1]}</option>`).join('')+'</select>' : ''}
      </div>
      <div class="tr-ctl metrics">${MET_ORDER.map(k=>`<label class="tr-chip${st.metrics.has(k)?' on':''}"><input type="checkbox" data-m="${k}"${st.metrics.has(k)?' checked':''}><i style="background:${MET[k].c}"></i>${MET[k].l}</label>`).join('')}</div>
      <div class="tr-chartwrap"><div class="chart"></div></div>
      <div class="tr-note"></div>`;
    const q = s => mount.querySelector(s);
    const labelOf = r => st.by==='product' ? (r.product||'기타') : st.by==='adgroup' ? `${r.campaign||'-'} › ${r.adgroup||'-'}` : (r.campaign||'-');

    function render(){
      const rows = cfg.getRows();
      const spendBy = new Map();
      rows.forEach(r=>{ const k=labelOf(r); spendBy.set(k,(spendBy.get(k)||0)+(r.spend||0)); });
      const names = [...spendBy.entries()].sort((a,b)=>b[1]-a[1]).map(x=>x[0]);
      if(st.item!=='all' && !spendBy.has(st.item)) st.item='all';
      const sel = q('.item');
      sel.innerHTML = '<option value="all">전체</option>' + names.map(n=>`<option value="${esc(n)}">${esc(n)} (${usd0(spendBy.get(n))})</option>`).join('');
      sel.value = st.item;
      let use = st.item==='all' ? rows : rows.filter(r=>labelOf(r)===st.item);
      const bucket = st.unit==='day' ? dayInfo : weekInfo;
      const map = new Map();
      use.forEach(r=>{ const b=bucket(r.dateKey); if(!map.has(b.key)) map.set(b.key,{label:b.label, agg:newAgg()}); addAgg(map.get(b.key).agg, r); });
      let keys = [...map.keys()].sort();
      if(st.unit==='day' && st.range!=='all') keys = keys.slice(-Number(st.range));
      const chart = q('.chart'), note = q('.tr-note');
      if(!keys.length){ chart.innerHTML = '<div style="padding:30px;text-align:center;color:#6b7280;font-size:13px;">데이터가 없습니다</div>'; note.textContent=''; return; }
      const labels = keys.map(k=>{ const l=map.get(k).label; return st.unit==='week' ? String(l).split('~')[0] : l; });
      const sel2 = MET_ORDER.filter(k=>st.metrics.has(k));
      const series = sel2.map(k=>({k, values: keys.map(key=>MET[k].v(map.get(key).agg))}));
      const groups = new Set(sel2.map(k=>MET[k].g));
      drawChart(chart, labels, series, groups.size>2);
      note.textContent = (groups.size>2 ? '※ 단위가 3종류 이상 섞여 각 지표를 자기 최대값 기준(100%)으로 맞춰 그렸습니다. 실제 값은 마우스를 올리면 보입니다. ' : (groups.size===2 ? '※ 왼쪽/오른쪽 축이 서로 다른 단위입니다. ' : '')) + (cfg.note||'');
    }
    q('.by').addEventListener('change', e=>{ st.by=e.target.value; st.item='all'; render(); });
    q('.item').addEventListener('change', e=>{ st.item=e.target.value; render(); });
    const rg = q('.range'); if(rg) rg.addEventListener('change', e=>{ st.range=e.target.value; render(); });
    const un = q('.unit'); if(un) un.addEventListener('click', e=>{ const b=e.target.closest('button'); if(!b) return; st.unit=b.dataset.unit; un.querySelectorAll('button').forEach(x=>x.classList.toggle('active', x===b)); render(); });
    q('.metrics').addEventListener('change', e=>{
      const k = e.target.dataset.m; if(!k) return;
      if(e.target.checked) st.metrics.add(k); else st.metrics.delete(k);
      if(!st.metrics.size){ st.metrics.add(k); e.target.checked = true; }
      mount.querySelectorAll('.metrics .tr-chip').forEach(l=> l.classList.toggle('on', l.querySelector('input').checked));
      render();
    });
    return { render };
  }

  /* ---------- 3) 주간 리포트: 제품 x 주차 + 추이 그래프 ---------- */
  const anchorSec = document.getElementById('setWeeklySection') || (document.getElementById('weeklyBody') && document.getElementById('weeklyBody').closest('section'));
  let weeklyTrend = null, renderProductMatrix = ()=>{};
  if(anchorSec && !document.getElementById('productWeekSection')){
    anchorSec.insertAdjacentHTML('afterend', `
    <section class="block" id="productWeekSection">
      <h2>제품(ASIN) × 주차 한눈에 보기 <span class="sub">(최근 8주 · 일~토)</span></h2>
      <div class="tr-ctl"><div class="toggle-btns" id="prodMetricBtns">
        <button data-m="spend" class="active">광고비</button><button data-m="roas">ROAS</button><button data-m="sales">매출</button><button data-m="clicks">클릭수</button>
      </div><span class="tr-note" style="margin:0">ROAS 2.0 이상 초록 · 1.5 미만 붉은색</span></div>
      <div class="table-card"><div class="table-scroll"><table id="prodMatrixTable"></table></div></div>
    </section>
    <section class="block" id="weeklyTrendSection">
      <h2>추이 그래프 <span class="sub">(세트별 / 제품별 · 지표 선택)</span></h2>
      <div id="weeklyTrendMount"></div>
    </section>`);
    let pm = 'spend';
    renderProductMatrix = function(){
      const table = document.getElementById('prodMatrixTable'); if(!table) return;
      const rows = currentKeywordRecords();
      const wk = new Map(); rows.forEach(r=>{ const w=weekInfo(r.dateKey); if(!wk.has(w.key)) wk.set(w.key,w.label); });
      const keys = [...wk.keys()].sort().slice(-8);
      if(!keys.length){ table.innerHTML=''; return; }
      const cell = new Map(), tot = new Map();
      rows.forEach(r=>{
        const w = weekInfo(r.dateKey).key; if(!keys.includes(w)) return;
        const p = r.product || '기타';
        if(!cell.has(p)) cell.set(p,new Map());
        const m = cell.get(p); if(!m.has(w)) m.set(w,newAgg()); addAgg(m.get(w), r);
        tot.set(p,(tot.get(p)||0)+(r.spend||0));
      });
      const order = [...tot.entries()].sort((a,b)=>b[1]-a[1]).map(x=>x[0]);
      const f = MET[pm].f;
      const head = '<thead><tr><th class="left">제품</th>' + keys.map(k=>`<th>${esc(wk.get(k))}</th>`).join('') + '</tr></thead>';
      const body = order.map(p=>{
        const asin = CODE_ASIN[p] ? ` <span style="color:#9ca3af;font-size:11px;">${CODE_ASIN[p]}</span>` : '';
        const tds = keys.map(k=>{
          const a = cell.get(p).get(k); if(!a) return '<td style="color:#c4c9d4;">-</td>';
          let st=''; if(pm==='roas' && a.spend>0){ const v=MET.roas.v(a); st = v>=2 ? 'background:#e8f7ee;' : (v<1.5 ? 'background:#fdecec;' : ''); }
          return `<td style="${st}">${f(MET[pm].v(a))}</td>`;
        }).join('');
        return `<tr><td class="left">${esc(p)}${asin}</td>${tds}</tr>`;
      }).join('');
      table.innerHTML = head + '<tbody>' + body + '</tbody>';
    };
    document.getElementById('prodMetricBtns').addEventListener('click', e=>{
      const b = e.target.closest('button'); if(!b) return; pm = b.dataset.m;
      document.querySelectorAll('#prodMetricBtns button').forEach(x=>x.classList.toggle('active', x===b)); renderProductMatrix();
    });
    weeklyTrend = makeTrend(document.getElementById('weeklyTrendMount'), {
      units:['week','day'], ranges:null, getRows:()=>currentKeywordRecords(),
      note:'현재 위 필터(광고 유형/기간 등)가 적용된 데이터 기준입니다.'
    });
    const _prev = window.renderWeeklyTable;
    window.renderWeeklyTable = function(rows){
      const r = _prev.apply(this, arguments);
      try{ renderProductMatrix(); weeklyTrend.render(); }catch(e){ console.warn('trend', e); }
      return r;
    };
    try{ renderProductMatrix(); weeklyTrend.render(); }catch(e){}
  }

  /* ---------- 4) 데일리 탭: 추이 그래프 ---------- */
  let dailyRows = [], dailyTrend = null, dailyLoading = false;
  const asinOf = c => (String(c||'').split(/[^A-Za-z0-9]+/).find(p=>/^B0[A-Z0-9]{8}$/i.test(p))||'').toUpperCase();
  const productOf = c => { const a=asinOf(c); if(a) return ASIN_CODE[a]||a; return /bundle/i.test(c)?'Bundle':'기타'; };
  async function loadDaily(){
    if(dailyLoading) return; dailyLoading = true;
    try{
      const res = await fetch('/daily-data?days=120', {cache:'no-store'}); const body = await res.json();
      const out = [];
      (body.days||[]).forEach(d=>{ if(d.kind==='sp_targeting') d.rows.forEach(x=> out.push({dateKey:d.date, campaign:x.campaign, adgroup:x.adgroup, product:productOf(x.campaign), impressions:x.impr||0, clicks:x.clicks||0, spend:x.spend||0, sales:x.sales||0, orders:x.orders||0})); });
      dailyRows = out; if(dailyTrend) dailyTrend.render();
    }catch(e){ console.warn('daily trend', e); }
    finally{ dailyLoading = false; }
  }
  function mountDaily(){
    const dash = document.getElementById('drDash'); if(!dash || document.getElementById('dailyTrendBox')) return !!document.getElementById('dailyTrendBox');
    dash.insertAdjacentHTML('beforebegin', `<details id="dailyTrendBox" open style="margin-bottom:18px;"><summary style="cursor:pointer;font-size:16px;font-weight:700;margin-bottom:10px;">추이 그래프 <span style="font-size:12px;font-weight:400;color:#6b7280;">(세트별 / 제품별 · 지표 선택, SP 타겟팅 일별 데이터)</span></summary><div id="dailyTrendMount"></div></details>`);
    dailyTrend = makeTrend(document.getElementById('dailyTrendMount'), {
      units:['day'], ranges:[[14,'최근 14일'],[30,'최근 30일'],[60,'최근 60일'],['all','전체']], defaultRange:30,
      getRows:()=>dailyRows, note:'데일리 리포트에 올린 SP 타겟팅 데이터 기준입니다(SB 제외).'
    });
    dailyTrend.render(); loadDaily();
    new MutationObserver(()=>{ if(document.body.classList.contains('dr-daily')) loadDaily(); }).observe(document.body, {attributes:true, attributeFilter:['class']});
    return true;
  }
  let tries = 0; (function wait(){ if(mountDaily() || ++tries > 40) return; setTimeout(wait, 250); })();
})();
