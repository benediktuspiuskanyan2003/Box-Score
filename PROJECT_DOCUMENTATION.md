# 🃏 BOX Card Game - Project Documentation

## 📋 Project Overview

**Game Name:** BOX (Indonesian Traditional Card Game)  
**Platform:** Web (React 18 + Vite 8.0.14)  
**Status:** Phase 2 MVP - Game Digital (Gameplay Implementation)  
**Players:** 4-5 players per game  
**Deck:** 108 cards (Standard playing cards + 4 Jokers)

---

## 🎮 Game Rules Summary

### Card Deck (108 cards)
- 4 Suits: ♠️ ♥️ ♦️ ♣️
- Values per suit: 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K, A (12 cards × 4 = 48 cards)
- 4 Jokers (special wildcards)

### Win Conditions - CATE (Complete Hand)
**CATE Tangan (Hand CATE):**
- Get 8-card combo at start of game
- Score: +50 points
- Player is eliminated from round

**CATE (Regular Win):**
- Play all cards (empty hand) during game
- Score: +50 base points
- Other players get penalties (remaining card values)

### Card Combinations

**SON (Sequence of consecutive same suit):**
- Minimum: 3 cards same suit in sequence (e.g., ♠3-4-5)
- Maximum: 13 cards (3 through A)
- Joker: Can fill gaps in sequence
- Usage: Create new SON or extend existing SON

**BOX (Set of same rank):**
- Minimum: 3 same rank cards (e.g., 3 Kings)
- First SON phase: Minimum 5 cards required
- Play phase: Minimum 3 cards required
- Usage: Create new BOX or add cards to existing BOX

### Game Phases

**Phase 1: First SON (first_son)**
- EVERY player MUST create at least one SON
- Cannot move to play phase until all active players have SON
- BOX creation requires 5+ cards (minimum)
- If player can't make SON → "Gagal Son" (declare fail)

**Phase 2: Main Play (play)**
- Players can create/extend SON or create/add to BOX
- Or pass turn to next player
- BOX creation requires 3+ cards (minimum)

**Phase 3: Round End (round_end)**
- Show scores for all players
- Display Total Score (cumulative)
- Button "Ronde Berikutnya" to continue

### Scoring System

**Scoring Rules:**
- CATE winner: +50 points
- Non-CATE players: -(sum of remaining card values)
  - Number cards (3-10): Face value
  - Face cards (J, Q, K): 10 points each
  - Ace (A): 15 points
  - Joker: 100 points each

**Round End Logic:**
- All non-CATE players pass → Round ends
- Scores calculated for all remaining players
- Scores added to cumulative totalScore

**Gagal Son Rules (4 Players):**
- Any player declares fail → Round RESTARTS
- Failed player gets: 0 points (no penalty)
- All cards reshuffled and redealt

**Gagal Son Rules (5 Players):**
- 1 player fails → Game CONTINUES, failed player: -50 points
- 2+ players fail → Round RESTARTS, all failed: 0 points

### Turn & Pass Logic

**Normal Turn Progression:**
```
Player 1 → Player 2 → Player 3 → Player 4 → Player 2 (loops, skip passed)
```

**After Player Passes:**
- Player marked as "passed"
- Skipped in turn rotation for rest of round
- When all non-CATE players have passed → Round ends
- Next round: Player with highest totalScore starts first

---

## 🛠️ Technology Stack

### Frontend
- **Framework:** React 18 (Hooks, Context API)
- **Build Tool:** Vite 8.0.14 (2.4s build time)
- **Routing:** React Router v7.15.1
- **CSS:** Tailwind CSS v3
- **State Management:** React Context + useReducer
- **Dev Server:** http://localhost:5173

### Project Structure
```
BoxPoints/
├── src/
│   ├── components/
│   │   └── GamePlay/
│   │       ├── CardHand.jsx         # Player's hand display
│   │       ├── CardTable.jsx        # Table cards (SON/BOX)
│   │       └── TurnIndicator.jsx    # Current player info
│   │
│   ├── context/
│   │   └── GameContext.jsx          # Global game state + actions
│   │
│   ├── engine/
│   │   ├── gameEngine.js            # Core game logic
│   │   ├── cardValidator.js         # Card validation & rules
│   │   └── deckManager.js           # Deck & dealing logic
│   │
│   ├── pages/
│   │   ├── PlayGame.jsx             # Main game UI
│   │   ├── GameSetup.jsx            # Player setup screen
│   │   ├── GroupManagement.jsx      # Group management
│   │   └── LandingPage.jsx          # Landing/lobby
│   │
│   ├── App.jsx                      # Router config
│   └── main.jsx                     # Entry point
│
├── package.json
├── vite.config.js
└── tailwind.config.js
```

---

## 📊 Game State Structure

### GameState (Context)
```javascript
{
  players: [
    {
      id: string,
      name: string,
      hand: Card[],           // Player's current cards
      score: number,          // Round score
      totalScore: number,     // Cumulative score
      status: 'active' | 'passed' | 'cate' | 'cate_tangan' | 'son_failed'
    }
  ],
  
  currentTurnIdx: number,     // Index of current player
  round: number,              // Current round (1, 2, 3...)
  phase: 'first_son' | 'play' | 'round_end',
  
  meja: {                      // Table state
    sons: [{ id, cards, playerId }],    // SON sequences
    boxes: [{ id, cards, playerId }]    // BOX sets
  },
  
  deck: Card[],               // Remaining undealt cards
  history: Move[],            // Game action history
  minusLimit: number,         // Max negative score allowed (-300, -400, etc)
  sonFirstCompleted: number[],// Player indices who completed first SON
  cateType: null | 'tangan' | 'normal',
  gameOver: boolean
}
```

### Card Object
```javascript
{
  suit: '♠' | '♥' | '♦' | '♣',
  rank: '3' | '4' | ... | 'K' | 'A' | 'JOKER',
  label: '3' | '4' | ... | 'K' | 'A' | 'JOKER',
  value: 3-14 (numeric value for sequence checking),
  isJoker: boolean
}
```

---

## 🎯 Core Game Engine Functions

### File: `gameEngine.js`

**`initializeGame(players, minusLimit)`**
- Initializes new game
- Creates deck, shuffles, deals cards
- Checks for CATE Tangan
- Returns initial gameState

**`playNewSon(gameState, playerIdx, cardIndices)`**
- Player creates new SON
- Validates 3+ consecutive same suit
- Positions Jokers in gaps (if any)
- Checks if player achieved CATE
- Auto-advances turn

**`playNewBox(gameState, playerIdx, cardIndices)`**
- Player creates new BOX
- Validates 3+ (or 5+ in first_son) same rank
- Removes duplicates automatically
- Checks CATE condition
- Auto-advances turn

**`extendSon(gameState, playerIdx, cardIndices, sonIdx, position)`**
- Extends existing SON left or right
- Validates cards extend sequence correctly
- Position can be 'left' or 'right'
- Handles Joker validation
- Auto-advances turn

**`addToBox(gameState, playerIdx, cardIdx, boxIdx)`**
- Adds single card to existing BOX
- Card must be same rank as BOX
- Validates with isValidBox()
- Checks CATE
- Auto-advances turn

**`playerPass(gameState, playerIdx)`**
- Player passes their turn
- Marks player as 'passed'
- Calculates remaining hand score
- Auto-advances to next active player
- Detects if round ended (all passed)

**`declareFailFirstSon(gameState, playerIdx)`**
- Player declares cannot make SON (first_son phase only)
- Marks as 'son_failed'
- Determines if round restarts (based on player count + fail count)
- Returns restart flag for UI handling

**`nextRound(gameState)`**
- Accumulates current round scores to totalScore
- Finds player with highest totalScore
- That player becomes currentTurnIdx (starts next round)
- New deck created and dealt
- Phase reset to 'first_son'
- Returns new gameState

### File: `cardValidator.js`

**`isValidSon(cards)`**
- Validates 3+ consecutive same suit
- Handles Joker as wildcard
- Returns `{ valid: boolean, reason: string }`

**`isValidBox(cards)`**
- Validates 3+ same rank
- Rejects duplicate ranks
- Returns `{ valid: boolean, reason: string }`

**`canExtendSonMultiple(sonCards, extendCards, position)`**
- Checks if extendCards extend existing SON
- Position: 'left' or 'right'
- Validates against Joker conflicts
- Returns `{ valid: boolean }`

**`getValidMoves(hand, sons, boxes)`**
- Returns all possible moves for current hand
- Includes: create SON, create BOX, extend SON, add to BOX
- Used for visual highlighting in UI

**`checkCateTangan(hand)`**
- Checks if 8-card hand contains valid CATE
- Must be 3+ consecutive same suit OR 3+ same rank

---

## 🔄 Game Flow

```
1. SETUP SCREEN
   └─→ Player selects 4-5 players, minusLimit
   
2. INIT GAME (initializeGame)
   └─→ Deck shuffled, cards dealt
   └─→ Check CATE Tangan for each player
   └─→ Phase: first_son, currentTurnIdx: 0
   
3. FIRST SON PHASE (phase === 'first_son')
   ├─→ Current player MUST create SON (3+ consecutive same suit)
   ├─→ OR declare "Gagal Son" (fail)
   ├─→ If fail: check player count
   │   ├─ 4 players: ANY fail → restart round
   │   └─ 5 players: 1 fail → -50 poin + continue
   │                 2+ fail → restart round
   ├─→ After player makes SON, turn advances to next player
   ├─→ When ALL active players made SON → Phase: play
   
4. PLAY PHASE (phase === 'play')
   ├─→ Current player can:
   │   ├─ Create SoN (3+)
   │   ├─ Create BOX (3+)
   │   ├─ Extend existing SON
   │   ├─ Add to existing BOX
   │   └─ PASS (if can't play)
   │
   ├─→ If player plays all cards → CATE!
   │   ├─ Score: +50
   │   ├─ Other players get -score (remaining cards)
   │   └─ Phase: round_end
   │
   ├─→ If player passes
   │   ├─ Mark as 'passed'
   │   ├─ Calculate score (remaining cards)
   │   ├─ Turn advances to next active player
   │   ├─ Check: all non-CATE passed?
   │   │   └─ YES → Phase: round_end
   │   │   └─ NO → Continue to next player
   │
   └─→ Repeat until CATE or all passed
   
5. ROUND END (phase === 'round_end')
   ├─→ Show scores for all players
   ├─→ Show totalScore (cumulative)
   ├─→ UI displays "RONDE SELESAI!" screen
   │
   ├─→ Button "Ronde Berikutnya"
   │   ├─ Calls nextRound()
   │   ├─ Accumulates scores to totalScore
   │   ├─ Finds player with highest totalScore
   │   ├─ Sets that player as currentTurnIdx
   │   ├─ New deck dealt
   │   ├─ Phase: first_son
   │   └─ Back to step 3
   │
   └─→ Button "Kembali ke Lobby"
       └─ Navigate to landing page
```

---

## 🎨 UI Components

### PlayGame.jsx (Main Game Screen)
- **Header:** Round number, current phase, active player count
- **Turn Indicator:** Shows whose turn it is
- **Player Status:** All players with status badges (Active, Passed, CATE, etc)
- **Card Table:** Displays all SON and BOX on table
- **Card Hand:** Current player's hand with visual highlights
- **Action Buttons:** SON, BOX, Pass, Gagal Son (first_son only)

### Visual Indicators (Tailwind)
- **Green glow:** Valid moves (canExtendSonMultiple)
- **Purple glow:** Selected cards
- **Purple scale:** Current player in status indicator
- **Red border:** Passed status
- **Green border:** CATE status
- **Blue border:** CATE TANGAN status

### Round End Screen
- Shows all players with:
  - Name and index
  - Current status (CATE, PASSED, etc)
  - Round score (can be + or -)
  - Total score (cumulative)
- Two buttons: "Ronde Berikutnya" and "Kembali ke Lobby"

---

## 🐛 Known Issues & Fixes (Phase 2)

### ✅ FIXED Issues

1. **Joker Extend Validation** ✅
   - Issue: Couldn't extend SON after Joker-filled position
   - Fix: Modified canExtendSonMultiple() to use flexible validation

2. **Joker Positioning** ✅
   - Issue: Jokers appended to end instead of filling gaps
   - Fix: playNewSon() uses gap-detection algorithm

3. **Gagal Son -0 Poin Logic** ✅
   - Issue: Always gave -50 poin regardless of restart
   - Fix: Only set score -50 if !willRestart

4. **Duplicate Card Validation** ✅
   - Issue: isValidSon() used Set to remove duplicates
   - Fix: Properly validates no duplicate ranks

5. **Pass Auto-Advance** ✅
   - Issue: UI stuck showing "SUDAH PAS" message
   - Fix: Removed passMessage-driven UI, rely on gameState

6. **Next Round - Highest Score Start** ✅
   - Issue: Always started from Player 1
   - Fix: nextRound() finds highest totalScore, sets as currentTurnIdx

### 🟡 Current Features
- ✅ 4-5 player game setup
- ✅ First SON phase enforcement
- ✅ Play phase with create/extend/add moves
- ✅ Pass functionality with auto-advance
- ✅ CATE detection and scoring
- ✅ CATE Tangan detection at game start
- ✅ Gagal Son handling (4p and 5p variants)
- ✅ Round end screen
- ✅ Next round with highest score starting
- ✅ Total score tracking

---

## 🚀 Recent Updates (Latest Session)

### Changes Made:
1. **nextRound() Enhancement:**
   - Now accumulates round scores to totalScore before reset
   - Finds player with highest totalScore
   - Sets that player as currentTurnIdx

2. **PlayGame.jsx UI Update:**
   - Round end screen now shows:
     - "Total: [score]" (cumulative)
     - Round score labeled as "ronde ini"

3. **Pass Message Fix:**
   - Auto-clear after 2 seconds
   - Non-blocking notification
   - UI driven by gameState, not passMessage state

---

## 🔧 How to Run

### Development
```bash
cd BoxPoints
npm install
npm run dev
# Server runs at http://localhost:5173
```

### Build
```bash
npm run build
# Output in dist/ folder
```

### Testing
- Manual testing via dev server
- Test scenarios:
  - 4 player game with Gagal Son
  - 5 player game with mixed Gagal Son
  - Pass flow between players
  - Round end and next round

---

## 📝 Game Rules Reference

### Card Values (for scoring)
| Card | Value |
|------|-------|
| 3-10 | Face value |
| J, Q, K | 10 |
| A | 15 |
| Joker | 100 |

### Phase Requirements
| Phase | Min SON | Min BOX | Joker | Status |
|-------|---------|---------|--------|--------|
| first_son | 3+ consecutive | 5+ same rank | Fills gaps | All must make |
| play | 3+ consecutive | 3+ same rank | Fills gaps | Optional |
| round_end | - | - | - | Display scores |

### Player Status Values
| Status | Meaning | Turn |
|--------|---------|------|
| active | Playing normally | Gets turn |
| passed | Passed current round | Skipped |
| cate | Won (empty hand) | Round ends |
| cate_tangan | Won at game start | Round ends |
| son_failed | Declared can't make SON | Restart/continue |

---

## 🎓 For New Developers

### Key Concepts
1. **GameState:** Immutable (create new object when modifying)
2. **Card Objects:** Contain suit, rank, label, value, isJoker
3. **Validation:** Always validate before modifying gameState
4. **Joker Logic:** Wildcards that fill gaps in sequences
5. **Turn Logic:** Always auto-advance after action (except pass)
6. **UI Sync:** React re-renders when gameState changes

### Common Tasks
- **Add new validation:** Update cardValidator.js
- **Change scoring:** Modify calculateRemainingScore() or handleCate()
- **Adjust game rules:** Modify gameEngine.js functions
- **Update UI:** Edit PlayGame.jsx component

### Testing Checklist
- [ ] Can create SON with 3+ cards
- [ ] Can create BOX with minimum cards
- [ ] Can extend SON both left and right
- [ ] Can add to BOX
- [ ] Pass works and skips to next player
- [ ] CATE detection works
- [ ] Gagal Son logic works (4p and 5p)
- [ ] Round ends when all pass
- [ ] Next round starts with highest score player
- [ ] Scores accumulate to totalScore

---

## 📞 Contact & Notes

**Project Lead:** [Your Name]  
**Last Updated:** 2026-06-04  
**Status:** Phase 2 MVP In Progress  
**Target:** Full gameplay with all rules implemented
