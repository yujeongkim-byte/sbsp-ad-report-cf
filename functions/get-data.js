import { loadAllData, json } from './_shared.js';

export async function onRequestGet(context){
  try{
    const data = await loadAllData(context.env.REPORT_DB);
    return json(200, data);
  }catch(err){
    return json(500, { error: '데이터를 불러오지 못했습니다: ' + err.message });
  }
}
