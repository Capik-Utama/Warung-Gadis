-- ============================================================
-- Fase 1: Checkout atomik + perbaikan double-decrement stok
-- Warung Gadis (Capik-Utama/Warung-Gadis)
-- ============================================================
--
-- MASALAH:
-- Trigger `trg_stock_on_sale` (001_initial_schema.sql) sudah mengurangi
-- products.stock setiap kali ada INSERT ke stock_logs dengan type='sale'.
-- Namun transactionService.ts JUGA melakukan UPDATE products.stock manual.
-- Akibatnya setiap penjualan mengurangi stok dua kali lipat.
--
-- SOLUSI:
-- Semua penulisan transaksi dipindahkan ke satu fungsi Postgres agar atomik.
-- Fungsi ini TIDAK menyentuh products.stock secara langsung — pengurangan
-- stok sepenuhnya diserahkan pada trigger trg_stock_on_sale.
-- ============================================================

CREATE OR REPLACE FUNCTION create_transaction(
  p_branch_id      UUID,
  p_user_id        UUID,
  p_items          JSONB,   -- [{ "product_id": uuid, "quantity": int, "unit_price": numeric }]
  p_status         TEXT,    -- 'pending' | 'paid' | 'debt'
  p_code           TEXT,
  p_customer_name  TEXT DEFAULT NULL,
  p_customer_phone TEXT DEFAULT NULL,
  p_payment_method TEXT DEFAULT NULL,
  p_paid_amount    NUMERIC DEFAULT 0,
  p_notes          TEXT DEFAULT NULL
)
RETURNS transactions
LANGUAGE plpgsql
AS $$
DECLARE
  v_total NUMERIC := 0;
  v_trx   transactions;
  v_item  JSONB;
  v_label TEXT;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Keranjang kosong';
  END IF;

  IF p_status NOT IN ('pending', 'paid', 'debt') THEN
    RAISE EXCEPTION 'Status transaksi tidak valid: %', p_status;
  END IF;

  SELECT COALESCE(SUM((i->>'quantity')::INT * (i->>'unit_price')::NUMERIC), 0)
    INTO v_total
    FROM jsonb_array_elements(p_items) AS i;

  INSERT INTO transactions (
    code, branch_id, user_id, customer_name, customer_phone,
    status, payment_method, total_amount, paid_amount, change_amount, notes
  ) VALUES (
    p_code, p_branch_id, p_user_id, p_customer_name, p_customer_phone,
    p_status, p_payment_method, v_total, COALESCE(p_paid_amount, 0),
    GREATEST(0, COALESCE(p_paid_amount, 0) - v_total), p_notes
  )
  RETURNING * INTO v_trx;

  v_label := CASE p_status
               WHEN 'debt'    THEN '(Hutang)'
               WHEN 'pending' THEN '(Pending)'
               ELSE ''
             END;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO transaction_items (
      transaction_id, product_id, quantity, unit_price, subtotal, status
    ) VALUES (
      v_trx.id,
      (v_item->>'product_id')::UUID,
      (v_item->>'quantity')::INT,
      (v_item->>'unit_price')::NUMERIC,
      (v_item->>'quantity')::INT * (v_item->>'unit_price')::NUMERIC,
      p_status
    );

    -- Satu-satunya jalur pengurangan stok: trigger trg_stock_on_sale
    -- akan menjalankan UPDATE products SET stock = stock - quantity.
    INSERT INTO stock_logs (product_id, branch_id, type, quantity, notes, user_id)
    VALUES (
      (v_item->>'product_id')::UUID,
      p_branch_id,
      'sale',
      (v_item->>'quantity')::INT,
      TRIM('Penjualan ' || v_label || ' - ' || p_code),
      p_user_id
    );
  END LOOP;

  RETURN v_trx;
END;
$$;

GRANT EXECUTE ON FUNCTION create_transaction(
  UUID, UUID, JSONB, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT
) TO anon, authenticated, service_role;
