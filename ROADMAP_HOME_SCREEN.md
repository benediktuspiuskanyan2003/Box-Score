# 🏠 Home Screen & Architecture Decision

## 📊 Analisis Opsi

### Opsi 1: Login/Akun Dulu (Firebase Auth)
**Pros:**
- ✅ Struktur seperti UNO Online (profesional)
- ✅ Save profile & stats ke cloud
- ✅ Multiplayer online bisa di-build nanti
- ✅ User bisa login dari device berbeda

**Cons:**
- ❌ Butuh backend/Firebase setup (kompleks)
- ❌ Setup auth credentials
- ❌ Slower MVP
- ❌ Users offline tidak bisa main tanpa internet
- ❌ Overkill untuk offline score tracking

---

### Opsi 2: Home Screen Langsung (No Login)
**Pros:**
- ✅ MVP super cepat (1-2 hari)
- ✅ Works 100% offline
- ✅ Fokus ke gameplay dulu
- ✅ User bisa langsung main

**Cons:**
- ❌ Stats/history hanya di device (localStorage)
- ❌ Tidak bisa login dari device lain
- ❌ Limited cloud features

---

### Opsi 3: Simple Player Name Input (Recommended untuk MVP)
**Pros:**
- ✅ Cepat & praktis
- ✅ Works offline 100%
- ✅ Save name + stats ke localStorage
- ✅ Upgrade path jelas ke Login later
- ✅ UX lebih natural

**Cons:**
- ❌ Limited cloud sync (tapi bisa ditambah nanti)

---

## 🎯 Rekomendasi: OPSI 3 + Roadmap Bertahap

### Phase 2 (Sekarang - Home Screen MVP)
```
┌─────────────────────────────────────────┐
│     🎴 BOX CARD GAME - HOME SCREEN      │
├─────────────────────────────────────────┤
│                                         │
│  Welcome, [Player Name] 👋             │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  📊 OVERALL STATS               │   │
│  │  Total Rounds: 24               │   │
│  │  Win Rate: 62.5%                │   │
│  │  Best Score: +350 poin          │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌──────────────┐  ┌──────────────┐   │
│  │ 🎮 MAIN      │  │ 👥 GROUP     │   │
│  │   GAME       │  │   MANAGER    │   │
│  │              │  │              │   │
│  │ Setup & Play │  │ Manage       │   │
│  │ offline game │  │ groups &     │   │
│  │              │  │ keep score   │   │
│  └──────────────┘  └──────────────┘   │
│                                         │
│  ┌──────────────┐  ┌──────────────┐   │
│  │ 📋 HISTORY   │  │ ⚙️  SETTINGS │   │
│  │              │  │              │   │
│  │ Game history │  │ Profile      │   │
│  │ & stats      │  │ Settings     │   │
│  └──────────────┘  └──────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

### Flow Lokal (localStorage)
```
1. User launch app
   ↓
2. Check localStorage → Ada nama pemain?
   ├─ Ya → Show Home Screen
   └─ Tidak → Show "Enter Your Name" dialog
   
3. Home Screen → Pilih:
   ├─ Main Game → Setup game (4-5 players, mulai play)
   ├─ Group Manager → Buat group, track score by group
   ├─ History → Lihat game history (stored locally)
   └─ Settings → Ubah nama, clear data
   
4. Game selesai:
   ├─ Auto-save scores ke localStorage
   ├─ Store di History
   └─ Update Group stats (jika main dengan group)
```

---

## 🛠️ Implementation Plan

### Week 1: Home Screen
```
1. Player Name Entry Screen (first time)
2. Home Dashboard (stats overview)
3. localStorage structure for:
   - Player profile
   - Game history
   - Group data
4. Navigation between screens
```

### Week 2: Group Management (Score Tracking)
```
1. Create Group
2. Add Players to Group
3. Group History & Leaderboard
4. Export scores as CSV/PDF
```

### Week 3: History & Stats
```
1. Game History list
2. Filter by group/date
3. Replay game stats
4. Chart/graphs untuk trends
```

### Phase 3 (Future - Optional)
```
- Firebase Login (optional upgrade)
- Cloud sync scores
- Multiplayer online (separate feature)
- Social share
```

---

## 📱 Home Screen Components

### 1. Player Welcome Section
```
- Display current player name
- Quick stats (games played, total points)
- Edit profile button
```

### 2. Main CTA Buttons (Grid 2x2)
```
┌─────────────────┬─────────────────┐
│ 🎮 Main Game    │ 👥 Group Mgmt   │
├─────────────────┼─────────────────┤
│ 📋 History      │ ⚙️  Settings     │
└─────────────────┴─────────────────┘
```

### 3. Stats Cards
```
- Total Rounds Played
- Win Rate %
- Best Score
- Worst Score
- Average Score
```

### 4. Recent Games Widget
```
List of last 5 games:
- Date
- Players
- Winner
- Winner's Score
```

---

## 💾 localStorage Structure

```javascript
// Player Profile
{
  playerName: "John Doe",
  createdAt: "2026-06-04",
  totalGamesPlayed: 24,
  totalWins: 15,
  totalScore: 2350,
  bestScore: 350,
  worstScore: -400,
  lastPlayed: "2026-06-04T10:30:00Z"
}

// Game History
[
  {
    id: "game_1234567890",
    date: "2026-06-04",
    players: ["John", "Jane", "Bob", "Alice"],
    groupId: null,
    round: 3,
    winner: "John",
    scores: { John: 120, Jane: -50, Bob: -30, Alice: -40 },
    duration: "23 mins",
    gameState: {...} // Full state for replay
  },
  // ... more games
]

// Groups
[
  {
    id: "group_abc123",
    name: "Weekend Poker Club",
    createdAt: "2026-05-01",
    members: ["John", "Jane", "Bob", "Alice"],
    games: ["game_1", "game_2", "game_3"],
    leaderboard: {
      John: { wins: 5, totalScore: 350 },
      Jane: { wins: 3, totalScore: 120 },
      ...
    }
  }
]
```

---

## 🎨 Visual Reference (UNO-style)

### Color Scheme
```
- Primary: Blue (#3B82F6) - Action buttons
- Accent: Yellow (#FBBF24) - CTA
- Success: Green (#10B981) - Win/positive
- Warning: Red (#EF4444) - Loss/negative
- Background: Dark (#0F172A) - Gaming feel
```

### Typography
```
- Heading: Bold, Large (2-4xl)
- Stats: Medium, Prominent (2xl)
- Body: Regular (base)
- Caption: Small, Muted (xs)
```

---

## ✅ Checklist Implementation

### Phase 2.1: Home Screen
- [ ] Create HomePage.jsx component
- [ ] Player name entry dialog
- [ ] localStorage integration
- [ ] Navigation bar
- [ ] Stats dashboard
- [ ] Recent games widget

### Phase 2.2: Refinements
- [ ] Mobile responsive
- [ ] Dark theme optimization
- [ ] Performance (lazy load history)
- [ ] Error handling

---

## 🚀 Why This Approach?

**Fokus pada gameplay dulu:**
- MVP bisa jalan dalam 1-2 minggu
- 100% offline, no backend complexity
- User bisa langsung main & track score

**Upgrade path clear:**
- Bisa add Firebase login later (non-breaking)
- Bisa add multiplayer later
- Existing localStorage data tetap valid

**Better UX:**
- Users tidak perlu akun untuk main
- Casual gaming feel (like mobile games)
- Pro: Bisa upgrade ke social features nanti

---

## 💡 Alternative: Phase 2 + Phase 3 Hybrid

Jika Anda ingin online features dari awal:
```
Phase 2: Home + Groups (localStorage)
Phase 2.5: Add Firebase Auth (optional)
Phase 3: Cloud Sync + Online Multiplayer
```

Tapi ini lebih kompleks dan slower.

---

## Rekomendasi Final

**GO WITH OPSI 3 + Local MVP:**

```
Week 1: Home Screen (localStorage)
Week 2: Group Management 
Week 3: History & Stats
Phase 3: Firebase + Online (jika dibutuhkan)
```

**Alasan:**
1. ✅ Fastest to MVP
2. ✅ Works offline (penting untuk casual gaming)
3. ✅ Clear upgrade path
4. ✅ Better UX (no login friction)
5. ✅ Cocok untuk game offline score tracking

**Next step:**
- Setup HomePage.jsx component
- Design home screen layout
- Setup localStorage helper functions
- Integrate dengan existing GameContext

---

Apa pendapat Anda? Mau proceed dengan Opsi 3 & mulai home screen?
