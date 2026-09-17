-- Comprehensive application activity audit log
-- Captures inserts, updates, and deletes made by the POS application.

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

CREATE OR REPLACE FUNCTION public.audit_log_row_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row_data jsonb;
  old_data jsonb;
  actor_id uuid;
  branch_id_value uuid;
  actor_name_value text;
  category_value text;
  action_value text;
  entity_value text;
  description_value text;
  metadata_value jsonb;
  type_value text;
BEGIN
  row_data := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  old_data := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE '{}'::jsonb END;
  entity_value := COALESCE(row_data->>'id', row_data->>'code');
  actor_id := NULLIF(row_data->>'user_id', '')::uuid;
  IF actor_id IS NULL THEN actor_id := NULLIF(row_data->>'actor_user_id', '')::uuid; END IF;
  branch_id_value := NULLIF(row_data->>'branch_id', '')::uuid;

  IF actor_id IS NOT NULL THEN
    SELECT name INTO actor_name_value FROM public.users WHERE id = actor_id;
  END IF;

  category_value := CASE
    WHEN TG_TABLE_NAME = 'transactions' THEN 'Penjualan'
    WHEN TG_TABLE_NAME = 'stock_logs' THEN CASE WHEN row_data->>'type' = 'sale' THEN 'Penjualan' ELSE 'Stok' END
    WHEN TG_TABLE_NAME IN ('shifts', 'shift_handovers', 'users', 'user_branches', 'user_permissions') THEN 'Staf'
    WHEN TG_TABLE_NAME = 'branches' THEN 'Cabang'
    WHEN TG_TABLE_NAME IN ('products', 'product_prices', 'product_stocks') THEN 'Produk'
    WHEN TG_TABLE_NAME = 'categories' THEN 'Kategori'
    WHEN TG_TABLE_NAME = 'debts' THEN 'Member/Hutang'
    WHEN TG_TABLE_NAME = 'debt_payments' THEN 'Pembayaran Member'
    WHEN TG_TABLE_NAME = 'system_settings' THEN 'Pengaturan'
    ELSE 'Lainnya'
  END;

  action_value := lower(TG_OP);
  IF TG_TABLE_NAME = 'shifts' THEN
    action_value := CASE WHEN TG_OP = 'INSERT' THEN 'check_in' WHEN row_data->>'status' = 'closed' THEN 'check_out' ELSE 'update' END;
  ELSIF TG_TABLE_NAME = 'shift_handovers' THEN
    action_value := 'shift_handover_' || COALESCE(row_data->>'status', 'created');
  ELSIF TG_TABLE_NAME = 'stock_logs' THEN
    action_value := COALESCE(row_data->>'type', 'stock');
  END IF;

  type_value := COALESCE(row_data->>'type', '');
  description_value := CASE
    WHEN TG_TABLE_NAME = 'transactions' THEN format('Transaksi %s (%s)', COALESCE(row_data->>'code', entity_value), COALESCE(row_data->>'status', 'baru'))
    WHEN TG_TABLE_NAME = 'stock_logs' THEN format('Stok %s: %s unit%s', type_value, COALESCE(row_data->>'quantity', '0'), CASE WHEN row_data->>'notes' IS NULL THEN '' ELSE ' — ' || row_data->>'notes' END)
    WHEN TG_TABLE_NAME = 'shifts' THEN format('Shift %s%s', CASE WHEN action_value = 'check_in' THEN 'masuk' WHEN action_value = 'check_out' THEN 'keluar' ELSE 'diperbarui' END, CASE WHEN row_data->>'status' IS NULL THEN '' ELSE ' (' || row_data->>'status' || ')' END)
    WHEN TG_TABLE_NAME = 'shift_handovers' THEN format('Serah terima shift (%s)', COALESCE(row_data->>'status', 'dibuat'))
    WHEN TG_TABLE_NAME IN ('users', 'products', 'categories', 'branches') THEN format('%s %s %s', initcap(action_value), TG_TABLE_NAME, COALESCE(row_data->>'name', entity_value))
    ELSE format('%s %s %s', initcap(action_value), TG_TABLE_NAME, COALESCE(row_data->>'name', entity_value))
  END;

  metadata_value := jsonb_build_object('table_name', TG_TABLE_NAME, 'operation', TG_OP, 'new_values', row_data, 'old_values', old_data);
  INSERT INTO public.audit_logs(category, action, entity_type, entity_id, actor_user_id, actor_name, branch_id, description, metadata)
  VALUES (category_value, action_value, TG_TABLE_NAME, entity_value, actor_id, actor_name_value, branch_id_value, description_value, metadata_value);

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
EXCEPTION WHEN OTHERS THEN
  -- Auditing must never block the underlying POS operation.
  RAISE WARNING 'audit_log_row_change failed for %.%: %', TG_TABLE_SCHEMA, TG_TABLE_NAME, SQLERRM;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_log_retention()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.audit_logs WHERE created_at < now() - interval '1 year';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_logs_retention ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_retention
AFTER INSERT ON public.audit_logs
FOR EACH STATEMENT EXECUTE FUNCTION public.audit_log_retention();

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'transactions', 'stock_logs', 'shifts', 'shift_handovers', 'users', 'user_branches',
    'user_permissions', 'branches', 'products', 'product_prices', 'product_stocks',
    'categories', 'debts', 'debt_payments', 'system_settings'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON public.%I', table_name, table_name);
    EXECUTE format('CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_log_row_change()', table_name, table_name);
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category_created_at ON public.audit_logs(category, created_at DESC);

-- Clean existing stale records immediately when this migration is applied.
DELETE FROM public.audit_logs WHERE created_at < now() - interval '1 year';
