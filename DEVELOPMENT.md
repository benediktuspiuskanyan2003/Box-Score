# 🏗️ BOX Score Tracker - Development Notes

## Architecture Overview

BOX Score Tracker menggunakan **client-side React** dengan **Supabase backend** untuk real-time data management.

### Technology Stack

```
Frontend:  React 18 + Vite + React Router v6
Styling:   Tailwind CSS
Backend:   Supabase (PostgreSQL + REST API)
Hosting:   Vercel (recommended) atau platform lain
Storage:   Browser LocalStorage untuk last group code
```

### Data Flow

```
User Action
    ↓
React Component (hooks)
    ↓
Custom Hook (useGroup, useGame, useRound)
    ↓
Supabase Client (REST API)
    ↓
PostgreSQL Database
    ↓
Response ← Supabase
    ↓
State Update
    ↓
UI Re-render
```

## Key Components & Hooks

### Custom Hooks

#### `useGroup` - Group Management
- `fetchGroup(code)` - Ambil data grup berdasarkan kode
- `createGroup(name, minusLimit, playerNames)` - Buat grup baru dengan pemain
- `fetchPlayers(groupId)` - Ambil daftar pemain dalam grup
- `getLastGroup()` - Ambil grup terakhir dari localStorage

#### `useGame` - Game Instance
- `getOrCreateGame()` - Get/create game untuk grup
- `fetchRounds(gameId)` - Ambil semua rounds dalam game
- `finishGame(gameId)` - Tandai game selesai

#### `useRound` - Round Scoring
- `calculateAndSaveRound(...)` - Hitung skor ronde & simpan
- `getGameStandings(gameId)` - Ambil standings (total skor per pemain)
- Core logic: calculate scores, check resets, save to DB

### UI Components

#### `CardCalculator` - Interactive Card Input
- Tap-based interface untuk select kartu sisa
- Real-time total calculation
- Max 8 per kartu (2 sets + jokers)

#### `CateSelector` - CATE Selection
- Pilih siapa yang CATE (menang)
- Input jumlah joker digunakan
- Real-time bonus calculation

#### `SunFailSelector` - Sun Failure Marking
- Mark pemain yang gagal Sun
- Warning jika 2+ pemain gagal (ronde diulang)

#### `PlayerRow` - Score Display
- Tampilkan pemain + skor
- Highlight top player
- Show reset status

#### `BottomNav` - Navigation
- Bottom tab navigation (4 tabs)
- Active state indicator
- Links ke Game, History, Stats, Rules

## Scoring Logic

### Score Calculation Flow

```javascript
function calculateRoundScore({
  isCate,
  jokerUsed,      // joker used if CATE
  jokerHeld,      // joker held if not CATE
  sunFailed,      // -50 penalty
  cardScore       // minus value dari kartu sisa
})
```

**Conditions:**
1. **Sun Gagal** → `-50` (overrides everything)
2. **CATE** → `+50 + (jokerUsed * 100)`
3. **Not CATE** → `-(cardScore) - (jokerHeld * 100)`

### Reset Logic

After each round:
1. Calculate total score untuk setiap pemain
2. Check jika total ≤ minusLimit
3. Jika ya → set score ke 0, flag `score_reset = true`
4. Update di UI

```javascript
// Example: minusLimit = -300
totalScore = -350 → RESET ke 0
totalScore = -250 → NO RESET, tetap -250
```

## Database Schema

### Tables

1. **groups** - Grup permainan
   - id (UUID PK)
   - code (UNIQUE, 6 chars)
   - name
   - minus_limit
   - created_at

2. **players** - Daftar pemain
   - id (UUID PK)
   - group_id (FK → groups)
   - name
   - created_at

3. **games** - Instance permainan
   - id (UUID PK)
   - group_id (FK → groups)
   - started_at
   - finished_at (nullable)

4. **rounds** - Ronde dalam game
   - id (UUID PK)
   - game_id (FK → games)
   - round_number
   - is_reset (ada reset skor)
   - created_at

5. **round_scores** - Skor per pemain per ronde
   - id (UUID PK)
   - round_id (FK → rounds)
   - player_id (FK → players)
   - is_cate
   - joker_used
   - joker_held
   - sun_failed
   - card_score
   - round_total
   - score_reset

### Relationships

```
groups (1) ──→ (M) players
          ├──→ (M) games
                  └──→ (M) rounds
                          └──→ (M) round_scores
                                  ├──→ (1) players (back ref)
```

## Routing Structure

```
/                    → Home (main menu)
/create              → Create group form
/join                → Join group by code
/group/:code         → Show group code & start
/game/:groupCode     → Main scoreboard
/game/:groupCode/round   → Input ronde (multi-tab)
/game/:groupCode/history → Ronde history
/game/:groupCode/stats   → Player statistics
/rules               → Game rules explanation
```

## State Management Strategy

**No Redux/Context** - using local React state + custom hooks

```
Component State:
├── Local UI state (active tab, loading, error)
└── Data from hooks (group, players, game, rounds)

Hook State:
├── fetched data (group, players, games, rounds)
├── loading state
└── error state
```

**Data Sync:**
- Hooks fetch dari Supabase
- Components re-render on state change
- No auto-refresh (manual fetch or page refresh needed)

## localStorage Usage

```javascript
// Last group code
localStorage.setItem('lastGroupCode', code);
const code = localStorage.getItem('lastGroupCode');

// Clear
localStorage.removeItem('lastGroupCode');
```

**Use Case**: Quickly access last group tanpa input kode ulang

## Error Handling

### Strategy

1. **Try-catch** di setiap async operation
2. **Error state** di hooks
3. **Error UI** di components (red alert boxes)
4. **Console logging** untuk debugging

```javascript
try {
  const data = await supabase.from('table').select();
} catch (err) {
  setError(err.message);
  // User akan lihat error message di UI
}
```

## Performance Optimizations

1. **Memoization**: Components yang expensive di-memoize jika perlu
2. **Query Optimization**: Hanya fetch data yang dibutuhkan
3. **Lazy Loading**: Pages di-load on-demand via React Router
4. **Image Optimization**: Emoji hanya, no heavy images
5. **Bundle Size**: Minimal dependencies (React, React Router, Supabase)

## Development Tips

### Debugging

1. **Browser DevTools** (F12):
   - Console: error messages
   - Network: Supabase API calls
   - Storage: localStorage values

2. **Supabase Logs**:
   - Dashboard → Logs section
   - See all API calls & errors

3. **React DevTools**:
   - Install extension
   - Inspect component state
   - Trace re-renders

### Testing

Manual testing checklist:
- [ ] Buat grup & cek code generated
- [ ] Join grup dengan code
- [ ] Input ronde (all 3 tabs)
- [ ] Verify skor calculation
- [ ] Check reset logic
- [ ] View history
- [ ] View stats
- [ ] Multi-device sync

### Common Bugs & Fixes

1. **Skor tidak update**: Refresh page atau re-fetch game data
2. **Styles hilang**: Check Tailwind CSS build
3. **Supabase error**: Check credentials di .env
4. **State not syncing**: Manual page refresh (limitations of REST API)

## Future Enhancements

Potential improvements:

1. **Real-time Sync**: WebSocket atau Supabase Realtime API
2. **Authentication**: User accounts & roles
3. **Offline Support**: PWA + offline data sync
4. **Dark Mode**: Theme toggle
5. **Export Data**: CSV/PDF export untuk history
6. **Analytics**: Leaderboard across groups
7. **Mobile App**: React Native version
8. **Voice Input**: Dictation untuk input kartu
9. **AI Stats**: Prediction & analysis
10. **Multiplayer Rooms**: Live stream feature

## Deployment Checklist

Before deploying to production:

- [ ] Test all routes & flows
- [ ] Verify Supabase tables created
- [ ] Check .env variables correct
- [ ] Run `npm run build` locally
- [ ] Test production build: `npm run preview`
- [ ] Set env vars on hosting platform
- [ ] Deploy & verify live
- [ ] Test on real devices
- [ ] Monitor error logs

## Code Style

- **Naming**: camelCase untuk variables/functions, PascalCase untuk components
- **Formatting**: Automatic via Prettier (if setup)
- **Comments**: Docstrings untuk functions, inline comments untuk logic
- **Imports**: Group by: React → external libs → local files

## Resources

- [React Docs](https://react.dev)
- [Vite Docs](https://vitejs.dev)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com)
- [React Router](https://reactrouter.com)

---

**Last Updated**: May 2026
**Version**: 1.0.0

Happy coding! 🚀
