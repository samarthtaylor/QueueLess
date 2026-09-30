PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO users (user_id, name, email, password_hash, role) VALUES
  (1, 'Alex Rivera', 'alex.rivera@example.test', NULL, 'citizen'),
  (2, 'QueueLess Admin', 'admin@queueless.demo', NULL, 'admin');

INSERT OR IGNORE INTO services (service_id, service_name, description, average_service_time, status) VALUES
  (1, 'Document Verification', 'Verify identity and supporting documents', 12, 'active'),
  (2, 'Certificate Application', 'Birth, residence and income certificates', 18, 'active'),
  (3, 'Address Update', 'Update your registered residential address', 9, 'active'),
  (4, 'ID Services', 'New ID, renewal and information updates', 22, 'active'),
  (5, 'Application Submission', 'Submit and track public service applications', 15, 'active');

INSERT OR IGNORE INTO queue (service_id, user_id, token_number, status, counter_number, joined_at) VALUES
  (1, 1, 'A-042', 'waiting', NULL, '2026-09-30 10:04:00'),
  (1, NULL, 'A-043', 'called', 2, '2026-09-30 10:07:00'),
  (2, NULL, 'B-018', 'waiting', NULL, '2026-09-30 10:12:00'),
  (4, NULL, 'D-031', 'in_service', 4, '2026-09-30 09:52:00');

INSERT INTO queue_history (service_id, queue_size, waiting_time, counter_count, recorded_at) VALUES
  (1, 18, 14, 4, '2026-09-30 10:00:00'), (1, 22, 18, 4, '2026-09-29 11:00:00'),
  (2, 26, 24, 3, '2026-09-30 10:00:00'), (3, 8, 9, 2, '2026-09-30 10:00:00'),
  (4, 31, 29, 4, '2026-09-30 10:00:00'), (5, 14, 15, 3, '2026-09-30 10:00:00');

INSERT INTO predictions (service_id, predicted_wait_time, confidence, recommended_start, recommended_end) VALUES
  (1, 14, 0.87, '2026-09-30 10:30:00', '2026-09-30 11:15:00'),
  (2, 24, 0.81, '2026-09-30 13:15:00', '2026-09-30 14:00:00');
