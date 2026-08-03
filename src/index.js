// Cloudflare Worker (Workers + Static Assets 통합 모델) 진입점.
// /get-data, /upload-data, /reset-data 요청은 이 스크립트가 직접 처리하고,
// 그 외 모든 요청(즉 index.html 등 정적 파일)은 env.ASSETS.fetch(request)로 넘긴다.
//
// 저장 방식: "한 행에 전체 JSON 통짜로 저장"이 아니라, 레코드 하나당 테이블의 행 하나로 저장한다.
// (D1은 한 문자열/BLOB당 최대 2MB 제한이 있어서, 데이터가 계속 쌓이면 통짜 JSON 방식은 언젠가 한도를 넘긴다.
//  레코드별로 나눠 저장하면 이 한도에 절대 걸리지 않고, 매주 계속 누적해도 문제없다.)

function emptyAllData(){
  return { SB: { keyword: [], searchterm: [] }, SP: { keyword: [], searchterm: [] } };
}

// 같은 (광고유형, 날짜, 캠페인, 광고그룹, 키워드, 매치타입[, 검색어]) 조합을 하나의 레코드로 보고,
// 새로 업로드된 데이터가 기존 값을 덮어써서 누적/갱신되도록 한다.
// 프론트엔드(index.html)의 recordKey/mergeRecords와 반드시 동일한 규칙을 유지해야 한다.
function recordKey(r, type){
  return type === 'keyword'
    ? [r.adType, r.dateKey, r.campaign, r.adgroup, r.keyword, r.matchType].join('␟')
    : [r.adType, r.dateKey, r.campaign, r.adgroup, r.keyword, r.matchType, r.searchTerm].join('␟');
}

function checkSecret(env, payload){
  const secret = env.UPLOAD_SECRET || '';
  return !!secret && payload && payload.secret === secret;
}

function json(statusCode, obj){
  return new Response(JSON.stringify(obj), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

async function loadAllData(db){
  const { results } = await db.prepare('SELECT ad_type, rec_type, data FROM records').all();
  const out = emptyAllData();
  for(const row of (results || [])){
    try{
      out[row.ad_type][row.rec_type].push(JSON.parse(row.data));
    }catch(err){ /* 손상된 행은 건너뜀 */ }
  }
  return out;
}

async function countAllData(db){
  const { results } = await db.prepare(
    'SELECT ad_type, rec_type, COUNT(*) as cnt FROM records GROUP BY ad_type, rec_type'
  ).all();
  const counts = { SB: { keyword: 0, searchterm: 0 }, SP: { keyword: 0, searchterm: 0 } };
  for(const row of (results || [])){
    if(counts[row.ad_type]) counts[row.ad_type][row.rec_type] = row.cnt;
  }
  return counts;
}

// D1 batch() 한 번에 너무 많은 statement를 넣지 않도록 청크 단위로 나눠서 실행한다
// (한 번에 수천 개를 넣어도 동작은 하지만, 여유 있게 안전한 크기로 나눠서 호출한다).
const BATCH_CHUNK_SIZE = 300;

function chunk(arr, size){
  const out = [];
  for(let i=0; i<arr.length; i+=size) out.push(arr.slice(i, i+size));
  return out;
}

// records: adType이 이미 각 레코드 안에 들어있는 배열. 레코드 단위로 upsert(있으면 갱신, 없으면 삽입)한다.
async function upsertRecords(db, adType, recType, records){
  if(!records || !records.length) return;
  const stmts = records.map(r => {
    const key = recordKey(r, recType);
    return db.prepare(
      'INSERT INTO records (key, ad_type, rec_type, data) VALUES (?1, ?2, ?3, ?4) ' +
      'ON CONFLICT(key) DO UPDATE SET data = excluded.data'
    ).bind(key, adType, recType, JSON.stringify(r));
  });
  for(const part of chunk(stmts, BATCH_CHUNK_SIZE)){
    await db.batch(part);
  }
}

async function handleGetData(env){
  try{
    const data = await loadAllData(env.REPORT_DB);
    return json(200, data);
  }catch(err){
    return json(500, { error: '데이터를 불러오지 못했습니다: ' + err.message });
  }
}

// 요청 바디: { secret, batches: [ { adType:'SB'|'SP', keyword:[...], searchterm:[...] }, ... ] }
async function handleUploadData(request, env){
  let payload;
  try{
    payload = await request.json();
  }catch(err){
    return json(400, { error: '잘못된 요청 형식입니다 (JSON 파싱 실패)' });
  }

  if(!checkSecret(env, payload)){
    return json(401, { error: '업로드 비밀번호가 올바르지 않습니다. Cloudflare 환경변수 UPLOAD_SECRET 설정을 확인해주세요.' });
  }

  const batches = Array.isArray(payload.batches) ? payload.batches
    : (payload.adType ? [{ adType: payload.adType, keyword: payload.keyword, searchterm: payload.searchterm }] : []);

  for(const b of batches){
    if(b.adType !== 'SB' && b.adType !== 'SP'){
      return json(400, { error: "adType은 'SB' 또는 'SP'여야 합니다" });
    }
  }
  if(!batches.length){
    return json(400, { error: '업로드할 데이터가 없습니다' });
  }

  try{
    const db = env.REPORT_DB;
    for(const b of batches){
      await upsertRecords(db, b.adType, 'keyword', b.keyword || []);
      await upsertRecords(db, b.adType, 'searchterm', b.searchterm || []);
    }
    const counts = await countAllData(db);
    return json(200, { ok: true, counts });
  }catch(err){
    return json(500, { error: '저장 중 오류가 발생했습니다: ' + err.message });
  }
}

async function handleResetData(request, env){
  let payload;
  try{
    payload = await request.json();
  }catch(err){
    return json(400, { error: '잘못된 요청 형식입니다 (JSON 파싱 실패)' });
  }

  if(!checkSecret(env, payload)){
    return json(401, { error: '비밀번호가 올바르지 않습니다' });
  }

  try{
    await env.REPORT_DB.prepare('DELETE FROM records').run();
    return json(200, { ok: true });
  }catch(err){
    return json(500, { error: '초기화 중 오류가 발생했습니다: ' + err.message });
  }
}

export default {
  async fetch(request, env){
    const url = new URL(request.url);

    if(url.pathname === '/get-data' && request.method === 'GET'){
      return handleGetData(env);
    }
    if(url.pathname === '/upload-data' && request.method === 'POST'){
      return handleUploadData(request, env);
    }
    if(url.pathname === '/reset-data' && request.method === 'POST'){
      return handleResetData(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
