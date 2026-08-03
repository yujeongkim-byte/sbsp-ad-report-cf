import { loadAllData, saveAllData, mergeRecords, checkSecret, json } from './_shared.js';

// 요청 바디: { secret, batches: [ { adType:'SB'|'SP', keyword:[...], searchterm:[...] }, ... ] }
// 한 번의 업로드에 SB/SP가 섞여 있어도 반드시 한 번의 읽기-수정-쓰기로 전부 처리한다.
export async function onRequestPost(context){
  let payload;
  try{
    payload = await context.request.json();
  }catch(err){
    return json(400, { error: '잘못된 요청 형식입니다 (JSON 파싱 실패)' });
  }

  if(!checkSecret(context.env, payload)){
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
    const db = context.env.REPORT_DB;
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
