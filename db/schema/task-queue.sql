-- Task Queue Table
CREATE TABLE IF NOT EXISTS task_queue (
  id UUID PRIMARY KEY,
  type TEXT NOT NULL,
  params JSONB NOT NULL,
  status TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt TIMESTAMP WITH TIME ZONE,
  error TEXT,
  version_id UUID NOT NULL REFERENCES versions(id),
  controller_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);

-- Indexes for Task Queue
CREATE INDEX IF NOT EXISTS idx_task_queue_version_id ON task_queue(version_id);
CREATE INDEX IF NOT EXISTS idx_task_queue_status ON task_queue(status);
CREATE INDEX IF NOT EXISTS idx_task_queue_type ON task_queue(type);
CREATE INDEX IF NOT EXISTS idx_task_queue_controller_type ON task_queue(controller_type); 