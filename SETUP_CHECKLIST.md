# ✅ BOX Score Tracker - Setup Checklist

Use this checklist to ensure everything is properly configured before using the application.

## Phase 1: Supabase Setup ☁️

- [ ] Go to supabase.com and sign up/login
- [ ] Create new project (name: "box-score")
- [ ] Wait for project to be ready (~1 minute)
- [ ] Go to Settings → API
- [ ] Copy Project URL (format: https://xxxxx.supabase.co)
- [ ] Copy Anon public key (long string)
- [ ] Go to SQL Editor
- [ ] Open file: `DATABASE_SCHEMA.sql`
- [ ] Copy entire SQL content
- [ ] Paste in Supabase SQL Editor
- [ ] Click Run / Press Ctrl+Enter
- [ ] Verify all 5 tables created: ✓ groups, ✓ players, ✓ games, ✓ rounds, ✓ round_scores

**Status**: [ ] Complete

---

## Phase 2: Local Setup 💻

- [ ] Navigate to BoxPoints folder
- [ ] Create file named `.env` (exactly this name, no extension)
- [ ] Copy below text to .env:
  ```
  VITE_SUPABASE_URL=https://xxxxx.supabase.co
  VITE_SUPABASE_ANON_KEY=your-anon-key-here
  ```
- [ ] Replace `xxxxx.supabase.co` with your actual Supabase URL
- [ ] Replace `your-anon-key-here` with your actual anon key
- [ ] Save .env file
- [ ] Open terminal in BoxPoints folder
- [ ] Run: `npm install` (if not already done)

**Status**: [ ] Complete

---

## Phase 3: Development Server 🚀

- [ ] In terminal, run: `npm run dev`
- [ ] Wait for message: "VITE v5.x.x ready in xxx ms"
- [ ] Open browser: http://localhost:5173
- [ ] You should see "BOX Score" homepage
- [ ] Verify no red error messages in browser console (F12)

**Status**: [ ] Complete

---

## Phase 4: Functional Testing 🎮

### Test 1: Create Group
- [ ] Click "Buat Grup Baru"
- [ ] Fill form:
  - Nama Grup: "Test Group"
  - Batas Minus: -300
  - Jumlah Pemain: 4
  - Nama: Player1, Player2, Player3, Player4
- [ ] Click "Buat Grup"
- [ ] See group code (6 characters)
- [ ] Note down the code

**Status**: [ ] Complete

### Test 2: Game Page
- [ ] Click "Mulai Permainan"
- [ ] See scoreboard with 4 players
- [ ] Click "Input Ronde Baru"

**Status**: [ ] Complete

### Test 3: Input Ronde
- [ ] Tab 1 (CATE): Select Player1 as CATE, 0 joker
- [ ] Tab 2 (Kartu): For Player2, tap: A, K, 5 (should be -30)
- [ ] Tab 3 (Son): No one failed Son
- [ ] Preview shows scores
- [ ] Click "Simpan Ronde"
- [ ] Go back to Game page
- [ ] Verify scores updated on scoreboard

**Status**: [ ] Complete

### Test 4: Navigation
- [ ] Click "📋 Riwayat" (History) - see round you just played
- [ ] Click "📊 Stat" (Stats) - see player statistics
- [ ] Click "📖 Aturan" (Rules) - read game rules
- [ ] All pages load without errors

**Status**: [ ] Complete

---

## Phase 5: Multi-Device Test 📱

If you have another device:

- [ ] On device 2, go to http://localhost:5173 (same local network)
  - OR if deployed: go to live URL
- [ ] Click "Gabung Grup"
- [ ] Enter group code from Test 1
- [ ] Should see same group on device 2
- [ ] Verify all 4 players visible
- [ ] Verify scoreboard matches device 1

**Status**: [ ] Complete

---

## Phase 6: Final Checks ✨

- [ ] No error messages in browser console (F12)
- [ ] All buttons responsive to clicks
- [ ] Forms validate (can't submit empty)
- [ ] Scores calculate correctly
- [ ] LocalStorage working (refresh page, last group code remembered)
- [ ] .env file protected in .gitignore

**Status**: [ ] Complete

---

## Troubleshooting

### Issue: "Cannot find module '@supabase/supabase-js'"

**Solution**:
```bash
npm install @supabase/supabase-js react-router-dom
npm run dev
```

### Issue: "VITE_SUPABASE_URL is not defined"

**Solution**:
1. Check .env file exists in root folder
2. Verify content: `VITE_SUPABASE_URL=...`
3. Verify `VITE_SUPABASE_ANON_KEY=...`
4. Restart dev server: Ctrl+C, then `npm run dev`

### Issue: "Failed to connect to Supabase"

**Solution**:
1. Check URL in .env starts with `https://`
2. Verify Supabase project is active (not suspended)
3. Check internet connection
4. Check credentials are correct (no typos)

### Issue: Styles not showing (page looks ugly)

**Solution**:
```bash
npm install -D tailwindcss postcss autoprefixer
npm run dev
```

### Issue: Port 5173 is already in use

**Solution**:
```bash
npm run dev -- --port 3000
# Now open http://localhost:3000
```

---

## Deployment Checklist (Optional) 🌐

When ready to go live:

- [ ] All local tests pass
- [ ] Push to GitHub repository
- [ ] Create Vercel account
- [ ] Connect Vercel to GitHub repo
- [ ] Set environment variables in Vercel:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- [ ] Deploy on Vercel
- [ ] Test live URL
- [ ] Share URL with friends

---

## Success Criteria ✅

You've successfully setup BOX Score Tracker when:

1. ✅ Local dev server runs without errors
2. ✅ Homepage loads with all buttons visible
3. ✅ Can create a new group and get a 6-char code
4. ✅ Can join group with code
5. ✅ Can input a ronde and see scores update
6. ✅ Can view History and Stats pages
7. ✅ No red errors in browser console
8. ✅ App works on multiple devices (same network)

---

## Next: Start Playing! 🎮

1. Create a group with your friends
2. Have each person join with the code
3. Start playing and tracking scores!
4. Check stats after each game

---

**Checklist Created**: May 25, 2026
**Status**: Ready to Setup

Good luck! 🚀
