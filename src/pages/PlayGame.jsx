/**
 * PlayGame.jsx — Layout Mobile, Visual UNO-style
 * - Avatar bulat dengan inisial + glow giliran
 * - Kartu kipas CSS transform per lawan
 * - Meja oval dengan felt gradient CSS
 * - Action bar compact di bawah
 */

import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { GameProvider, useGameContext } from '../context/GameContext';
import { getValidMoves, canExtendSonMultiple, isValidBox, detectSonJokerAmbiguity, jokerHasValidUse } from '../engine/cardValidator';
import { CardSprite } from '../components/GamePlay/CardSprite';
import { SVG_CARDS_URL, CARD_BACK_URL } from '../utils/cardMapper';
import { useAuth } from '../context/AuthContext';
import { computeBotAction } from '../engine/botEngine';

export function PlayGame() {
  const location = useLocation();
  const { roomId } = useParams();
  const { userProfile } = useAuth(); // ambil myUserId dari context langsung
  const myUserId = userProfile?.id;
  return (
    <GameProvider roomId={roomId} myUserId={myUserId}>
      <PlayGameContent />
    </GameProvider>
  );
}

// ─────────────────────────────────────────────
// Posisi pemain
// ─────────────────────────────────────────────
// SESUDAH
function getPlayerPositions(totalPlayers, myIdx) {
  // Semua lawan di atas, dari kiri ke kanan: top-far-left, top-left, top, top-right, top-far-right
  // 4p: bottom, top-right, top, top-left
  // 5p: bottom, top-far-right, top-right, top-left, top-far-left
  const pos4 = ['bottom', 'top-right', 'top', 'top-left'];
  const pos5 = ['bottom', 'top-far-right', 'top-right', 'top-left', 'top-far-left'];
  const positions = totalPlayers === 5 ? pos5 : pos4;
  const result = {};
  for (let i = 0; i < totalPlayers; i++) {
    const relIdx = (i - myIdx + totalPlayers) % totalPlayers;
    result[i] = positions[relIdx] || 'top';
  }
  return result;
}

// ─────────────────────────────────────────────
// Warna avatar berdasarkan nama
// ─────────────────────────────────────────────
const AVATAR_COLORS = [
  { bg: '#1a4a8a', text: '#7ab3f0' },
  { bg: '#4a1a6a', text: '#c07af0' },
  { bg: '#1a5a3a', text: '#6adba0' },
  { bg: '#6a2a1a', text: '#f0906a' },
  { bg: '#5a4a10', text: '#e0c050' },
];

function getAvatarColor(name) {
  let hash = 0;
  for (let c of (name || '?')) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// ─────────────────────────────────────────────
// Avatar bulat
// ─────────────────────────────────────────────
function PlayerAvatar({ player, isActive, size = 36 }) {
  const color = getAvatarColor(player?.name);
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: color.bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: size * 0.36,
      fontWeight: 700,
      color: color.text,
      border: isActive ? '2.5px solid #f5c842' : '2px solid rgba(255,255,255,0.15)',
      boxShadow: isActive ? '0 0 10px 3px rgba(245,200,66,0.55)' : 'none',
      flexShrink: 0,
      transition: 'box-shadow 0.3s, border-color 0.3s',
      letterSpacing: '-0.5px',
    }}>
      {getInitials(player?.name)}
    </div>
  );
}

// ─────────────────────────────────────────────
// Kartu kipas (face-down) untuk lawan
// ─────────────────────────────────────────────
function FanCards({ count, isVertical = false }) {
  if (count === 0) return null;

  // Kartu lebih besar untuk sedikit kartu, lebih kecil jika banyak
  const cardW = count <= 6 ? 28 : count <= 12 ? 22 : count <= 18 ? 18 : 14;
  const cardH = Math.round(cardW * 1.447);

  // Spread angle total: makin banyak kartu makin lebar, tapi dibatasi
  const maxSpread = isVertical ? 70 : 60;
  const spread = Math.min(count * 4, maxSpread);
  const step = count > 1 ? spread / (count - 1) : 0;
  const startAngle = -(spread / 2);

  // Ukuran container mengikuti spread
  const fanRadius = isVertical ? cardH * 1.1 : cardH * 1.0;
  const containerW = isVertical ? cardH + cardW + 8 : Math.max(cardW * 2, spread * 2.2 + cardW);
  const containerH = isVertical ? Math.max(cardH * 1.8, count * 8 + cardH) : cardH + 16;

  return (
    <div style={{
      position: 'relative',
      width: containerW,
      height: containerH,
      flexShrink: 0,
    }}>
      {Array.from({ length: count }).map((_, i) => {
        const angle = startAngle + i * step;
        const rad = (angle * Math.PI) / 180;

        let left, top, transform;
        if (isVertical) {
          // Fan vertikal: kartu menyebar ke samping
          left = containerW / 2 + Math.sin(rad) * (cardW * 0.6);
          top = i * (containerH - cardH) / Math.max(count - 1, 1);
          transform = `translateX(-50%) rotate(${angle * 0.4}deg)`;
        } else {
          // Fan horizontal: kartu menyebar seperti kipas dari titik bawah tengah
          const cx = containerW / 2;
          left = cx + Math.sin(rad) * fanRadius - cardW / 2;
          top = containerH - cardH - Math.cos(rad) * (fanRadius * 0.15);
          transform = `rotate(${angle}deg)`;
        }

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left,
              top,
              transform,
              transformOrigin: 'bottom center',
              zIndex: i,
            }}
          >
            <svg
              width={cardW}
              height={cardH}
              viewBox="0 0 169.075 244.64"
              xmlns="http://www.w3.org/2000/svg"
              xmlnsXlink="http://www.w3.org/1999/xlink"
            >
              <use href={`${SVG_CARDS_URL}#alternate-back`} x="0" y="0" />
            </svg>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// OpponentHand — avatar + badge + kartu kipas
// ─────────────────────────────────────────────
function OpponentHand({ count, position, isActive, player }) {
  const isVertical = false;
  const statusBadge = player.status === 'passed'
    ? { label: 'Pas', bg: '#5a1010', text: '#f87171' }
    : player.status === 'cate'
    ? { label: 'CATE', bg: '#0f4a1a', text: '#4ade80' }
    : null;

  // ── INFO ROW (avatar + nama + jumlah) ──
  const InfoRow = ({ vertical }) => (
    <div style={{
      display: 'flex',
      flexDirection: vertical ? 'column' : 'row',
      alignItems: 'center',
      gap: vertical ? 2 : 5,
    }}>
      <PlayerAvatar player={player} isActive={isActive} size={28} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: vertical ? 'center' : 'flex-start' }}>
        <span style={{
          fontSize: 9,
          fontWeight: 700,
          color: isActive ? '#f5c842' : 'rgba(255,255,255,0.7)',
          maxWidth: vertical ? 40 : 52,
          overflow: 'visible',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          lineHeight: 1.2,
        }}>
          {isActive ? '🎯 ' : ''}{player.name}
        </span>
        {statusBadge ? (
          <span style={{
            fontSize: 8, fontWeight: 700,
            background: statusBadge.bg, color: statusBadge.text,
            padding: '1px 4px', borderRadius: 3,
          }}>{statusBadge.label}</span>
        ) : (
          <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.38)', fontWeight: 600 }}>
            🃏 {count}
          </span>
        )}
      </div>
    </div>
  );

  // ── TOP / TOP-RIGHT: info horizontal di atas, fan di bawah ──
  if (!isVertical) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
        <InfoRow vertical={false} />
        
      </div>
    );
  }

  // ── LEFT / RIGHT: seluruhnya vertikal, fan di bawah info ──
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
      padding: '2px 0',
    }}>
      <InfoRow vertical={true} />
      
    </div>
  );
}

// ─────────────────────────────────────────────
// MyHand — kartu arc, shadow melayang, overlap agresif
// ─────────────────────────────────────────────
function MyHand({ hand, selectedCards, onCardClick, validIndices }) {
  const cardW = 62;
  const cardH = Math.round(cardW * 1.447);
  // Overlap agresif: makin banyak kartu, makin rapat
  const count = hand.length;
  const overlap = count <= 5 ? 20 : count <= 8 ? 28 : count <= 11 ? 34 : 38;
  const step = cardW - overlap;

  const SUIT_ORDER = { '♠': 0, '♥': 1, '♦': 2, '♣': 3 };
  const sortedIndices = hand
    .map((card, originalIdx) => ({ card, originalIdx }))
    .sort((a, b) => {
      if (a.card.isJoker && !b.card.isJoker) return 1;
      if (!a.card.isJoker && b.card.isJoker) return -1;
      if (a.card.isJoker && b.card.isJoker) return 0;
      const suitDiff = SUIT_ORDER[a.card.suit] - SUIT_ORDER[b.card.suit];
      if (suitDiff !== 0) return suitDiff;
      const valA = a.card.rank === 'A' ? 14 : parseInt(a.card.rank) || { J: 11, Q: 12, K: 13 }[a.card.rank];
      const valB = b.card.rank === 'A' ? 14 : parseInt(b.card.rank) || { J: 11, Q: 12, K: 13 }[b.card.rank];
      return valA - valB;
    });

  const totalW = count > 1 ? cardW + (count - 1) * step : cardW;
  // Arc: kartu tengah paling tinggi, tepi sedikit turun
  const arcDepth = Math.min(count * 1.2, 10); // max 10px drop di tepi

  return (
    <div style={{
      position: 'relative',
      width: totalW,
      height: cardH + 38, // ruang untuk arc + naik saat dipilih
      flexShrink: 0,
    }}>
      {sortedIndices.map(({ card, originalIdx }, displayIdx) => {
        const isSelected = selectedCards.includes(originalIdx);
        const isValid = validIndices.includes(originalIdx);

        // Arc curve: posisi relatif ke tengah (-1 sampai 1)
        const mid = (count - 1) / 2;
        const relPos = count > 1 ? (displayIdx - mid) / mid : 0;
        // Kartu tepi turun, tengah naik
        const arcY = relPos * relPos * arcDepth;
        // Rotasi kecil mengikuti arc
        const rotDeg = relPos * (count > 6 ? 3.5 : 2.5);

        const translateY = isSelected
          ? arcY - 12  // naik lebih tinggi saat dipilih
          : arcY;

        return (
          <div
            key={originalIdx}
            onClick={() => onCardClick(originalIdx)}
            style={{
              position: 'absolute',
              left: displayIdx * step,
              bottom: 0,
              transform: `translateY(${translateY}px) rotate(${rotDeg}deg)`,
              transformOrigin: 'bottom center',
              zIndex: 10 + displayIdx,
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              cursor: 'pointer',
              // Shadow melayang — lebih dalam saat dipilih
              filter: isSelected
                ? 'drop-shadow(0px 8px 12px rgba(0,0,0,0.75)) drop-shadow(0px 2px 4px rgba(0,0,0,0.5))'
                : 'drop-shadow(0px 4px 6px rgba(0,0,0,0.6)) drop-shadow(0px 1px 2px rgba(0,0,0,0.4))',
              borderRadius: 6,
            }}
          >
            <CardSprite
              card={card}
              width={cardW}
              selected={isSelected}
              valid={isValid}
            />
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// TableCard
// ─────────────────────────────────────────────
function TableCard({ card, faceDown = false, jokerIndex = 0 }) {
  return <CardSprite card={card} width={36} faceDown={faceDown} jokerIndex={jokerIndex} />;
}

// ─────────────────────────────────────────────
// MAIN CONTENT
// ─────────────────────────────────────────────
function PlayGameContent() {
  const {
    gameState, loadingGame, myPlayerIdx, isMyTurn,
    playNewSon, playNewBox, extendSon, addToBox,
    playerPass, declareFailFirstSon, nextRound, throwJoker
  } = useGameContext();

  const [selectedCards, setSelectedCards] = useState([]);
  const [action, setAction] = useState(null);
  const [targetIndex, setTargetIndex] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [sonCreationCards, setSonCreationCards] = useState([]);
  const [boxCreationCards, setBoxCreationCards] = useState([]);
  const [extendableSons, setExtendableSons] = useState([]);
  const [extendableCardsDefault, setExtendableCardsDefault] = useState([]);
  const [addableCardsDefault, setAddableCardsDefault] = useState([]);
  const [jokerPositionChoice, setJokerPositionChoice] = useState(null);
  const [throwableJokers, setThrowableJokers] = useState([]);
  const navigate = useNavigate();

  const myPlayer = gameState?.players[myPlayerIdx];
  const myHand = myPlayer?.hand || [];
  const currentPlayer = gameState?.players[gameState?.currentTurnIdx];
  const isMyTurnNow = isMyTurn ? isMyTurn() : false;
  const isFirstSonPhase = gameState?.phase === 'first_son';
  const failedSonCount = gameState?.players.filter(p => p.status === 'son_failed').length || 0;
  const playerCount = gameState?.players.length || 0;
  const positions = gameState ? getPlayerPositions(playerCount, myPlayerIdx) : {};
  useEffect(() => {
  if (!gameState || loadingGame) return; // ← tunggu loading selesai dulu
  if (myPlayerIdx < 0) {
    navigate('/home');
  }
}, [gameState, myPlayerIdx, loadingGame]);

  const [showRanking, setShowRanking] = useState(false);

  const computeValidSonCards = (hand) => {
    const bySuit = { '♠': [], '♥': [], '♦': [], '♣': [] };
    hand.forEach((card, idx) => {
      if (!card.isJoker) bySuit[card.suit].push({ idx, value: card.value });
    });
    const validCards = new Set();
    Object.values(bySuit).forEach(cards => {
      if (cards.length < 3) return;
      const sorted = [...cards].sort((a, b) => a.value - b.value);
      let seqStart = 0;
      for (let i = 1; i <= sorted.length; i++) {
        const isLast = i === sorted.length;
        const isConsecutive = !isLast && sorted[i].value === sorted[i - 1].value + 1;
        if (!isConsecutive) {
          if (i - seqStart >= 3) {
            for (let j = seqStart; j < i; j++) validCards.add(sorted[j].idx);
          }
          seqStart = i;
        }
      }
    });
    return Array.from(validCards);
  };

  const computeValidBoxCards = (hand, minCards = 3) => {
    const ranksInBoxes = new Set(
      (gameState?.meja?.boxes || []).flatMap(box =>
        box.cards.filter(c => !c.isJoker).map(c => c.rank)
      )
    );
    const byRank = {};
    hand.forEach((card, idx) => {
      if (!card.isJoker) {
        if (!byRank[card.rank]) byRank[card.rank] = [];
        byRank[card.rank].push(idx);
      }
    });
    const validCards = new Set();
    Object.entries(byRank).forEach(([rank, indices]) => {
      if (ranksInBoxes.has(rank)) return;
      if (indices.length >= minCards) indices.forEach(idx => validCards.add(idx));
    });
    return Array.from(validCards);
  };

  useEffect(() => {
    if (!gameState || myPlayerIdx < 0 || !myPlayer) return;
    const moves = getValidMoves(myHand, gameState.meja.sons, gameState.meja.boxes);
    setValidMoves(moves);
    setSonCreationCards(computeValidSonCards(myHand));
    setBoxCreationCards(computeValidBoxCards(myHand, isFirstSonPhase ? 5 : 3));

    const extendableSet = new Set();
    myHand.forEach((card, cardIdx) => {
      if (!card.isJoker) {
        gameState.meja.sons.forEach(son => {
          if (canExtendSonMultiple(son.cards, [card], 'left').valid ||
              canExtendSonMultiple(son.cards, [card], 'right').valid) {
            extendableSet.add(cardIdx);
          }
        });
      }
    });
    setExtendableCardsDefault(Array.from(extendableSet));

    const addableSet = new Set();
    myHand.forEach((card, cardIdx) => {
      gameState.meja.boxes.forEach(box => {
        if (isValidBox([...box.cards, card]).valid) addableSet.add(cardIdx);
      });
    });
    setAddableCardsDefault(Array.from(addableSet));

    const throwable = myHand
      .map((card, idx) => ({ card, idx }))
      .filter(({ card, idx }) =>
        card.isJoker && !jokerHasValidUse(idx, myHand, gameState.meja.sons, gameState.meja.boxes)
      )
      .map(({ idx }) => idx);
    setThrowableJokers(throwable);

    if (action === 'extend' && selectedCards.length > 0) {
      const extendCards = selectedCards.map(idx => myHand[idx]);
      const extendable = new Set();
      gameState.meja.sons.forEach((son, sonIdx) => {
        if (canExtendSonMultiple(son.cards, extendCards, 'left').valid ||
            canExtendSonMultiple(son.cards, extendCards, 'right').valid) {
          extendable.add(sonIdx);
        }
      });
      setExtendableSons(Array.from(extendable));
    } else {
      setExtendableSons([]);
    }
  }, [gameState?.currentTurnIdx, gameState?.meja, gameState?.phase, action, selectedCards, myPlayerIdx]);

// ── BOT: eksekusi aksi otomatis saat giliran bot ──
useEffect(() => {
  if (!gameState || gameState.phase === 'round_end') return;

  const currentPlayer = gameState.players[gameState.currentTurnIdx];
  if (!currentPlayer?.isBot) return;

  // Delay supaya terasa natural
  const timer = setTimeout(() => {
    const botIdx = gameState.currentTurnIdx;
    const action = computeBotAction(gameState, botIdx);

    switch (action.type) {
      case 'new_son':
        playNewSon(botIdx, action.cardIndices, action.jokerPosition || 'auto');
        break;
      case 'new_box':
        playNewBox(botIdx, action.cardIndices);
        break;
      case 'extend_son':
        extendSon(botIdx, action.cardIndices, action.sonIdx, action.position);
        break;
      case 'add_to_box':
        addToBox(botIdx, action.cardIndices, action.boxIdx);
        break;
      case 'throw_joker':
        throwJoker(botIdx, action.cardIdx);
        break;
      case 'fail_first_son':
        declareFailFirstSon(botIdx);
        break;
      case 'pass':
      default:
        playerPass(botIdx);
        break;
    }
  }, 1200); // delay 1.2 detik

  return () => clearTimeout(timer);
}, [gameState?.currentTurnIdx, gameState?.phase]);

  const handleCardClick = (cardIdx) => {
    if (!isMyTurnNow || myPlayer?.status !== 'active') return;
    setSelectedCards(prev =>
      prev.includes(cardIdx) ? prev.filter(i => i !== cardIdx) : [...prev, cardIdx]
    );
  };

  const handleCreateSon = () => {
    if (selectedCards.length < 3) return alert('Butuh minimal 3 kartu untuk SON');
    const selectedCardObjects = selectedCards.map(idx => myHand[idx]);
    const hasJoker = selectedCardObjects.some(c => c.isJoker);
    if (hasJoker && gameState.phase !== 'first_son') {
      const { ambiguous, options } = detectSonJokerAmbiguity(selectedCardObjects);
      if (ambiguous) { setJokerPositionChoice({ cardIndices: selectedCards, options }); return; }
    }
    playNewSon(myPlayerIdx, selectedCards);
    setSelectedCards([]); setAction(null);
  };

  const handleCreateBox = () => {
    const minCards = isFirstSonPhase ? 5 : 3;
    if (selectedCards.length < minCards) return alert(`Butuh minimal ${minCards} kartu untuk BOX`);
    playNewBox(myPlayerIdx, selectedCards);
    setSelectedCards([]); setAction(null);
  };

  const handleExtendSon = (sonIdx, position) => {
    if (selectedCards.length < 1 || selectedCards.length > 2) return alert('Pilih 1-2 kartu');
    extendSon(myPlayerIdx, selectedCards, sonIdx, position);
    setSelectedCards([]); setAction(null); setTargetIndex(null);
  };

  const handleAddToBox = (boxIdx) => {
    if (selectedCards.length < 1 || selectedCards.length > 2) return alert('Pilih 1-2 kartu');
    addToBox(myPlayerIdx, selectedCards, boxIdx);
    setSelectedCards([]); setAction(null); setTargetIndex(null);
  };

  const handlePass = () => {
    if (!isMyTurnNow) return;
    if (confirm('Yakin ingin PAS?\n\nAnda tidak akan mendapat giliran lagi di ronde ini.')) {
      playerPass(myPlayerIdx);
      setSelectedCards([]); setAction(null);
    }
  };

  const validIndicesForHand = (() => {
    if (isFirstSonPhase) return sonCreationCards;
    const s = new Set([
      ...sonCreationCards, ...boxCreationCards,
      ...extendableCardsDefault, ...addableCardsDefault
    ]);
    return Array.from(s);
  })();

  // ── LOADING ────────────────────────────────────────────────────
  if (loadingGame) {
    return (
      <div style={{
        width: '100vw', height: '100vh',
        background: '#0d1f12',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ color: '#fff', fontSize: 18, fontWeight: 700, opacity: 0.8 }}>
          🃏 Memuat permainan…
        </div>
      </div>
    );
  }

  if (!gameState || !currentPlayer) {
    return (
      <div style={{
        width: '100vw', height: '100vh',
        background: '#0d1f12',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ color: '#fff', fontSize: 16 }}>⚠️ Data tidak ditemukan</div>
      </div>
    );
  }

  // ── ROUND END ──────────────────────────────────────────────────
  if (gameState.phase === 'round_end') {
    return (
      <div style={{
        width: '100vw', height: '100vh',
        background: '#0d1f12',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, overflow: 'auto',
      }}>
        <div style={{
          background: 'linear-gradient(160deg, #3a2600, #1a1000)',
          padding: 24,
          borderRadius: 20,
          border: '2px solid #c8992a',
          width: '100%',
          maxWidth: 380,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#f5d060', marginBottom: 12 }}>
            {gameState.noWinner ? '⏸️ Ronde Selesai' : '🏆 Ronde Selesai!'}
          </div>
          {!gameState.noWinner && (
            <div style={{ color: '#4ade80', fontWeight: 700, marginBottom: 10, fontSize: 14 }}>
              🎉 {gameState.players.find(p => p.status === 'cate' || p.status === 'cate_tangan')?.name} CATE!
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {[...gameState.players].sort((a, b) => b.score - a.score).map((player, idx) => (
              <div key={idx} style={{
                background: 'rgba(0,0,0,0.35)',
                padding: '10px 14px',
                borderRadius: 10,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <PlayerAvatar player={player} isActive={false} size={28} />
                  <div>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>
                      {player.name}
                      {player.id === myPlayer?.id && <span style={{ color: '#888', fontSize: 11, marginLeft: 4 }}>(Kamu)</span>}
                    </div>
                    <div style={{ color: '#888', fontSize: 11 }}>Total: {player.totalScore || 0}</div>
                  </div>
                </div>
                <span style={{
                  fontSize: 22,
                  fontWeight: 900,
                  color: player.score >= 0 ? '#4ade80' : '#f87171',
                }}>
                  {player.score > 0 ? '+' : ''}{player.score}
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={() => nextRound()}
            style={{
              width: '100%',
              background: '#166534',
              color: '#fff',
              fontWeight: 700,
              fontSize: 15,
              padding: '12px 0',
              borderRadius: 10,
              border: 'none',
              marginBottom: 8,
              cursor: 'pointer',
            }}
          >
            ▶ Ronde Berikutnya
          </button>
          <button
            onClick={() => navigate('/home')}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.07)',
              color: '#ccc',
              fontSize: 13,
              padding: '10px 0',
              borderRadius: 10,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            🏠 Lobby
          </button>
        </div>
      </div>
    );
  }

  // ── MAIN LAYOUT ──────────────────────────────────────────────────
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      // Ruang kasino gelap
      background: '#0d1f12',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'visible',
      userSelect: 'none',
      position: 'relative',
    }}>
      {/* ── FASE BANNER ── */}
      {isFirstSonPhase && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 30,
          background: '#b45309',
          color: '#fff',
          fontSize: 11,
          fontWeight: 700,
          padding: '3px 14px',
          borderRadius: '0 0 10px 10px',
          letterSpacing: 0.3,
        }}>
          ⚠️ Fase Son Pertama — Tanpa Joker
        </div>
      )}

      {/* ══ ROW ATAS: pemain top & top-right ══ */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingTop: isFirstSonPhase ? 28 : 10,
        paddingBottom: 4,
        gap: 80,
        zIndex: 10,
        
      }}>
        {gameState.players.map((player, idx) => {
          const pos = positions[idx];
          if (!pos.startsWith('top')) return null;
          return (
            <OpponentHand
              key={idx}
              count={player.hand?.length || 0}
              position={pos}
              isActive={gameState.currentTurnIdx === idx}
              player={player}
            />
          );
        })}
      </div>

      {/* ══ ROW TENGAH: kiri + meja + kanan ══ */}
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'visible',
        padding: '0 6px',
        gap: 6,
        minHeight: 0,
      }}>

        {/* ── MEJA ── */}
        <div style={{
          flex: 1,
          // Felt meja: radial gradient hijau
          background: 'radial-gradient(ellipse at 50% 40%, #1f7a42 0%, #155c30 55%, #0e3d1f 100%)',
          borderRadius: 20,
          border: isMyTurnNow
            ? '3px solid rgba(167,139,250,0.9)'
            : '3px solid #0a2e15',
          boxShadow: isMyTurnNow
            ? 'inset 0 0 30px rgba(0,0,0,0.4), 0 0 12px 3px rgba(167,139,250,0.5)'
            : 'inset 0 0 30px rgba(0,0,0,0.4)',
          transition: 'border-color 0.4s, box-shadow 0.4s',
          overflow: 'auto',
          padding: '10px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          minHeight: 0,
        }}>

          {/* Header meja */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            
          </div>

          {/* SON di meja */}
          {gameState.meja.sons.length > 0 && (
            <div style={{ position: 'relative' }}>
              {/* Watermark SON di tengah, di belakang kartu */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: 48,
                fontWeight: 900,
                color: 'rgba(253,224,71,0.08)',
                letterSpacing: 4,
                zIndex: 0,
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
              }}>
                SON
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
                {gameState.meja.sons.map((son, sonIdx) => {
                  const isTarget = action === 'extend' && targetIndex === sonIdx;
                  return (
                    <div
                      key={son.id}
                      onClick={() => {
                        if (!isMyTurnNow) return;
                        if (isTarget) { setAction(null); setTargetIndex(null); }
                        else { setAction('extend'); setTargetIndex(sonIdx); }
                      }}
                      style={{
                        background: isTarget ? 'rgba(126,34,206,0.3)' : 'rgba(0,0,0,0.35)',
                        padding: '6px 6px 4px',
                        borderRadius: 8,
                        border: `1.5px solid ${isTarget ? '#a855f7' : 'rgba(253,224,71,0.35)'}`,
                        cursor: isMyTurnNow ? 'pointer' : 'default',
                        transition: 'border-color 0.2s',
                      }}
                    >
                      {(() => {
                      const sonCount = son.cards.length;
                      const cW = 36;
                      const overlap = sonCount <= 5 ? 16 : sonCount <= 9 ? 22 : 27;
                      const step = cW - overlap;
                      const totalW = sonCount > 1 ? cW + (sonCount - 1) * step : cW;
                      const cH = Math.round(cW * 1.447);
                      return (
                        <div style={{ position: 'relative', width: totalW, height: cH + 4, flexShrink: 0 }}>
                          {son.cards.map((card, cardIdx) => (
                            <div key={cardIdx} style={{
                              position: 'absolute',
                              left: cardIdx * step,
                              top: 0,
                              zIndex: cardIdx,
                              // Kartu ujung kiri & kanan sedikit naik agar terlihat bisa di-extend
                              filter: (cardIdx === 0 || cardIdx === sonCount - 1)
                                ? 'drop-shadow(0 -2px 4px rgba(255,255,255,0.25))'
                                : 'none',
                            }}>
                              <TableCard
                                card={card}
                                faceDown={isFirstSonPhase && son.playerId !== myPlayer?.id}
                                jokerIndex={cardIdx}
                              />
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                    <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9, textAlign: 'center', marginTop: 2 }}>
                      {son.cards.length}/13
                    </div>
                      {isTarget && selectedCards.length >= 1 && selectedCards.length <= 2 && (
                        <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleExtendSon(sonIdx, 'left'); }}
                            style={{
                              flex: 1, background: '#1d4ed8', color: '#fff',
                              fontSize: 9, fontWeight: 700, padding: '3px 0',
                              borderRadius: 4, border: 'none', cursor: 'pointer',
                            }}
                          >← Kiri</button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleExtendSon(sonIdx, 'right'); }}
                            style={{
                              flex: 1, background: '#1d4ed8', color: '#fff',
                              fontSize: 9, fontWeight: 700, padding: '3px 0',
                              borderRadius: 4, border: 'none', cursor: 'pointer',
                            }}
                          >Kanan →</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* BOX di meja */}
          {gameState.meja.boxes.length > 0 && (
            <div style={{ position: 'relative' }}>
              {/* Watermark BOX di tengah, di belakang kartu */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: 48,
                fontWeight: 900,
                color: 'rgba(96,165,250,0.08)',
                letterSpacing: 4,
                zIndex: 0,
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
              }}>
                BOX
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
                {gameState.meja.boxes.map((box, boxIdx) => {
                  const isTarget = action === 'add_box' && targetIndex === boxIdx;
                  return (
                    <div
                      key={box.id}
                      onClick={() => {
                        if (!isMyTurnNow) return;
                        if (isTarget) { setAction(null); setTargetIndex(null); }
                        else { setAction('add_box'); setTargetIndex(boxIdx); }
                      }}
                      style={{
                        background: isTarget ? 'rgba(126,34,206,0.3)' : 'rgba(0,0,0,0.35)',
                        padding: '6px 6px 4px',
                        borderRadius: 8,
                        border: `1.5px solid ${isTarget ? '#a855f7' : 'rgba(96,165,250,0.35)'}`,
                        cursor: isMyTurnNow ? 'pointer' : 'default',
                        transition: 'border-color 0.2s',
                      }}
                    >
                      {(() => {
                      const boxCount = box.cards.length;
                      const cW = 36;
                      // BOX overlap lebih agresif — semua kartu sama rank, cukup lihat ujung
                      const overlap = boxCount <= 4 ? 20 : boxCount <= 6 ? 26 : 30;
                      const step = cW - overlap;
                      const totalW = boxCount > 1 ? cW + (boxCount - 1) * step : cW;
                      const cH = Math.round(cW * 1.447);
                      return (
                        <div style={{ position: 'relative', width: totalW, height: cH + 4, flexShrink: 0 }}>
                          {box.cards.map((card, cardIdx) => (
                            <div key={cardIdx} style={{
                              position: 'absolute',
                              left: cardIdx * step,
                              top: 0,
                              zIndex: cardIdx,
                            }}>
                              <TableCard
                                card={card}
                                faceDown={isFirstSonPhase && box.playerId !== myPlayer?.id}
                                jokerIndex={cardIdx}
                              />
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                    <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9, textAlign: 'center', marginTop: 2 }}>
                      {isFirstSonPhase && box.playerId !== myPlayer?.id
                        ? `? × ${box.cards.length}`
                        : `${box.cards.find(c => !c.isJoker)?.label ?? '?'} × ${box.cards.length}`}
                    </div>
                      {isTarget && selectedCards.length >= 1 && selectedCards.length <= 2 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAddToBox(boxIdx); }}
                          style={{
                            marginTop: 4, width: '100%',
                            background: '#15803d', color: '#fff',
                            fontSize: 9, fontWeight: 700, padding: '3px 0',
                            borderRadius: 4, border: 'none', cursor: 'pointer',
                          }}
                        >✓ Tambah</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {gameState.meja.sons.length === 0 && gameState.meja.boxes.length === 0 && (
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,255,255,0.2)', fontSize: 12,
            }}>
              {isFirstSonPhase ? '⬆ Wajib buat SON pertama' : 'Meja kosong'}
            </div>
          )}
        </div>
      </div>
      {/* Tombol Ranking — pojok kanan atas */}
      <button
        onClick={() => setShowRanking(true)}
        style={{
          position: 'absolute',
          top: 6,
          right: 6,
          zIndex: 30,
          background: 'rgba(0,0,0,0.45)',
          color: '#fde68a',
          fontSize: 10,
          fontWeight: 700,
          padding: '4px 10px',
          borderRadius: 6,
          border: 'none',
          cursor: 'pointer',
        }}
      >
        🏆 Ranking
      </button>

      {/* ══ BAWAH: kartu overlay + action buttons di kanan ══ */}
      <div style={{
        position: 'relative',
        zIndex: 20,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 0,
      }}>
        {/* Info Ronde & Fase — pojok kiri bawah, absolute, tidak memakan tempat */}
        <div style={{
          position: 'absolute',
          left: 6,
          bottom: 6,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          zIndex: 25,
          pointerEvents: 'none',
        }}>
          <span style={{
            background: 'rgba(0,0,0,0.45)',
            color: '#ccc',
            fontSize: 10,
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: 6,
          }}>
            Ronde {gameState.round}
          </span>
          <span style={{
            background: 'rgba(0,0,0,0.45)',
            color: '#aaa',
            fontSize: 10,
            fontWeight: 600,
            padding: '3px 8px',
            borderRadius: 6,
          }}>
            {gameState.phase === 'first_son' ? '🎴 Son Pertama' : '🎮 Main'}
          </span>
        </div>
        {/* Kartu tangan — overlay langsung di atas meja, tanpa background */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingBottom: 0,
          minWidth: 0,
        }}>

          {/* Avatar + kartu dalam satu baris */}
          <div style={{ overflowY: 'visible'}}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 6,
            overflowX: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            paddingLeft: 6,
            paddingRight: 6,
          }}>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 2, flexShrink: 0, marginBottom: 4,
            }}>
              <PlayerAvatar player={myPlayer} isActive={isMyTurnNow} size={26} />
              <span style={{
                fontSize: 8, color: 'rgba(255,255,255,0.4)',
                maxWidth: 34, textAlign: 'center',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{myPlayer?.name}</span>
            </div>

            {myPlayer?.status === 'active' ? (
            <div style={{ marginTop: -18 }}>
              <MyHand
                hand={myHand}
                selectedCards={selectedCards}
                onCardClick={handleCardClick}
                validIndices={isMyTurnNow ? validIndicesForHand : []}
              />
            </div>
            ) : myPlayer?.status === 'passed' ? (
            <div style={{ display: 'flex', gap: 2, paddingBottom: 4 }}>
              {myHand.map((card, idx) => (
                <div
                  key={idx}
                  style={{
                    filter: 'drop-shadow(0 0 6px rgba(248,113,113,0.7)) drop-shadow(0 0 12px rgba(248,113,113,0.4))',
                    borderRadius: 6,
                  }}
                >
                  <CardSprite card={card} width={40} />
                </div>
              ))}
            </div>
          ) : null}
          </div>
          </div>
        </div>

        {/* Action buttons — kolom vertikal di kanan, hanya saat giliran */}
        {isMyTurnNow && myPlayer?.status === 'active' && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 5,
            padding: '6px 8px 10px 4px',
            flexShrink: 0,
            alignSelf: 'flex-end',
          }}>
            {selectedCards.length > 0 && (
              <div style={{
                fontSize: 8, color: 'rgba(255,255,255,0.4)',
                textAlign: 'center', marginBottom: 2,
              }}>
                {selectedCards.length} dipilih
              </div>
            )}

            {/* SON */}
            <button
              onClick={handleCreateSon}
              disabled={selectedCards.length < 3}
              style={{
                padding: '7px 10px',
                borderRadius: 8, border: 'none',
                fontSize: 11, fontWeight: 700,
                cursor: selectedCards.length >= 3 ? 'pointer' : 'not-allowed',
                background: selectedCards.length >= 3 ? '#ca8a04' : 'rgba(255,255,255,0.07)',
                color: selectedCards.length >= 3 ? '#fff' : 'rgba(255,255,255,0.22)',
                whiteSpace: 'nowrap',
                transition: 'background 0.2s',
              }}
            >
              🎴 SON{selectedCards.length >= 3 ? ` (${selectedCards.length})` : ''}
            </button>

            {/* BOX */}
            <button
              onClick={handleCreateBox}
              disabled={selectedCards.length < (isFirstSonPhase ? 5 : 3)}
              style={{
                padding: '7px 10px',
                borderRadius: 8, border: 'none',
                fontSize: 11, fontWeight: 700,
                cursor: selectedCards.length >= (isFirstSonPhase ? 5 : 3) ? 'pointer' : 'not-allowed',
                background: selectedCards.length >= (isFirstSonPhase ? 5 : 3) ? '#1d4ed8' : 'rgba(255,255,255,0.07)',
                color: selectedCards.length >= (isFirstSonPhase ? 5 : 3) ? '#fff' : 'rgba(255,255,255,0.22)',
                whiteSpace: 'nowrap',
                transition: 'background 0.2s',
              }}
            >
              📦 BOX{selectedCards.length >= (isFirstSonPhase ? 5 : 3) ? ` (${selectedCards.length})` : ''}
            </button>

            {/* Gagal Son / Pas */}
            {isFirstSonPhase ? (
              <button
                onClick={() => {
                  let msg = playerCount === 4
                    ? 'Gagal Son → Ronde DIULANG\nPoin: 0'
                    : failedSonCount + 1 >= 2
                    ? 'Gagal Son → Ronde DIULANG\nPoin: 0'
                    : 'Gagal Son → Keluar ronde\nPoin: -50';
                  if (confirm(`Tidak bisa SON?\n\n${msg}\n\nTekan OK untuk lanjut.`)) {
                    declareFailFirstSon(myPlayerIdx);
                    setSelectedCards([]); setAction(null);
                  }
                }}
                style={{
                  padding: '7px 10px', borderRadius: 8, border: 'none',
                  fontSize: 11, fontWeight: 700,
                  background: '#7f1d1d', color: '#fca5a5', cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >❌ Gagal Son</button>
            ) : (
              <button
                onClick={handlePass}
                style={{
                  padding: '7px 10px', borderRadius: 8, border: 'none',
                  fontSize: 11, fontWeight: 700,
                  background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.55)',
                  cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >👋 Pas</button>
            )}

            {throwableJokers.length > 0 && (
              <button
                onClick={() => {
                  const sorted = [...throwableJokers].sort((a, b) => b - a);
                  throwJoker(myPlayerIdx, sorted[0]);
                }}
                style={{
                  padding: '7px 10px', borderRadius: 8, border: 'none',
                  fontSize: 11, fontWeight: 700,
                  background: '#c2410c', color: '#fff',
                  cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >🃏 Joker ({throwableJokers.length})</button>
            )}
          </div>
        )}
      </div>

      {/* ── Dialog Posisi Joker ── */}
      {jokerPositionChoice && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 50,
        }}>
          <div style={{
            background: '#1e293b',
            border: '2px solid #f5c842',
            borderRadius: 16,
            padding: 20,
            maxWidth: 280,
            width: '90%',
          }}>
            <div style={{ color: '#fde68a', fontWeight: 700, textAlign: 'center', marginBottom: 12 }}>
              🃏 Posisi Joker?
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {jokerPositionChoice.options.includes('kiri') && (
                <button
                  onClick={() => { playNewSon(myPlayerIdx, jokerPositionChoice.cardIndices, 'kiri'); setJokerPositionChoice(null); setSelectedCards([]); setAction(null); }}
                  style={{ background: '#1d4ed8', color: '#fff', fontWeight: 700, padding: '10px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14 }}
                >
                  ← Joker di Kiri
                </button>
              )}
              {jokerPositionChoice.options.includes('gap') && (
                <button
                  onClick={() => { playNewSon(myPlayerIdx, jokerPositionChoice.cardIndices, 'gap'); setJokerPositionChoice(null); setSelectedCards([]); setAction(null); }}
                  style={{ background: '#6d28d9', color: '#fff', fontWeight: 700, padding: '10px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14 }}
                >
                  ↕ Joker di Tengah
                </button>
              )}
              {jokerPositionChoice.options.includes('kanan') && (
                <button
                  onClick={() => { playNewSon(myPlayerIdx, jokerPositionChoice.cardIndices, 'kanan'); setJokerPositionChoice(null); setSelectedCards([]); setAction(null); }}
                  style={{ background: '#15803d', color: '#fff', fontWeight: 700, padding: '10px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14 }}
                >
                  Joker di Kanan →
                </button>
              )}
              <button
                onClick={() => setJokerPositionChoice(null)}
                style={{ background: 'rgba(255,255,255,0.08)', color: '#999', padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13 }}
              >
                Batal
              </button>
            </div>
          </div>
          
        </div>
      )}
      {/* ── Dialog Ranking Sementara ── */}
          {showRanking && (
            <div
              onClick={() => setShowRanking(false)}
              style={{
                position: 'fixed', inset: 0,
                background: 'rgba(0,0,0,0.75)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 50,
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: 'linear-gradient(160deg, #3a2600, #1a1000)',
                  border: '2px solid #c8992a',
                  borderRadius: 16,
                  padding: 20,
                  maxWidth: 320,
                  width: '90%',
                  maxHeight: '70vh',
                  overflowY: 'auto',
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 800, color: '#f5d060', marginBottom: 12, textAlign: 'center' }}>
                  🏆 Ranking Sementara
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  {[...gameState.players]
                    .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))
                    .map((player, idx) => (
                      <div key={idx} style={{
                        background: 'rgba(0,0,0,0.35)',
                        padding: '10px 14px',
                        borderRadius: 10,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ color: '#fde68a', fontWeight: 800, fontSize: 13, width: 20, textAlign: 'center' }}>
                            {idx + 1}
                          </span>
                          <PlayerAvatar player={player} isActive={false} size={28} />
                          <div>
                            <div style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>
                              {player.name}
                              {player.id === myPlayer?.id && <span style={{ color: '#888', fontSize: 11, marginLeft: 4 }}>(Kamu)</span>}
                            </div>
                          </div>
                        </div>
                        <span style={{ fontSize: 18, fontWeight: 900, color: '#f5d060' }}>
                          {player.totalScore || 0}
                        </span>
                      </div>
                    ))}
                </div>
                <button
                  onClick={() => setShowRanking(false)}
                  style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.07)',
                    color: '#ccc',
                    fontSize: 13,
                    padding: '10px 0',
                    borderRadius: 10,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Tutup
                </button>
              </div>
            </div>
          )}
    </div>
  );
}