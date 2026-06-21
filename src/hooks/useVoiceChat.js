/**
 * useVoiceChat.js — VERSI DEBUG dengan logging lengkap.
 * Tujuan: cari di titik mana alur WebRTC berhenti.
 * Setelah masalah ketemu, console.log bisa dihapus/dikurangi.
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
  const pendingCandidatesRef = useRef({}); // ✅ buffer ICE candidate yang datang sebelum remoteDescription siap

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
      LOG('reuse existing PC for', peerUserId);
      return peerConnectionsRef.current[peerUserId];
    }

    LOG('creating NEW RTCPeerConnection for', peerUserId);
    const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });

    if (localStreamRef.current) {
      LOG('attaching existing local stream tracks to new PC for', peerUserId);
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    } else {
      LOG('NO local stream yet when creating PC for', peerUserId, '(mic belum ON)');
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        LOG('local ICE candidate found for', peerUserId);
        sendSignal(peerUserId, 'ice-candidate', event.candidate.toJSON());
      } else {
        LOG('ICE gathering complete for', peerUserId);
      }
    };

    pc.oniceconnectionstatechange = () => {
      LOG('ICE connection state for', peerUserId, '=', pc.iceConnectionState);
    };

    pc.ontrack = (event) => {
      LOG('TRACK RECEIVED from', peerUserId, event.streams[0]);
      let audioEl = remoteAudioElsRef.current[peerUserId];
      if (!audioEl) {
        audioEl = new Audio();
        audioEl.autoplay = true;
        remoteAudioElsRef.current[peerUserId] = audioEl;
      }
      audioEl.srcObject = event.streams[0];
      audioEl.muted = !speakerOnRef.current;
      audioEl.play().catch(err => LOG('audio.play() error (mungkin perlu user gesture):', err));
    };

    pc.onconnectionstatechange = () => {
      LOG('connectionState for', peerUserId, '=', pc.connectionState);
      setConnectedPeers(prev => ({ ...prev, [peerUserId]: pc.connectionState }));
    };

    pc.onsignalingstatechange = () => {
      LOG('signalingState for', peerUserId, '=', pc.signalingState);
    };

    peerConnectionsRef.current[peerUserId] = pc;
    return pc;
  }, [sendSignal]);

  const closePeerConnection = useCallback((peerUserId) => {
    LOG('closing PC for', peerUserId);
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
    setConnectedPeers(prev => {
      const next = { ...prev };
      delete next[peerUserId];
      return next;
    });
  }, []);

  // ✅ Helper: tambahkan ICE candidate, atau simpan dulu kalau remoteDescription belum siap
  const addIceCandidateSafe = async (pc, peerUserId, candidateData) => {
    if (pc.remoteDescription && pc.remoteDescription.type) {
      try {
        await pc.addIceCandidate(candidateData);
        LOG('ICE candidate added for', peerUserId);
      } catch (err) {
        LOG('ERROR addIceCandidate for', peerUserId, err);
      }
    } else {
      LOG('buffering ICE candidate for', peerUserId, '(remoteDescription belum siap)');
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
    if (!enabled || !roomId || !myUserId) {
      LOG('hook not enabled yet. enabled=', enabled, 'roomId=', roomId, 'myUserId=', myUserId);
      return;
    }

    LOG('=== INIT voice channel for room', roomId, 'as user', myUserId, '===');

    const channel = supabase.channel(`voice:${roomId}`, {
      config: { broadcast: { self: false } },
    });

    channel.on('broadcast', { event: 'signal' }, async ({ payload }) => {
      const { from, to, type, payload: data } = payload;
      LOG('RECEIVED <-', from, '->', to, type);

      if (type === 'join-announce-broadcast') {
        if (from === myUserId) return;
        LOG('peer', from, 'announced join. Creating offer...');
        const pc = getOrCreatePeerConnection(from);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal(from, 'offer', offer);
        return;
      }

      if (type === 'leave-broadcast') {
        if (from === myUserId) return;
        closePeerConnection(from);
        return;
      }

      if (to !== myUserId) {
        LOG('ignoring message not addressed to me (to=', to, ')');
        return;
      }

      const pc = getOrCreatePeerConnection(from);

      if (type === 'offer') {
        LOG('got OFFER from', from, '- setting remote desc & creating answer');
        await pc.setRemoteDescription(data);
        await flushPendingCandidates(pc, from);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal(from, 'answer', answer);
      } else if (type === 'answer') {
        LOG('got ANSWER from', from, '- setting remote desc');
        await pc.setRemoteDescription(data);
        await flushPendingCandidates(pc, from);
      } else if (type === 'ice-candidate') {
        await addIceCandidateSafe(pc, from, data);
      }
    });

    channel.subscribe((status) => {
      LOG('channel subscribe status:', status);
      if (status === 'SUBSCRIBED') {
        LOG('announcing my join to room', roomId);
        channel.send({
          type: 'broadcast',
          event: 'signal',
          payload: { from: myUserId, to: 'all', type: 'join-announce-broadcast' },
        });

        // ✅ FIX RACE CONDITION: kirim ulang announce setelah delay,
        // untuk handle kasus kedua device subscribe hampir bersamaan
        // (device lain mungkin belum selesai subscribe saat announce pertama dikirim)
        setTimeout(() => {
          LOG('re-announcing join (delayed, untuk handle race condition)');
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
      LOG('toggleSpeaker ->', next);
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
    if (!speakerOnRef.current) {
      LOG('toggleMic blocked: speaker is off');
      return;
    }

    if (micOnRef.current) {
      LOG('turning mic OFF');
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(track => { track.enabled = false; });
      }
      setMicOn(false);
      return;
    }

    try {
      if (!localStreamRef.current) {
        LOG('requesting getUserMedia for the first time...');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        LOG('getUserMedia GRANTED. Tracks:', stream.getTracks());
        localStreamRef.current = stream;

        const peerIds = Object.keys(peerConnectionsRef.current);
        LOG('attaching mic track to', peerIds.length, 'existing peer connections:', peerIds);
        Object.entries(peerConnectionsRef.current).forEach(([peerId, pc]) => {
          stream.getTracks().forEach(track => {
            LOG('addTrack to PC of', peerId);
            pc.addTrack(track, stream);
          });
        });
      } else {
        LOG('re-enabling existing mic tracks');
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