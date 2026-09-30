PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'citizen' CHECK (role IN ('citizen', 'admin', 'staff')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS services (
  service_id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  average_service_time INTEGER NOT NULL CHECK (average_service_time > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'closed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS queue (
  queue_id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_id INTEGER NOT NULL,
  user_id INTEGER,
  token_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'called', 'in_service', 'completed', 'cancelled')),
  counter_number INTEGER,
  joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  called_at TEXT,
  completed_at TEXT,
  FOREIGN KEY (service_id) REFERENCES services(service_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS queue_history (
  history_id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_id INTEGER NOT NULL,
  queue_size INTEGER NOT NULL CHECK (queue_size >= 0),
  waiting_time INTEGER NOT NULL CHECK (waiting_time >= 0),
  counter_count INTEGER NOT NULL CHECK (counter_count >= 0),
  recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (service_id) REFERENCES services(service_id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS predictions (
  prediction_id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_id INTEGER NOT NULL,
  predicted_wait_time INTEGER NOT NULL CHECK (predicted_wait_time >= 0),
  confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  prediction_time TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  recommended_start TEXT,
  recommended_end TEXT,
  FOREIGN KEY (service_id) REFERENCES services(service_id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_queue_service_status ON queue(service_id, status);
CREATE INDEX IF NOT EXISTS idx_queue_joined_at ON queue(joined_at);
CREATE INDEX IF NOT EXISTS idx_queue_history_service_time ON queue_history(service_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_predictions_service_time ON predictions(service_id, prediction_time);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
