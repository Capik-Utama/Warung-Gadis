# Mobile Compatibility Fixes

Dokumentasi perbaikan untuk memastikan aplikasi Warung Gadis kompatibel dengan berbagai perangkat HP.

## Masalah yang Diperbaiki

### 1. **Target Build ES2023 Terlalu Tinggi**
- **Masalah**: TypeScript dikompilasi ke ES2023, yang mengandung syntax modern tidak didukung HP lama
- **Solusi**: 
  - Ubah `tsconfig.app.json` target dari `es2023` ke `es2020`
  - Tambahkan `build.target` di `vite.config.ts` dengan dukungan browser lama
  - Browser yang didukung: Chrome 87+, Firefox 78+, Safari 14+, iOS 12+, Android 6+

### 2. **Akses localStorage Tanpa Error Handling**
- **Masalah**: HP dengan private mode atau sandbox membatasi localStorage, menyebabkan exception
- **Solusi**:
  - Tambahkan try-catch di `src/config/theme.ts` untuk semua akses localStorage
  - Fallback ke default theme jika localStorage tidak tersedia
  - Graceful degradation tanpa crash aplikasi

### 3. **CSS Fitur Modern Tanpa Fallback**
- **Masalah**: `backdrop-filter`, `max-h-[90vh]`, dan layout modern tidak kompatibel browser lama
- **Solusi**:
  - Tambahkan fallback untuk `backdrop-filter` di `src/index.css`
  - Gunakan `clamp()` dan `min()` untuk height yang lebih robust
  - Tambahkan `-webkit-` prefix untuk kompatibilitas Safari/iOS

### 4. **Viewport & Layout Issues**
- **Masalah**: Layout `h-screen` dan nested `overflow-hidden` bermasalah saat browser chrome muncul/hilang
- **Solusi**:
  - Gunakan `100dvh` (dynamic viewport height) di `src/components/layout/MainLayout.tsx`
  - Tambahkan event listener untuk resize dan orientationchange
  - Gunakan `min-w-0` untuk flex items agar text truncation bekerja
  - Tambahkan `-webkit-overflow-scrolling: touch` untuk smooth scroll iOS

### 5. **Meta Tags & HTML Tidak Optimal**
- **Masalah**: Meta tags tidak lengkap untuk mobile, bisa menyebabkan zoom/rendering issues
- **Solusi**:
  - Tambahkan `viewport-fit=cover` untuk notch support
  - Tambahkan `user-scalable=no` untuk prevent zoom
  - Tambahkan `format-detection` untuk prevent auto-linking
  - Tambahkan inline style untuk prevent FOUC (Flash of Unstyled Content)

### 6. **Font Fallback Tidak Lengkap**
- **Masalah**: Jika Poppins font gagal load, tidak ada fallback yang baik
- **Solusi**:
  - Tambahkan system font fallback di `tailwind.config.js`
  - Fallback chain: Poppins → -apple-system → BlinkMacSystemFont → Segoe UI → Roboto → sans-serif

### 7. **Error Handling Tidak Ada**
- **Masalah**: JavaScript error tidak tertangani, bisa menyebabkan blank page
- **Solusi**:
  - Tambahkan global error handler di `src/main.tsx`
  - Handle unhandled promise rejections
  - Validasi root element sebelum render

## File yang Dimodifikasi

| File | Perubahan |
|------|-----------|
| `tsconfig.app.json` | Target ES2020, module resolution node |
| `vite.config.ts` | Build target untuk browser lama, terser config |
| `src/config/theme.ts` | Error handling untuk localStorage |
| `src/index.css` | CSS fallback, mobile-specific fixes, animations |
| `src/components/layout/MainLayout.tsx` | Dynamic viewport height, smooth scroll iOS |
| `index.html` | Meta tags lengkap, inline style FOUC prevention |
| `tailwind.config.js` | Font fallback, safe area spacing |
| `src/main.tsx` | Global error handler, root validation |
| `.browserslistrc` | Browser compatibility list (baru) |

## Testing

Untuk memastikan kompatibilitas, test di:

### Desktop
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

### Mobile
- iPhone 6s+ (iOS 12+)
- Android 6+ (Chrome, Firefox, Samsung Internet)
- iPad (iOS 12+)
- Tablet Android

### Kondisi Khusus
- Private/Incognito mode (localStorage disabled)
- Low-end devices (Android Go, old phones)
- Slow 3G connection
- Landscape orientation
- Notch/safe area devices (iPhone X+)

## Browser Support

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 87+ | ✅ Supported |
| Firefox | 78+ | ✅ Supported |
| Safari | 14+ | ✅ Supported |
| Edge | 88+ | ✅ Supported |
| iOS Safari | 12+ | ✅ Supported |
| Android Chrome | 87+ | ✅ Supported |
| Samsung Internet | 13+ | ✅ Supported |

## Performance Tips

1. **Lazy Load Images**: Gunakan `loading="lazy"` untuk images
2. **Code Splitting**: Sudah dikonfigurasi via Vite
3. **PWA**: Sudah dikonfigurasi via vite-plugin-pwa
4. **Compression**: Terser sudah dikonfigurasi untuk minification
5. **Caching**: Service Worker caching sudah dikonfigurasi

## Troubleshooting

### Halaman Blank di HP Lama
- Buka DevTools → Console untuk melihat error
- Cek apakah localStorage tersedia (private mode?)
- Cek network tab untuk failed requests

### Font Tidak Tampil
- Fallback system font akan digunakan
- Periksa Google Fonts CDN connectivity

### Layout Berantakan di Mobile
- Cek viewport meta tag
- Cek CSS media queries
- Test di berbagai screen sizes

### Scroll Tidak Smooth di iOS
- Pastikan `-webkit-overflow-scrolling: touch` ada
- Cek nested overflow elements

## Deployment

Setelah perbaikan, build ulang:

```bash
npm run build
# atau
pnpm build
```

Pastikan build berhasil tanpa warning, kemudian deploy ke production.
