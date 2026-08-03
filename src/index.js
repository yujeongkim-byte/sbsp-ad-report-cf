// Cloudflare Worker (Workers + Static Assets 통합 모델) 진입점.
// /get-data, /upload-data, /reset-data 요청은 이 스크립트가 직접 처리하고,
// 그 외 모든 요청(즉 index.html 등 정적 파일)은 env.ASSETS.fetch(request)로 넘긴다.

function emptyAllData(){
  return { SB: { keyword: [], searchterm: [] }, SP: { keyword: [], searchterm: [] } };
}

function recordKey(r, type){
  return type === 'keyword'
    ? [r.adType, r.dateKey, r.campaign, r.adgroup, r.keyword, r.matchType].join('␟')
    : [r.adType, r.dateKey, r.campaign, r.adgroup, r.keyword, r.matchType, r.searchTerm].join('␟');
}

function mergeRecords(existing, incoming, type){
  const map = new Map();
  (existing || []).forEach(r => map.set(recordKey(r, type), r));
  (incoming || []).forEach(r => map.set(recordKey(r, type), r));
  return [...map.values()];
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
  const row = await db.prepare('SELECT data FROM report_data WHERE id = 1').first();
  if(!row) return emptyAllData();
  try{ return JSON.parse(row.data); }catch(err){ return emptyAllData(); }
}

async function saveAllData(db, allData){
  const text = JSON.stringify(allData);
  await db.prepare(
    'INSERT INTO report_data (id, data) VALUES (1, ?1) ON CONFLICT(id) DO UPDATE SET data = excluded.data'
  ).bind(text).run();
}

async function handleGetData(env){
  try{
    const data = await loadAllData(env.REPORT_DB);
    return json(200, data);
  }catch(err){
    return json(500, { error: '데이터를 불러오지 못했습니다: ' + err.message });
  }
}

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
    const existing = await loadAllData(db);

    for(const b of batches){
      existing[b.adType].keyword = mergeRecords(existing[b.adType].keyword, b.keyword || [], 'keyword');
      existing[b.adType].searchterm = mergeRecords(existing[b.adType].searchterm, b.searchterm || [], 'searchterm');
    }

    await saveAllData(db, existing);

    return json(200, {
      ok: true,
      counts: {
        SB: { keyword: existing.SB.keyword.length, searchterm: existing.SB.searchterm.length },
        SP: { keyword: existing.SP.keyword.length, searchterm: existing.SP.searchterm.length },
      },
    });
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
    await saveAllData(env.REPORT_DB, emptyAllData());
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
