# BOX Score Tracker

Aplikasi web pencatat skor untuk permainan kartu **BOX**, sebuah permainan kartu lokal yang dimainkan 4–5 orang menggunakan 108 kartu (2 set remi + 4 Joker).

## 🎮 Fitur Utama

- ✅ **Pencatatan Skor Real-time**: Input skor ronde dengan interface interaktif
- ✅ **Kalkulator Kartu Otomatis**: Hitung nilai kartu sisa dengan tap per kartu
- ✅ **Manajemen Grup**: Buat grup baru atau join dengan kode unik
- ✅ **Riwayat Lengkap**: Lihat semua ronde yang telah dimainkan
- ✅ **Statistik Pemain**: Tracking performa, rata-rata skor, jumlah CATE, reset
- ✅ **Reset Skor Otomatis**: Sistem otomatis mereset skor pemain sesuai batas minus
- ✅ **Shared Group**: Bagikan kode untuk akses multi-pemain dari smartphone berbeda

## 📋 Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | React + Vite |
| Styling | Tailwind CSS |
| Routing | React Router v6 |
| Backend & Database | Supabase (PostgreSQL) |
| Hosting | Vercel |

## 🚀 Quick Start

### 1. Setup Supabase

1. Buka [supabase.com](https://supabase.com)
2. Buat project baru
3. Di SQL Editor, jalankan script di file `DATABASE_SCHEMA.sql`
4. Ambil **Project URL** dan **Anon Key** dari Settings → API

### 2. Setup Project Lokal

```bash
cd BoxPoints

# Copy .env template dan isi credentials
cp .env.example .env
# Edit .env dengan:
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=your-anon-key

# Install dependencies (sudah dilakukan, tapi jika perlu:)
npm install

# Jalankan dev server
npm run dev
```

Server akan berjalan di `http://localhost:5173`

### 3. Build untuk Production

```bash
npm run build
npm run preview
```

## 📁 Struktur Folder

```
src/
├── pages/              # Halaman utama aplikasi
│   ├── Home.jsx
│   ├── CreateGroup.jsx
│   ├── JoinGroup.jsx
│   ├── GroupCode.jsx
│   ├── Game.jsx        # Papan skor utama
│   ├── RoundInput.jsx  # Input ronde dengan tabs
│   ├── History.jsx
│   ├── Stats.jsx
│   └── Rules.jsx
├── components/         # Reusable components
│   ├── PlayerRow.jsx
│   ├── CardCalculator.jsx
│   ├── CateSelector.jsx
│   ├── SunFailSelector.jsx
│   ├── ScoreBadge.jsx
│   └── BottomNav.jsx
├── hooks/              # Custom React hooks
│   ├── useGroup.js
│   ├── useGame.js
│   └── useRound.js
├── utils/              # Utilities & helpers
│   ├── scoreCalculator.js
│   ├── codeGenerator.js
│   └── constants.js
├── App.jsx             # Main router
├── main.jsx            # Entry point
└── index.css           # Tailwind imports
```

## 🎯 Alur Penggunaan

### Membuat Grup Baru

1. Homepage → **Buat Grup Baru**
2. Input nama grup, batas minus, jumlah pemain (4/5)
3. Input nama setiap pemain
4. **Buat Grup** → Dapatkan kode unik (6 karakter)
5. Bagikan kode ke pemain lain
6. Mulai permainan

### Bergabung Grup

1. Homepage → **Gabung Grup**
2. Masukkan kode 6 karakter
3. Langsung masuk ke papan skor grup tersebut

### Input Ronde

1. Di halaman Game → **Input Ronde Baru**
2. **Tab 1 - CATE**: Pilih siapa yang menang (CATE) + jumlah joker
3. **Tab 2 - Kartu**: Untuk setiap pemain yang tidak CATE, tap kartu sisa mereka
4. **Tab 3 - Sun**: Tandai pemain yang gagal Sun (jika ada)
5. **Simpan Ronde** → Skor dihitung otomatis

## 📊 Sistem Penilaian

### Jika CATE (Menang):
- `+50` (bonus CATE)
- `+100` per joker yang digunakan

### Jika Tidak CATE:
- Minus nilai kartu sisa (A=15, 2-9=sesuai, 10/J/Q/K=10, JOKER=100)
- `-100` per joker yang dipegang

### Jika Gagal Sun:
- `-50` poin (keluar dari ronde)
- Jika 2+ pemain gagal Sun → ronde diulang

## 🔄 Reset Skor Otomatis

Setelah setiap ronde, sistem cek apakah ada pemain yang total skornya ≤ batas minus (default -300). Jika ya, skor pemain direset ke 0.

## 🎮 Aturan Permainan BOX

BOX dimainkan dengan 108 kartu (2 set remi + 4 Joker). Tujuan adalah mengeluarkan semua kartu terlebih dahulu (CATE).

- **CATE = Pemenang ronde** → mendapat bonus poin
- Pemain lain dihitung berdasarkan kartu sisa
- Skor terakumulasi, reset otomatis di batas minus

**Lihat halaman "Aturan Permainan" di app untuk penjelasan lengkap.**

## 🌐 Deploy ke Vercel

### 1. Push ke GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/box-score.git
git push -u origin main
```

### 2. Import ke Vercel

1. Buka [vercel.com](https://vercel.com)
2. **Import Project** → Pilih repo GitHub
3. Framework: **Vite**
4. **Environment Variables**:
   - `VITE_SUPABASE_URL`: Supabase URL
   - `VITE_SUPABASE_ANON_KEY`: Supabase Anon Key
5. **Deploy**

✅ Aplikasi live di `https://yourproject.vercel.app`

## 📱 Mobile-First Design

- Responsive untuk desktop & tablet
- Optimized untuk mobile (390px viewport)
- Touch-friendly interface dengan large buttons
- Bottom navigation untuk navigasi mudah

## 💾 LocalStorage

Aplikasi menyimpan kode grup terakhir di localStorage agar bisa diakses lagi tanpa input kode.

```javascript
localStorage.setItem('lastGroupCode', code);
const lastCode = localStorage.getItem('lastGroupCode');
```

## 🔐 Keamanan

- Menggunakan Supabase dengan Row Level Security (optional)
- Tidak ada login/akun, identifikasi hanya berdasarkan nama dalam grup
- Kode grup unik 6 karakter mencegah akses tidak sah
- All data encrypted in transit (HTTPS)

## 🐛 Troubleshooting

### Dev server tidak jalan

```bash
# Clear node_modules dan reinstall
rm -r node_modules package-lock.json
npm install
npm run dev
```

### Supabase connection error

- Pastikan `.env` sudah benar dengan URL dan key Supabase
- Check Supabase project sudah aktif
- Verify network connection

### Styles tidak loading

```bash
# Rebuild Tailwind
npm run build
```

## 📝 Catatan Pengembangan

- Aplikasi fully responsive dan PWA-ready
- State management menggunakan React hooks
- Real-time data sync dengan Supabase
- Error handling dan validation di setiap form
- Loading states untuk UX yang lebih baik

## 📄 Lisensi

MIT License - Feel free to use dan modify!

## 👥 Kontribusi

Issues dan pull requests welcome! Silakan improve aplikasi ini.

## 📞 Support

Untuk pertanyaan atau bug reports, buat issue di repository.

---

**Happy Scoring! 🎮📊**
