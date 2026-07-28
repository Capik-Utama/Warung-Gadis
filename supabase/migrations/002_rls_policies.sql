-- ============================================================
-- WG POS – Row Level Security (RLS)
-- ============================================================
-- ⚠️  WARNING: The "allow_all" policies below are for DEVELOPMENT only.
--     Before deploying to production, replace them with the role-based
--     policies in the "Production RLS" section at the bottom of this file.
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_handovers ENABLE ROW LEVEL SECURITY;

-- ─── Helper: get current user id ────────────────────────────
-- NOTE: In WG POS we use custom auth (not Supabase Auth).
-- The RLS policies below use a custom function to get the
-- authenticated user id passed via app-level JWT claim.
-- For simplicity during development, we allow all authenticated
-- requests through the anon key (service role should be used
-- for server-side operations).

-- Policy: authenticated anon can do everything (development)
-- In production, replace with proper role-based policies below.

CREATE POLICY "allow_all" ON branches FOR ALL USING (true);
CREATE POLICY "allow_all" ON users FOR ALL USING (true);
CREATE POLICY "allow_all" ON user_permissions FOR ALL USING (true);
CREATE POLICY "allow_all" ON categories FOR ALL USING (true);
CREATE POLICY "allow_all" ON products FOR ALL USING (true);
CREATE POLICY "allow_all" ON product_prices FOR ALL USING (true);
CREATE POLICY "allow_all" ON suppliers FOR ALL USING (true);
CREATE POLICY "allow_all" ON stock_logs FOR ALL USING (true);
CREATE POLICY "allow_all" ON transactions FOR ALL USING (true);
CREATE POLICY "allow_all" ON transaction_items FOR ALL USING (true);
CREATE POLICY "allow_all" ON debts FOR ALL USING (true);
CREATE POLICY "allow_all" ON debt_payments FOR ALL USING (true);
CREATE POLICY "allow_all" ON shifts FOR ALL USING (true);
CREATE POLICY "allow_all" ON shift_handovers FOR ALL USING (true);

-- ─── Production RLS (reference) ────────────────────────────
-- These policies can be enabled in production by dropping the
-- allow_all policies above and enabling these instead.

-- Example: Only authenticated users can read branches
-- CREATE POLICY "auth_read_branches" ON branches
--   FOR SELECT USING (auth.role() = 'authenticated');

-- Example: Developer can manage users
-- CREATE POLICY "developer_manage_users" ON users
--   FOR ALL USING (
--     EXISTS (
--       SELECT 1 FROM users u
--       WHERE u.id = auth.uid()::uuid AND u.role = 'developer'
--     )
--   );
