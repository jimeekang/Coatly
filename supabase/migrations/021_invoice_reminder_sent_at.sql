-- Track when invoice reminder emails were last sent
-- due_reminder_sent_at: set when D-3 reminder is sent
-- overdue_reminder_sent_at: set when D+7 overdue reminder is sent
alter table invoices
  add column if not exists due_reminder_sent_at    timestamptz default null,
  add column if not exists overdue_reminder_sent_at timestamptz default null;
