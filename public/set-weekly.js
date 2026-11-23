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
