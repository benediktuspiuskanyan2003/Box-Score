/**
 * useVoiceChat.js — Voice chat mesh P2P via WebRTC,
 * signaling lewat Supabase Realtime Broadcast.
 *
 * FIX PENTING: menangani renegotiation saat mic diaktifkan SETELAH
 * RTCPeerConnection sudah terbentuk (kasus paling umum karena mic
 * memang sengaja tidak minta izin di awal). Tanpa renegotiation,
 * addTrack() yang dipanggil belakangan tidak akan pernah terkirim
 * ke peer lain.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const STUN_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

const LOG = (...args) => console.log('[VoiceChat]', ...args);

export function useVoiceChat({ roomId, myUserId, myName, enabled = true }) {
  const [speakerOn, setSpeakerOn] = useState(true);
  const [micOn, setMicOn] = useState(false);
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);
  const [connectedPeers, setConnectedPeers] = useState({});

  const channelRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const remoteAudioElsRef = useRef({});
  const speakerOnRef = useRef(true);
  const micOnRef = useRef(false);
  const pendingCandidatesRef = useRef({});
  const makingOfferRef = useRef({}); // ✅ guard supaya tidak dobel createOffer per peer

  useEffect(() => { speakerOnRef.current = speakerOn; }, [speakerOn]);
  useEffect(() => { micOnRef.current = micOn; }, [micOn]);

  const sendSignal = useCallback((toUserId, type, payload) => {
    LOG('SEND ->', toUserId, type);
    channelRef.current?.send({
      type: 'broadcast',
      event: 'signal',
      payload: { from: myUserId, to: toUserId, type, payload },
    });
  }, [myUserId]);

  const getOrCreatePeerConnection = useCallback((peerUserId) => {
    if (peerConnectionsRef.current[peerUserId]) {
      return peerConnectionsRef.current[peerUserId];
    }

    LOG('creating NEW RTCPeerConnection for', peerUserId);
    const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });

    if (localStreamRef.current) {
      LOG('attaching existing local stream tracks to new PC for', peerUserId);
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal(peerUserId, 'ice-candidate', event.candidate.toJSON());
      }
    };

    pc.oniceconnectionstatechange = () => {
      LOG('ICE connection state for', peerUserId, '=', pc.iceConnectionState);
    };

    pc.ontrack = (event) => {
      LOG('TRACK RECEIVED from', peerUserId);
      let audioEl = remoteAudioElsRef.current[peerUserId];
      if (!audioEl) {
        audioEl = new Audio();
        audioEl.autoplay = true;
        remoteAudioElsRef.current[peerUserId] = audioEl;
      }
      audioEl.srcObject = event.streams[0];
      audioEl.muted = !speakerOnRef.current;
      audioEl.play().catch(err => LOG('audio.play() error:', err));
    };

    pc.onconnectionstatechange = () => {
      LOG('connectionState for', peerUserId, '=', pc.connectionState);
      setConnectedPeers(prev => ({ ...prev, [peerUserId]: pc.connectionState }));
    };

    // ✅ FIX UTAMA: renegotiation saat addTrack dipanggil setelah PC sudah stable
    // (kasus: mic diaktifkan belakangan, setelah koneksi awal sudah terbentuk)
    pc.onnegotiationneeded = async () => {
      try {
        if (makingOfferRef.current[peerUserId]) {
          LOG('skip negotiationneeded for', peerUserId, '(already making offer)');
          return;
        }
        if (pc.signalingState !== 'stable') {
          LOG('skip negotiationneeded for', peerUserId, '(signalingState not stable:', pc.signalingState, ')');
          return;
        }
        makingOfferRef.current[peerUserId] = true;
        LOG('negotiationneeded triggered for', peerUserId, '- creating new offer (renegotiation)');
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal(peerUserId, 'offer', offer);
      } catch (err) {
        LOG('ERROR during negotiationneeded for', peerUserId, err);
      } finally {
        makingOfferRef.current[peerUserId] = false;
      }
    };

    peerConnectionsRef.current[peerUserId] = pc;
    return pc;
  }, [sendSignal]);

  const closePeerConnection = useCallback((peerUserId) => {
    const pc = peerConnectionsRef.current[peerUserId];
    if (pc) {
      pc.close();
      delete peerConnectionsRef.current[peerUserId];
    }
    const audioEl = remoteAudioElsRef.current[peerUserId];
    if (audioEl) {
      audioEl.srcObject = null;
      delete remoteAudioElsRef.current[peerUserId];
    }
    delete pendingCandidatesRef.current[peerUserId];
    delete makingOfferRef.current[peerUserId];
    setConnectedPeers(prev => {
      const next = { ...prev };
      delete next[peerUserId];
      return next;
    });
  }, []);

  const addIceCandidateSafe = async (pc, peerUserId, candidateData) => {
    if (pc.remoteDescription && pc.remoteDescription.type) {
      try {
        await pc.addIceCandidate(candidateData);
      } catch (err) {
        LOG('ERROR addIceCandidate for', peerUserId, err);
      }
    } else {
      if (!pendingCandidatesRef.current[peerUserId]) {
        pendingCandidatesRef.current[peerUserId] = [];
      }
      pendingCandidatesRef.current[peerUserId].push(candidateData);
    }
  };

  const flushPendingCandidates = async (pc, peerUserId) => {
    const pending = pendingCandidatesRef.current[peerUserId];
    if (pending && pending.length > 0) {
      LOG('flushing', pending.length, 'buffered ICE candidates for', peerUserId);
      for (const candidateData of pending) {
        try {
          await pc.addIceCandidate(candidateData);
        } catch (err) {
          LOG('ERROR flushing candidate for', peerUserId, err);
        }
      }
      pendingCandidatesRef.current[peerUserId] = [];
    }
  };

  useEffect(() => {
    if (!enabled || !roomId || !myUserId) return;

    LOG('=== INIT voice channel for room', roomId, 'as user', myUserId, '===');

    const channel = supabase.channel(`voice:${roomId}`, {
      config: { broadcast: { self: false } },
    });

    channel.on('broadcast', { event: 'signal' }, async ({ payload }) => {
      const { from, to, type, payload: data } = payload;

      if (type === 'join-announce-broadcast') {
        if (from === myUserId) return;
        const pc = getOrCreatePeerConnection(from);
        // Hanya buat offer manual di sini kalau PC baru dibuat & belum ada
        // negotiation berjalan. onnegotiationneeded akan handle render PC baru ini
        // secara otomatis (karena addTrack/transceiver awal), tapi untuk PC tanpa
        // track sama sekali (mic belum pernah ON di kedua sisi), perlu trigger manual.
        if (pc.signalingState === 'stable' && !makingOfferRef.current[from]) {
          makingOfferRef.current[from] = true;
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sendSignal(from, 'offer', offer);
          makingOfferRef.current[from] = false;
        }
        return;
      }

      if (type === 'leave-broadcast') {
        if (from === myUserId) return;
        closePeerConnection(from);
        return;
      }

      if (to !== myUserId) return;

      const pc = getOrCreatePeerConnection(from);

      if (type === 'offer') {
        LOG('got OFFER from', from);
        // ✅ Handle glare (kedua sisi createOffer bersamaan saat renegotiation)
        const offerCollision = pc.signalingState !== 'stable';
        if (offerCollision) {
          LOG('offer collision detected for', from, '- rolling back local description');
          await Promise.all([
            pc.setLocalDescription({ type: 'rollback' }),
            pc.setRemoteDescription(data),
          ]);
        } else {
          await pc.setRemoteDescription(data);
        }
        await flushPendingCandidates(pc, from);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal(from, 'answer', answer);
      } else if (type === 'answer') {
        LOG('got ANSWER from', from);
        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(data);
          await flushPendingCandidates(pc, from);
        } else {
          LOG('ignoring answer, unexpected signalingState:', pc.signalingState);
        }
      } else if (type === 'ice-candidate') {
        await addIceCandidateSafe(pc, from, data);
      }
    });

    channel.subscribe((status) => {
      LOG('channel subscribe status:', status);
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'signal',
          payload: { from: myUserId, to: 'all', type: 'join-announce-broadcast' },
        });
        setTimeout(() => {
          channel.send({
            type: 'broadcast',
            event: 'signal',
            payload: { from: myUserId, to: 'all', type: 'join-announce-broadcast' },
          });
        }, 1500);
      }
    });

    channelRef.current = channel;

    return () => {
      LOG('=== CLEANUP voice channel ===');
      channel.send({
        type: 'broadcast',
        event: 'signal',
        payload: { from: myUserId, to: 'all', type: 'leave-broadcast' },
      });
      Object.keys(peerConnectionsRef.current).forEach(closePeerConnection);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [enabled, roomId, myUserId, getOrCreatePeerConnection, sendSignal, closePeerConnection]);

  const toggleSpeaker = useCallback(() => {
    setSpeakerOn(prev => {
      const next = !prev;
      Object.values(remoteAudioElsRef.current).forEach(audioEl => {
        audioEl.muted = !next;
      });
      if (!next) {
        setMicOn(false);
        if (localStreamRef.current) {
          localStreamRef.current.getAudioTracks().forEach(track => { track.enabled = false; });
        }
      }
      return next;
    });
  }, []);

  const toggleMic = useCallback(async () => {
    if (!speakerOnRef.current) return;

    if (micOnRef.current) {
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(track => { track.enabled = false; });
      }
      setMicOn(false);
      return;
    }

    try {
      if (!localStreamRef.current) {
        LOG('requesting getUserMedia...');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        LOG('getUserMedia GRANTED');
        localStreamRef.current = stream;

        // ✅ addTrack ke semua PC yang sudah ada -- ini akan TRIGGER
        // onnegotiationneeded otomatis untuk masing-masing PC, yang
        // akan handle renegotiation (createOffer baru) secara otomatis.
        Object.entries(peerConnectionsRef.current).forEach(([peerId, pc]) => {
          LOG('addTrack to PC of', peerId, '(akan trigger renegotiation otomatis)');
          stream.getTracks().forEach(track => pc.addTrack(track, stream));
        });
      } else {
        localStreamRef.current.getAudioTracks().forEach(track => { track.enabled = true; });
      }
      setMicOn(true);
      setMicPermissionDenied(false);
    } catch (err) {
      LOG('getUserMedia FAILED:', err);
      setMicPermissionDenied(true);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
    };
  }, []);

  return {
    speakerOn,
    micOn,
    micPermissionDenied,
    connectedPeers,
    toggleSpeaker,
    toggleMic,
  };
}