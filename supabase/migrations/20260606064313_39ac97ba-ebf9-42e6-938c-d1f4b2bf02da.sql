CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any previous schedule with this name so this migration is re-runnable
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'db-backup-daily') THEN
    PERFORM cron.unschedule('db-backup-daily');
  END IF;
END $$;

SELECT cron.schedule(
  'db-backup-daily',
  '0 3 * * *',  -- every day at 03:00 UTC
  $$
  SELECT net.http_post(
    url := 'https://project--816b14c5-85ed-4a82-b9f1-1846addd464c.lovable.app/api/public/hooks/db-backup',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZGZid3Nrd2locGJha21ybWpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3MDQ2MjgsImV4cCI6MjA5NjI4MDYyOH0.22yN7KW2_6OroA-JWPTRTmrn-t8ZdTLbFjIiteJmC78"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);