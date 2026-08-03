# Fitur: Jam Reset Pendapatan (Business Day)

## Ringkasan

Fitur ini memungkinkan Owner/Developer untuk menentukan jam berapa "hari baru" dimulai untuk semua laporan pendapatan. Sebelumnya, semua laporan menggunakan tanggal kalender biasa (reset di 00:00). Sekarang, jam reset bisa diatur sesuai kebutuhan operasional warung.

## Cara Akses

**Settings → Sistem → Jam Reset Pendapatan**

Path: `/pengaturan/sistem`

## Cara Pakai

1. Buka menu **Pengaturan** di sidebar
2. Klik card **Sistem** (Jam Reset Pendapatan)
3. Pilih jam reset yang diinginkan (00:00 - 23:00, format 24 jam)
4. Klik **Simpan Pengaturan**

## Contoh Penggunaan

| Jam Reset | Perhitungan Hari Ini | Keterangan |
|-----------|----------------------|------------|
| 00:00     | 00:00 hari ini → 23:59:59 hari ini | Default, tanggal kalender biasa |
| 08:00     | 08:00 hari ini → 07:59:59 besok | Warung buka jam 8 pagi |
| 20:00     | 20:00 hari ini → 19:59:59 besok | Warung buka malam hari |

## Laporan yang Terpengaruh

Semua laporan berikut sekarang mengikuti jam reset yang diatur:

- **Dashboard** — Pemasukan Hari Ini
- **Dashboard** — Produk Terlaris (hari ini)
- **Dashboard** — Pendapatan Staff
- **Laporan** — Grafik Penjualan
- **Laporan** — Omzet per Staff (Hari Ini)
- **Laporan** — Produk Terlaris
- **Laporan** — Export CSV
- **Laporan** — Total Transaksi

> **Catatan:** Omzet Bulan Ini tetap menggunakan tanggal kalender (1st of month) karena bulanan tidak terpengaruh jam reset.

## Teknis

### File yang Dibuat/Diubah

| File | Keterangan |
|------|-----------|
| `supabase/migrations/008_system_settings.sql` | Tabel `system_settings` + seed default `reset_hour = 0` |
| `src/services/businessDayHelper.ts` | Helper function pusat untuk semua logika business day |
| `src/services/systemSettingService.ts` | CRUD Supabase untuk pengaturan reset_hour |
| `src/services/reportService.ts` | Integrasi business day ke semua fungsi laporan |
| `src/pages/pengaturan/SystemSettingsPage.tsx` | Halaman UI pengaturan jam reset |
| `src/pages/pengaturan/PengaturanPage.tsx` | Tambah card "Sistem" ke halaman Pengaturan |
| `src/App.tsx` | Tambah route `/pengaturan/sistem` |
| `src/components/layout/MainLayout.tsx` | Tambah page title |

### Arsitektur

```
SystemSettingsPage (UI)
    ↓ save/reset hour
systemSettingService.ts
    ↓ Supabase upsert / localStorage fallback
    ↓
businessDayHelper.ts
    ↓ getBusinessDayBounds() / getBusinessDayLabel()
    ↓
reportService.ts
    ↓ getTodayStats / getDailySales / getStaffSales / getTopProducts / getTodayStaffStats
    ↓
Dashboard & Laporan Pages
```

### Prinsip Desain

1. **Single Source of Truth** — Satu helper function (`businessDayHelper.ts`) digunakan oleh semua laporan
2. **Backward Compatible** — Default tetap 00:00, tidak mengubah perilaku lama
3. **Graceful Degradation** — Jika tabel Supabase belum tersedia, pakai localStorage fallback
4. **Role-Based Access** — Hanya Owner/Developer yang bisa mengubah pengaturan
5. **No Breaking Changes** — Semua signature function publik reportService tetap sama
