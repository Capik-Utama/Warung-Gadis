-- ============================================================
-- Cascade delete transaction_items when a product is deleted.
-- Previously, deleting a product that appeared in any
-- transaction failed with:
--   violates foreign key constraint
--   "transaction_items_product_id_fkey" on table "transaction_items"
-- ============================================================
ALTER TABLE transaction_items DROP CONSTRAINT IF EXISTS transaction_items_product_id_fkey;
ALTER TABLE transaction_items
  ADD CONSTRAINT transaction_items_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE;
