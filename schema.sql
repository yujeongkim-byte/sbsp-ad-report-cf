-- D1 대시보드 콘솔에서 딱 한 번만 실행하면 됩니다.
CREATE TABLE IF NOT EXISTS report_data (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data TEXT NOT NULL
);
