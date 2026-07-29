# Warung Gadis – Warung Gadis

> **Ngopi • Nongkrong • Karaoke • Nobar**

Aplikasi POS (Point of Sale) berbasis Progressive Web App (PWA) untuk **Warung Gadis** – warung kopi multi-cabang dengan fitur karaoke dan nobar bola.

---

## 🚀 Tech Stack

| Teknologi | Deskripsi |
|-----------|-----------|
| **React 19** | UI library |
| **TypeScript** | Type safety |
| **Vite 8** | Build tool & dev server |
| **TailwindCSS 3** | Utility-first CSS |
| **Supabase** | Backend-as-a-Service (PostgreSQL + Realtime) |
| **React Router v7** | Client-side routing |
| **TanStack Query v5** | Server state management |
| **Zustand v5** | Client state management |
| **Lucide Icons** | Icon set |
| **Poppins Font** | Typography |
| **Recharts** | Data visualization |
| **vite-plugin-pwa** | PWA support |

---

## ✨ Fitur Utama

### 🔐 Multi-level User
- **Owner** – Akses penuh ke seluruh fitur dan semua cabang
- **Manager** – Akses operasional tanpa hapus transaksi
- **Staff** – Kasir, hutang, stok, favorit

### 🏪 Multi-Cabang
- Login dengan pilihan cabang
- Harga produk berbeda per cabang
- Realtime sync antar cabang via Supabase Realtime

### 🎨 Theme Switcher
- **Blue White** – Clean & Fresh
- **Blue Black** – Dark & Elegant
- **White Black** – Minimal & Pro

### 💳 Kasir (POS)
- Search produk cepat
- Filter kategori
- Keranjang dengan checkbox pilih item
- Pembayaran: Tunai, QRIS, Transfer
- Fitur Hutang dengan nama & HP pelanggan
- Pending transaksi

### ⏰ Shift System
- MASUK / PULANG
- Serah terima shift antar staff
- Kas sistem vs kas aktual
- History shift lengkap

### 📊 Laporan
- Harian / Bulanan / Per cabang / Per staff
- Grafik pendapatan (AreaChart + BarChart)
- Produk terlaris
- Export CSV/PDF

### 🔔 Notifikasi Stok
- Alert merah saat stok ≤ minimum stok

### 💾 Backup & Restore
- Download semua data ke JSON
- Restore dari file backup

---

## 🗂 Struktur Folder

```
src/
├── components/
│   ├── layout/       # MainLayout, Sidebar, Topbar
│   ├── shared/       # Logo, Banner
│   └── ui/           # Button, Input, Modal, Table, Badge, Card
├── config/
│   ├── supabase.ts   # Supabase client
│   └── theme.ts      # Theme system
├── pages/
│   ├── auth/         # Login
│   ├── dashboard/    # Dashboard (Owner & Staff)
│   ├── kasir/        # POS page
│   ├── produk/       # Products CRUD
│   ├── kategori/     # Categories CRUD
│   ├── supplier/     # Supplier CRUD
│   ├── stok/         # Stock management
│   ├── transaksi/    # Transactions
│   ├── hutang/       # Debt management
│   ├── laporan/      # Reports
│   ├── user/         # User management
│   ├── cabang/       # Branch management
│   ├── shift/        # Shift system
│   ├── favorit/      # Staff favorites
│   ├── pengaturan/   # Settings & Theme
│   └── backup/       # Backup & Restore
├── permissions/      # RBAC configuration
├── services/         # Supabase API calls
├── store/            # Zustand stores
├── types/            # TypeScript types
└── utils/            # Helpers (format, etc.)
```

---

## 🛠 Instalasi

### Prerequisites
- Node.js >= 18
- npm >= 9
- Supabase project

### 1. Clone & Install

```bash
git clone https://github.com/Capik-Utama/Warung-Gadis.git
cd Warung-Gadis
npm install --legacy-peer-deps
```

### 2. Environment Variables

```bash
cp .env.example .env.local
# Edit .env.local dengan Supabase URL & Anon Key Anda
```

### 3. Database Migration

Di Supabase SQL Editor, jalankan secara berurutan:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_rls_policies.sql
supabase/migrations/003_seed_data.sql
```

### 4. Jalankan Development Server

```bash
npm run dev
```

Buka `http://localhost:5173`

---

## 🔑 Default Login

| Nama | Password | Role |
|------|----------|------|
| Mama Pia | admin123 | Owner |
| Staff Satu | admin123 | Staff |
| Manager Utama | admin123 | Manager |

> ⚠️ Ganti password setelah pertama login!

---

## 🚀 Deployment

### Vercel

```bash
npm run build
# Deploy dist/ folder ke Vercel
```

Atau gunakan Vercel CLI:
```bash
npx vercel --prod
```

### Environment Variables di Vercel

Tambahkan di Vercel Project Settings > Environment Variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## 📱 PWA Installation

Buka aplikasi di browser Android Chrome → klik menu → **"Add to Home Screen"**

---

## 🔒 Security

- Role-Based Access Control (RBAC)
- Permission sistem per user
- Supabase RLS (Row Level Security)
- Password hash di database

---

## 📞 Kontak

**Warung Gadis**  
📍 Bendungan  
📱 087733662600

---

© 2025 Warung Gadis – Warung Gadis. All rights reserved.
