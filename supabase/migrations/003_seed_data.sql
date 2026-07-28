-- ============================================================
-- WG POS – Seed Data
-- ============================================================

-- ─── Default Branch ────────────────────────────────────────
INSERT INTO branches (id, name, address, phone, is_active) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Warung Gadis Pusat', 'Bendungan', '087733662600', true),
  ('00000000-0000-0000-0000-000000000002', 'Warung Gadis Cabang 2', 'Cabang 2', '087733662601', true)
ON CONFLICT (id) DO NOTHING;

-- ─── Default Users ─────────────────────────────────────────
-- Akun Capik (Developer)
-- Password: "@Capik190989" -> hash: 264e5b43c54210226f70541ac5482895bf82559bf1c41b2008fa249831ffc508
INSERT INTO users (id, name, phone, address, role, branch_id, password_hash, is_active) VALUES
  (
    '00000000-0000-0000-0000-000000000009',
    'Capik',
    '089675669989',
    'Wangon Mas',
    'developer',
    NULL,
    '264e5b43c54210226f70541ac5482895bf82559bf1c41b2008fa249831ffc508',
    true
  )
ON CONFLICT (id) DO NOTHING;

-- Akun Mama Pia (Manager)
-- Password: "admin123" -> hash: 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9
INSERT INTO users (id, name, phone, address, role, branch_id, password_hash, is_active) VALUES
  (
    '00000000-0000-0000-0000-000000000010',
    'Mama Pia',
    '087733662600',
    'Bendungan',
    'manager',
    '00000000-0000-0000-0000-000000000001',
    '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
    true
  )
ON CONFLICT (id) DO NOTHING;

-- ─── Default Categories ────────────────────────────────────
INSERT INTO categories (id, name, icon, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000020', 'Kopi', '☕', 1),
  ('00000000-0000-0000-0000-000000000021', 'Mie', '🍜', 2),
  ('00000000-0000-0000-0000-000000000022', 'Minuman', '🥤', 3),
  ('00000000-0000-0000-0000-000000000023', 'Snack', '🍿', 4),
  ('00000000-0000-0000-0000-000000000024', 'Rokok', '🚬', 5),
  ('00000000-0000-0000-0000-000000000025', 'Lainnya', '📦', 6)
ON CONFLICT (id) DO NOTHING;

-- ─── Sample Products ───────────────────────────────────────
INSERT INTO products (id, name, category_id, capital_price, base_price, stock, min_stock, unit, is_active) VALUES
  ('00000000-0000-0000-0000-000000000030', 'Kopi Hitam', '00000000-0000-0000-0000-000000000020', 2000, 5000, 100, 20, 'gelas', true),
  ('00000000-0000-0000-0000-000000000031', 'Kopi Susu', '00000000-0000-0000-0000-000000000020', 4000, 8000, 80, 20, 'gelas', true),
  ('00000000-0000-0000-0000-000000000032', 'Indomie Goreng', '00000000-0000-0000-0000-000000000021', 3500, 8000, 50, 10, 'porsi', true),
  ('00000000-0000-0000-0000-000000000033', 'Indomie Kuah', '00000000-0000-0000-0000-000000000021', 3500, 8000, 50, 10, 'porsi', true),
  ('00000000-0000-0000-0000-000000000034', 'Es Teh Manis', '00000000-0000-0000-0000-000000000022', 1000, 4000, 100, 20, 'gelas', true),
  ('00000000-0000-0000-0000-000000000035', 'Es Jeruk', '00000000-0000-0000-0000-000000000022', 1500, 5000, 80, 15, 'gelas', true),
  ('00000000-0000-0000-0000-000000000036', 'Keripik', '00000000-0000-0000-0000-000000000023', 3000, 6000, 30, 5, 'bungkus', true),
  ('00000000-0000-0000-0000-000000000037', 'Rokok Sampoerna', '00000000-0000-0000-0000-000000000024', 22000, 25000, 50, 10, 'bungkus', true)
ON CONFLICT (id) DO NOTHING;

-- ─── Sample Staff ──────────────────────────────────────────
INSERT INTO users (id, name, phone, address, role, branch_id, password_hash, is_active) VALUES
  (
    '00000000-0000-0000-0000-000000000011',
    'Staff Satu',
    '081234567890',
    'Alamat Staff',
    'staff',
    '00000000-0000-0000-0000-000000000001',
    '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
    true
  )
ON CONFLICT (id) DO NOTHING;
