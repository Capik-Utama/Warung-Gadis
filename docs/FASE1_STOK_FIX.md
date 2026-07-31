# Fase 1 — Perbaikan Stok & Checkout Atomik

Patch untuk repo `Capik-Utama/Warung-Gadis`.

## Isi

| File | Tujuan |
|---|---|
| `supabase/migrations/006_create_transaction_rpc.sql` | RPC `create_transaction()` — satu transaksi DB untuk transaksi + item + stock_log |
| `src/services/transactionService.createTransaction.patch.ts` | Pengganti fungsi `createTransaction()` di `src/services/transactionService.ts` |

## Akar masalah

`001_initial_schema.sql` punya trigger:

```sql
CREATE TRIGGER trg_stock_on_sale
AFTER INSERT ON stock_logs
FOR EACH ROW EXECUTE FUNCTION reduce_stock_on_sale();  -- stock = stock - quantity saat type='sale'
```

Sementara `transactionService.createTransaction()` juga menjalankan
`UPDATE products SET stock = stock - quantity` dari browser, lalu menyisipkan
`stock_logs` bertipe `'sale'` yang memicu trigger itu lagi.

**Jual 2 pcs → stok berkurang 4.**

Jalur pembatalan (`type: 'adjustment'`) tidak terkena trigger, jadi
pengembalian stok di sana sudah benar dan tidak diubah.

## Langkah penerapan

1. Salin `006_create_transaction_rpc.sql` ke `supabase/migrations/` di repo, commit
   (workflow `.github/workflows/supabase-migration.yml` akan menjalankannya),
   atau jalankan manual lewat SQL Editor Supabase.
2. Ganti isi fungsi `createTransaction()` di `src/services/transactionService.ts`
   dengan isi file patch. Import di bagian atas file tidak berubah —
   `generateCode` dan `ensureStaffWriteAccess` tetap terpakai.
3. Uji satu transaksi: stok produk harus turun **persis** sebanyak qty yang dijual.

## Audit stok yang terlanjur salah

Trigger baru aktif sejak awal, jadi setiap penjualan sebelum patch ini
memotong stok 2x. Selisihnya = total qty terjual per produk. Cek besarannya:

```sql
-- Perkiraan kelebihan potongan per produk (dari log penjualan)
SELECT p.id, p.name, p.stock AS stok_sekarang,
       COALESCE(SUM(sl.quantity), 0) AS kelebihan_potongan,
       p.stock + COALESCE(SUM(sl.quantity), 0) AS stok_seharusnya
FROM products p
LEFT JOIN stock_logs sl ON sl.product_id = p.id AND sl.type = 'sale'
GROUP BY p.id, p.name, p.stock
ORDER BY kelebihan_potongan DESC;
```

> Angka `stok_seharusnya` hanya valid bila stok tidak pernah dikoreksi manual,
> dan tidak akurat untuk produk yang sempat menyentuh 0 (klausa `GREATEST(0, ...)`
> memotong sebagian pengurangan). **Sangat disarankan melakukan stok opname fisik**
> lalu set nilai riil, bukan mengandalkan hasil query ini secara buta.

Setelah verifikasi, koreksi dengan:

```sql
UPDATE products SET stock = <nilai_hasil_opname> WHERE id = '<product_id>';
```

## Berikutnya

Fase 2 (Supabase Auth + RLS menggantikan `allow_all`) adalah prioritas
berikutnya — selama login masih SHA-256 di sisi klien dan policy masih
`USING (true)`, anon key di bundle frontend membuka akses baca-tulis penuh
ke seluruh database termasuk tabel `users`.
