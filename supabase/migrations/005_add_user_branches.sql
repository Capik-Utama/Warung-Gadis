-- ============================================================
-- Warung Gadis – User Branch Access
-- Database Migration v5
-- Supabase PostgreSQL
-- ============================================================

-- ─── User Branches (Many-to-Many) ──────────────────────────
-- Tabel relasi antara user dan cabang yang diizinkan
CREATE TABLE IF NOT EXISTS user_branches (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  branch_id  UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, branch_id)
);

CREATE INDEX IF NOT EXISTS idx_user_branches_user ON user_branches(user_id);
CREATE INDEX IF NOT EXISTS idx_user_branches_branch ON user_branches(branch_id);

-- ─── Seed: Berikan akses semua cabang ke semua user yang sudah ada ───
INSERT INTO user_branches (user_id, branch_id)
SELECT u.id, b.id
FROM users u, branches b
WHERE u.is_active = true
ON CONFLICT (user_id, branch_id) DO NOTHING;
