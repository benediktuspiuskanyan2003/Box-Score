# 📋 BOX Score Tracker - Setup Guide

Panduan lengkap untuk setup dan menjalankan BOX Score Tracker.

## 📦 Prerequisites

- **Node.js** (v16 atau lebih baru)
- **npm** (v8 atau lebih baru)
- **Git** (untuk version control)
- **Supabase account** (gratis di supabase.com)

## 🔧 Step-by-Step Setup

### Step 1: Setup Supabase Database

#### 1.1 Buat Supabase Project

1. Buka [supabase.com](https://supabase.com)
2. Login atau sign up dengan GitHub/Google
3. Klik **New Project**
4. Isi form:
   - **Project name**: `box-score` (atau nama lain)
   - **Database password**: Simpan password ini (untuk nanti)
   - **Region**: Pilih terdekat dengan lokasi Anda (misal: Southeast Asia untuk Indonesia)
5. Tunggu project selesai dibuat (~1 menit)

#### 1.2 Jalankan Database Schema

1. Di Supabase dashboard, buka **SQL Editor**
2. Buka file `DATABASE_SCHEMA.sql` dari project ini
3. Copy semua SQL code
4. Paste ke SQL Editor di Supabase
5. Klik **Run** atau Ctrl+Enter
6. Tunggu hingga semua table berhasil dibuat ✅

#### 1.3 Ambil Supabase Credentials

1. Di Supabase, buka **Settings** → **API**
2. Copy **Project URL** (format: `https://xxxxx.supabase.co`)
3. Copy **anon public key** (API Key)
4. Simpan kedua value ini (akan digunakan di .env)

### Step 2: Setup Project Lokal

#### 2.1 Clone/Download Project

```bash
# Jika sudah di folder BoxPoints, skip langkah ini
cd BoxPoints
```

#### 2.2 Create .env File

1. Di root folder project, buat file `.env`
2. Copy isi dari `.env.example`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

3. Ganti `your-project` dan `your-anon-key` dengan credentials dari Step 1.3
4. **Jangan share file .env ini!**

#### 2.3 Install Dependencies

```bash
npm install
```

Tunggu sampai selesai (biasanya 2-3 menit).

#### 2.4 Verify Installation

```bash
npm run dev
```

Output kurang lebih:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Press h + enter to show help
```

✅ **Server berhasil jalan!**

### Step 3: Test Aplikasi

1. Buka browser → `http://localhost:5173/`
2. Anda akan melihat halaman Home BOX Score Tracker
3. Coba:
   - **Buat Grup Baru** → isi nama grup + nama pemain
   - **Gabung Grup** → gunakan kode dari grup yang dibuat
   - **Lihat Aturan** → informasi permainan BOX

## 🎮 First Game Setup

### Scenario: Bermain dengan 4 Orang

#### Di Device Pembuat Grup:

1. Homepage → **Buat Grup Baru**
2. Isi form:
   - Nama Grup: "Geng Pontianak"
   - Batas Minus: -300
   - Jumlah Pemain: 4
   - Nama Pemain: Andi, Budi, Citra, Dedi
3. Klik **Buat Grup**
4. **Catat kode yang ditampilkan** (misal: GENG01)
5. Bagikan kode ke 3 pemain lainnya via WhatsApp

#### Di Device Pemain Lain:

1. Home page → **Gabung Grup**
2. Masukkan kode: `GENG01`
3. Otomatis masuk ke halaman Game

#### Mulai Input Ronde:

1. Di halaman Game → **Input Ronde Baru**
2. Follow 3 tabs:
   - **Tab 1 (CATE)**: Siapa yang menang?
   - **Tab 2 (Kartu)**: Tap kartu sisa untuk setiap pemain
   - **Tab 3 (Son)**: Ada yang gagal Son?
3. **Simpan Ronde** → Skor dihitung otomatis
4. Semua device akan update otomatis (refresh halaman jika perlu)

## 📱 Multi-Device Experience

Semua pemain di grup yang sama bisa:
- ✅ Lihat papan skor real-time
- ✅ Lihat riwayat semua ronde
- ✅ Lihat statistik pemain
- ✅ Tidak bisa input ronde (hanya orang dengan device pembuat yang bisa)

**Tips**: Designate satu orang untuk input ronde (biasanya yang paling cermat 😄)

## 🚀 Deploy ke Vercel (Production)

Setelah testing lokal berhasil, deploy ke Vercel untuk akses online:

### Vercel Deploy

1. **Push ke GitHub**:

```bash
git init
git add .
git commit -m "Initial BOX Score Tracker"
git branch -M main
git remote add origin https://github.com/USERNAME/box-score.git
git push -u origin main
```

2. **Import ke Vercel**:
   - Buka [vercel.com](https://vercel.com)
   - Klik **Add New** → **Project**
   - Pilih repo `box-score` dari GitHub
   - Framework: **Vite**
   - Root Directory: `.`

3. **Set Environment Variables**:
   - Klik **Environment Variables**
   - Tambah 2 variable:
     - `VITE_SUPABASE_URL`: `https://xxxxx.supabase.co`
     - `VITE_SUPABASE_ANON_KEY`: `your-anon-key`
   - Klik **Deploy**

4. **Wait & Done!**
   - Vercel akan build & deploy automatically
   - Link live: `https://box-score.vercel.app` (atau nama custom Anda)
   - Share link ke semua pemain!

## 🐛 Common Issues & Solutions

### Issue 1: "Cannot find module '@supabase/supabase-js'"

**Solution**:
```bash
npm install @supabase/supabase-js react-router-dom
npm run dev
```

### Issue 2: "VITE_SUPABASE_URL is not defined"

**Cause**: `.env` file not created atau tidak benar

**Solution**:
1. Pastikan file `.env` ada di root folder
2. Check isinya: ada `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`
3. Restart dev server: `Ctrl+C` lalu `npm run dev`

### Issue 3: Supabase connection error

**Solution**:
1. Check URL di `.env` - harus `https://xxxxx.supabase.co` (dengan https)
2. Verify Supabase project status di dashboard (harus green/active)
3. Check internet connection

### Issue 4: Styles tidak jalan (halaman putih)

**Solution**:
```bash
npm install -D tailwindcss postcss autoprefixer
npm run dev
```

### Issue 5: Port 5173 sudah dipakai

**Solution**:
```bash
# Jalankan di port lain
npm run dev -- --port 3000
```

## 📚 File Structure Reference

```
BoxPoints/
├── src/
│   ├── pages/          ← Halaman utama (Home, Game, dll)
│   ├── components/     ← Component reusable
│   ├── hooks/          ← Custom React hooks
│   ├── utils/          ← Utility functions & constants
│   ├── App.jsx         ← Router setup
│   ├── main.jsx        ← Entry point
│   └── index.css       ← Tailwind imports
├── public/             ← Static files
├── .env                ← Environment variables (JANGAN PUSH)
├── .env.example        ← Template .env
├── vite.config.js      ← Vite config
├── tailwind.config.js  ← Tailwind config
├── postcss.config.js   ← PostCSS config
├── package.json        ← Dependencies
├── DATABASE_SCHEMA.sql ← SQL schema untuk Supabase
├── README.md           ← Dokumentasi main
└── SETUP_GUIDE.md      ← Setup guide (file ini)
```

## 🎯 Next Steps

1. ✅ Setup Supabase
2. ✅ Setup lokal & run dev server
3. ✅ Test dengan 1-2 ronde
4. ✅ Deploy ke Vercel
5. ✅ Bagikan link ke semua pemain
6. 🎮 Mulai main & tracking skor!

## 💡 Tips & Tricks

- **Backup skor**: Supabase otomatis backup, tapi bisa export data dari dashboard
- **Custom batas minus**: Bisa pilih -500, -400, atau custom value
- **Multi-grup**: Bisa buat beberapa grup untuk grup berbeda
- **Statistics**: Check halaman Stats untuk ranking & average score

## 📞 Support & Troubleshooting

Jika ada masalah:

1. **Re-read this guide** - kadang jawaban sudah ada di atas 😄
2. **Check console errors** - buka DevTools (F12) → Console tab
3. **Check Supabase logs** - di Supabase dashboard → Logs
4. **Restart everything**:
   ```bash
   Ctrl+C (stop dev server)
   npm run dev (start again)
   ```

## 🎉 Selamat!

Jika semua sudah berjalan, **selamat!** Anda sekarang punya aplikasi pencatat skor BOX yang full-featured.

Enjoy bermain & tracking skor! 🎮📊

---

**Last Updated**: May 2026
**Version**: 1.0.0
