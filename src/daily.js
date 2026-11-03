// 데일리 리포트 전용 API (/daily-data, /daily-upload, /daily-reset)
// 주간 리포트(get-data / upload-data / reset-data)와 완전히 분리된 D1 테이블 daily_ad_days만 사용한다.
// 한 행 = (데이터 종류, 날짜) 하루치 전체. 같은 날짜를 다시 올리면 그 날짜만 통째로 교체된다 → 누적.

const KINDS = new Set(['sp_targeting', 'sp_searchterm', 'campaign']);
const MAX_DAYS_PER_REQUEST = 40;

const SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS daily_ad_days (
  kind TEXT NOT NULL,
  date TEXT NOT NULL,
  data TEXT NOT NULL,
  row_count INTEGER NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (kind, date)
)`;

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function shiftDate(dateKey, n) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const x = new Date(Date.UTC(y, m - 1, d) + n * 86400000);
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}-${String(x.getUTCDate()).padStart(2, '0')}`;
}

async function readAuthed(request, env) {
  let body;
  try { body = await request.json(); } catch { return { error: json({ error: '요청 형식이 올바르지 않습니다.' }, 400) }; }
  if (!env.UPLOAD_SECRET) return { error: json({ error: '서버에 UPLOAD_SECRET이 설정되어 있지 않습니다.' }, 500) };
  if (!body || body.secret !== env.UPLOAD_SECRET) return { error: json({ error: '업로드 비밀번호가 올바르지 않습니다.' }, 401) };
  return { body };
}

async function getData(request, db) {
  await db.prepare(SCHEMA_SQL).run();
  const url = new URL(request.url);
  let days = parseInt(url.searchParams.get('days') || '120', 10);
  if (!(days > 0)) days = 120;
  days = Math.min(days, 400);

  const max = await db.prepare('SELECT MAX(date) AS d FROM daily_ad_days').first();
  if (!max || !max.d) return json({ latest: null, days: [] });

  const { results } = await db
    .prepare('SELECT kind, date, data, updated_at FROM daily_ad_days WHERE date >= ?1 ORDER BY date')
    .bind(shiftDate(max.d, -(days - 1)))
    .all();
  return json({
    latest: max.d,
    days: (results || []).map((r) => ({ kind: r.kind, date: r.date, updatedAt: r.updated_at, rows: JSON.parse(r.data) })),
  });
}

async function upload(request, env, db) {
  const { body, error } = await readAuthed(request, env);
  if (error) return error;
  const days = Array.isArray(body.days) ? body.days : [];
  if (!days.length) return json({ error: '업로드할 데이터가 없습니다.' }, 400);
  if (days.length > MAX_DAYS_PER_REQUEST) return json({ error: `한 번에 ${MAX_DAYS_PER_REQUEST}개 날짜·종류까지만 보낼 수 있습니다.` }, 400);

  const now = new Date().toISOString();
  const seen = new Set();
  const stmts = [];
  for (const d of days) {
    if (!d || !KINDS.has(d.kind) || !/^\d{4}-\d{2}-\d{2}$/.test(d.date || '') || !Array.isArray(d.rows)) {
      return json({ error: '데이터 형식이 올바르지 않습니다.' }, 400);
    }
    const key = `${d.kind}|${d.date}`;
    if (seen.has(key)) return json({ error: `같은 날짜·종류가 중복되었습니다: ${key}` }, 400);
    seen.add(key);
    const data = JSON.stringify(d.rows);
    if (data.length > 1800000) return json({ error: `${d.date} ${d.kind} 데이터가 너무 큽니다.` }, 413);
    stmts.push(
      db.prepare('INSERT OR REPLACE INTO daily_ad_days (kind, date, data, row_count, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)')
        .bind(d.kind, d.date, data, d.rows.length, now)
    );
  }
  await db.prepare(SCHEMA_SQL).run();
  await db.batch(stmts);
  return json({ ok: true, saved: days.map((d) => ({ kind: d.kind, date: d.date, rows: d.rows.length })) });
}

async function reset(request, env, db) {
  const { error } = await readAuthed(request, env);
  if (error) return error;
  await db.prepare(SCHEMA_SQL).run();
  await db.prepare('DELETE FROM daily_ad_days').run();
  return json({ ok: true });
}

// 데일리 경로면 Response를, 아니면 null을 돌려준다 (null이면 기존 코드가 그대로 처리).
export async function handleDaily(request, env) {
  const { pathname } = new URL(request.url);
  if (!pathname.startsWith('/daily-')) return null;
  const db = env.REPORT_DB;
  if (!db) return json({ error: 'REPORT_DB 바인딩을 찾지 못했습니다.' }, 500);
  try {
    if (pathname === '/daily-data' && request.method === 'GET') return await getData(request, db);
    if (pathname === '/daily-upload' && request.method === 'POST') return await upload(request, env, db);
    if (pathname === '/daily-reset' && request.method === 'POST') return await reset(request, env, db);
  } catch (err) {
    return json({ error: '서버 오류: ' + (err && err.message ? err.message : String(err)) }, 500);
  }
  return null;
}
