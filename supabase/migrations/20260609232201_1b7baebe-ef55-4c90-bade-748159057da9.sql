DROP POLICY IF EXISTS "db_backups_no_anon_select" ON storage.objects;
DROP POLICY IF EXISTS "db_backups_no_anon_insert" ON storage.objects;
DROP POLICY IF EXISTS "db_backups_no_anon_update" ON storage.objects;
DROP POLICY IF EXISTS "db_backups_no_anon_delete" ON storage.objects;

CREATE POLICY "db_backups_no_anon_select"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id <> 'db-backups');

CREATE POLICY "db_backups_no_anon_insert"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id <> 'db-backups');

CREATE POLICY "db_backups_no_anon_update"
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (bucket_id <> 'db-backups')
  WITH CHECK (bucket_id <> 'db-backups');

CREATE POLICY "db_backups_no_anon_delete"
  ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id <> 'db-backups');