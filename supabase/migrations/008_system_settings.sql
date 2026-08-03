-- ============================================================
-- Fase 3: System Settings - Jam Reset Pendapatan (Business Day)
-- Warung Gadis (Capik-Utama/Warung-Gadis)
-- ============================================================
-- Tabel system_settings menyimpan pengaturan global aplikasi.
-- Key-value store sederhana untuk menyimpan jam reset pendapatan.
-- Default jam reset: 00:00 (tanggal kalender biasa).
-- ============================================================

BEGIN;

-- ─── Tabel system settings ──────────────────────────────────
CREATE TABLE IF NOT EXISTS system_settings (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);

GRANT SELECT, INSERT, UPDATE, DELETE ON system_settings TO anon, authenticated;
GRANT ALL ON system_settings TO service_role;

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'system_settings' AND policyname = 'allow_all'
  ) THEN
    CREATE POLICY "allow_all" ON system_settings FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ─── Updated-at trigger ─────────────────────────────────────
CREATE TRIGGER trg_system_settings_updated_at
BEFORE UPDATE ON system_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- ─── Seed default: jam reset pendapatan = 00:00 ─────────────
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES (
  'reset_hour',
  '0',
  'Jam reset pendapatan harian (0-23). Default 0 = 00:00 (tanggal kalender).'
)
ON CONFLICT (setting_key) DO NOTHING;

COMMIT;
