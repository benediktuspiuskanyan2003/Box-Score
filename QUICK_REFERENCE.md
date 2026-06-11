# 🚀 BOX Score Tracker - Quick Reference Card

## 📦 What Was Built

Complete web application untuk pencatat skor **BOX** (permainan kartu lokal 4-5 orang).

## ✨ Key Features

| Feature | Status |
|---------|--------|
| Create/Join Groups | ✅ |
| Multi-player Support | ✅ |
| Interactive Card Calculator | ✅ |
| Auto Score Calculation | ✅ |
| Auto Reset on Minus Limit | ✅ |
| Round History | ✅ |
| Player Statistics | ✅ |
| Mobile Responsive | ✅ |
| Real-time Sync | ✅ |
| Multi-device Access | ✅ |

## 🗂️ Project Structure

```
BoxPoints/
├── src/
│   ├── pages/         (9 pages)
│   ├── components/    (6 components)
│   ├── hooks/         (3 custom hooks)
│   └── utils/         (3 utilities)
├── DATABASE_SCHEMA.sql
├── README.md
├── SETUP_GUIDE.md
└── DEVELOPMENT.md
```

## 🎯 Quick Start (5 Minutes)

### 1️⃣ Setup Supabase
```
- Create project at supabase.com
- Run DATABASE_SCHEMA.sql in SQL Editor
- Copy Project URL & Anon Key
```

### 2️⃣ Configure Project
```
- Edit .env with Supabase credentials
- (Leave package.json as-is, already configured)
```

### 3️⃣ Run Development Server
```bash
npm run dev
# Opens http://localhost:5173
```

### 4️⃣ Test
```
- Create group → share code
- Join with code
- Input ronde → check scores
```

## 📋 File Reference

### Configuration
| File | Purpose |
|------|---------|
| vite.config.js | Vite bundler |
| tailwind.config.js | Tailwind CSS |
| postcss.config.js | PostCSS |
| .env | Environment variables |
| package.json | Dependencies |

### Source Code (9+6+3+3 = 21 files)
| Type | Count | Location |
|------|-------|----------|
| Pages | 9 | src/pages/ |
| Components | 6 | src/components/ |
| Hooks | 3 | src/hooks/ |
| Utilities | 3 | src/utils/ |

### Documentation
| File | Content |
|------|---------|
| README.md | Overview & features |
| SETUP_GUIDE.md | Step-by-step setup |
| DEVELOPMENT.md | Architecture notes |
| DATABASE_SCHEMA.sql | SQL for Supabase |

## 🔑 Key Technologies

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS |
| Routing | React Router v6 |
| Database | Supabase PostgreSQL |
| State | React Hooks |

## 📱 Routing Map

```
/                    → Home (menu)
/create              → Create group
/join                → Join group
/group/:code         → Show code
/game/:code          → Scoreboard
/game/:code/round    → Input ronde
/game/:code/history  → History
/game/:code/stats    → Statistics
/rules               → Rules
```

## 🎮 Game Features

### Scoring System
- **CATE (Menang)**: +50 + 100 per joker
- **Kalah**: -card_value - 100 per joker
- **Son Gagal**: -50
- **Reset**: Auto reset jika ≤ minus limit

### Input Interface (3 Tabs)
1. **CATE Tab**: Pilih pemain + joker count
2. **Kartu Tab**: Tap kartu untuk setiap pemain
3. **Son Tab**: Mark pemain yang gagal Son

### Data Tracking
- ✅ All rounds saved
- ✅ Player statistics (avg, wins, resets)
- ✅ Full history
- ✅ Multi-group support

## 🚀 Deployment

### Local
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

### Deploy to Vercel
```
1. Push ke GitHub
2. Connect repo di vercel.com
3. Set environment variables
4. Deploy!
```

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 5173 taken | `npm run dev -- --port 3000` |
| Supabase error | Check .env credentials |
| Styles missing | Check Tailwind config |
| Module not found | Run `npm install` |

## 📊 Database Tables

```
groups           - Group settings
  ├─ id, code, name, minus_limit
players          - Roster
  ├─ id, group_id, name
games            - Game instance
  ├─ id, group_id, started_at, finished_at
rounds           - Individual rounds
  ├─ id, game_id, round_number
round_scores     - Per-player scores
  ├─ id, round_id, player_id, is_cate, joker_used/held, son_failed, card_score, round_total, score_reset
```

## 💡 Tips

- 📍 **One input device**: Designate 1 person untuk input ronde
- 📱 **Multi-view**: Semua bisa lihat dari device mereka masing-masing
- 💾 **Auto-save**: All data saved ke Supabase
- 🔄 **Last group**: Di-save di localStorage untuk quick access
- ⚙️ **Custom minus**: Bisa set custom batas minus per group

## 📞 Support Resources

| Resource | Link |
|----------|------|
| React Docs | react.dev |
| Supabase Docs | supabase.com/docs |
| Tailwind | tailwindcss.com |
| Vite | vitejs.dev |

## 📝 Next Steps

1. ✅ Setup Supabase
2. ✅ Configure .env
3. ✅ Run `npm run dev`
4. ✅ Test locally
5. ✅ Deploy to Vercel
6. ✅ Share link dengan friends
7. 🎮 Play & track scores!

## 🎉 Status

```
┌──────────────────────────────────┐
│ ✅ READY TO USE                  │
│ ✅ FULLY DOCUMENTED              │
│ ✅ PRODUCTION-READY              │
│ ✅ MOBILE-RESPONSIVE             │
└──────────────────────────────────┘
```

---

**Version**: 1.0.0
**Last Updated**: May 25, 2026

For detailed info, see README.md, SETUP_GUIDE.md, or DEVELOPMENT.md
