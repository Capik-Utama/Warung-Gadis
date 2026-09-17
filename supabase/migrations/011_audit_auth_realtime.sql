-- Auth events and realtime support for cross-device activity updates.
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  actor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  actor_name TEXT,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all" ON public.audit_logs;
CREATE POLICY "allow_all" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category_created_at ON public.audit_logs(category, created_at DESC);

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'audit_logs', 'branches', 'users', 'user_permissions', 'user_branches', 'categories',
    'products', 'product_prices', 'product_stocks', 'suppliers', 'stock_logs', 'transactions',
    'transaction_items', 'debts', 'debt_payments', 'shifts', 'shift_handovers', 'system_settings'
  ] LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = table_name
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_name);
    END IF;
  END LOOP;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;
