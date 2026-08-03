import { emptyAllData, saveAllData, checkSecret, json } from './_shared.js';

export async function onRequestPost(context){
  let payload;
  try{
    payload = await context.request.json();
  }catch(err){
    return json(400, { error: '잘못된 요청 형식입니다 (JSON 파싱 실패)' });
  }

  if(!checkSecret(context.env, payload)){
    return json(401, { error: '비밀번호가 올바르지 않습니다' });
  }

  try{
    await saveAllData(context.env.REPORT_DB, emptyAllData());
    return json(200, { ok: true });
  }catch(err){
    return json(500, { error: '초기화 중 오류가 발생했습니다: ' + err.message });
  }
}
