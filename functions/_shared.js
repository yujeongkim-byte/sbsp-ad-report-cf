// Cloudflare Pages Functions용 공용 유틸리티. onRequest*를 export하지 않으므로 별도 라우트가 되지 않고,
// 다른 함수 파일에서 import해서 쓰는 헬퍼 모듈이다.

export function emptyAllData(){
  return { SB: { keyword: [], searchterm: [] }, SP: { keyword: [], searchterm: [] } };
}

// 같은 (광고유형, 날짜, 캠페인, 광고그룹, 키워드, 매치타입[, 검색어]) 조합을 하나의 레코드로 보고,
// 새로 업로드된 데이터가 기존 값을 덮어써서 누적/갱신되도록 한다.
// 프론트엔드(app.js)의 recordKey/mergeRecords와 반드시 동일한 규칙을 유지해야 한다.
export function recordKey(r, type){
  return type === 'keyword'
    ? [r.adType, r.dateKey, r.campaign, r.adgroup, r.keyword, r.matchType].join('␟')
    : [r.adType, r.dateKey, r.campaign, r.adgroup, r.keyword, r.matchType, r.searchTerm].join('␟');
}

export function mergeRecords(existing, incoming, type){
  const map = new Map();
  (existing || []).forEach(r => map.set(recordKey(r, type), r));
  (incoming || []).forEach(r => map.set(recordKey(r, type), r));
  return [...map.values()];
}

export function checkSecret(env, payload){
  const secret = env.UPLOAD_SECRET || '';
  return !!secret && payload && payload.secret === secret;
}

export function json(statusCode, obj){
  return new Response(JSON.stringify(obj), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

// D1은 SQLite 기반의 진짜(강한) 일관성을 가진 데이터베이스라서, Netlify Blobs/Cloudflare KV처럼
// "쓰고 나서 얼마간은 새로고침마다 다른 값이 보일 수 있는" 문제가 없다. report_data 테이블에
// 딱 한 행(id=1)만 두고 그 안에 JSON 전체를 문자열로 저장한다.
export async function loadAllData(db){
  const row = await db.prepare('SELECT data FROM report_data WHERE id = 1').first();
  if(!row) return emptyAllData();
  try{ return JSON.parse(row.data); }catch(err){ return emptyAllData(); }
}

export async function saveAllData(db, allData){
  const text = JSON.stringify(allData);
  await db.prepare(
    'INSERT INTO report_data (id, data) VALUES (1, ?1) ON CONFLICT(id) DO UPDATE SET data = excluded.data'
  ).bind(text).run();
}
