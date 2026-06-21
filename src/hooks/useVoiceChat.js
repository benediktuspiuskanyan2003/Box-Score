/**
 * useVoiceChat.js — Voice chat mesh P2P via WebRTC,
 * signaling lewat Supabase Realtime Broadcast.
 *
 * Arsitektur:
 * - Setiap pemain bikin RTCPeerConnection ke SETIAP pemain lain di room (mesh).
 *   Untuk N pemain, total koneksi = N*(N-1)/2. Max 5 pemain = 10 koneksi.
 * - Signaling (offer/answer/ICE candidate) dikirim lewat Supabase Broadcast
 *   channel, BUKAN disimpan ke database -- ini cuma pesan sementara untuk
 *   membangun koneksi WebRTC, sekali terhubung, audio mengalir P2P langsung
 *   antar browser (tidak lewat Supabase lagi).
 * - STUN server publik Google dipakai untuk NAT traversal. Tanpa TURN server,
 *   sebagian kecil user di balik NAT/firewall yang sangat ketat bisa gagal
 *   connect -- ini trade-off yang sudah disepakati untuk versi awal.
 *
 * Alur join:
 * 1. User masuk room -> subscribe ke channel signaling, broadcast "saya join"
 * 2. Pemain yang SUDAH ADA di room menerima broadcast itu, masing-masing
 *    membuat RTCPeerConnection baru ke pemain yang baru join, kirim "offer"
 * 3. Pemain baru menerima offer, balas dengan "answer"
 * 4. ICE candidates ditukar dua arah sampai koneksi P2P terbentuk
 *
 * Speaker vs Mic:
 * - Speaker ON dari awal (default true) -- koneksi WebRTC + nerima audio
 *   orang lain selalu berjalan begitu hook ini dipakai.
 * - Mic TIDAK minta izin getUserMedia sampai user pertama kali toggle mic ON.
 * - Kalau speaker di-OFF, mic otomatis ikut di-OFF (track audio lokal di-stop
 *   sementara, tapi MediaStream tidak di-release total supaya bisa ON lagi
 *   tanpa minta izin browser berulang).
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const STUN_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export function useVoiceChat({ roomId, myUserId, myName, enabled = true }) {
  const [speakerOn, setSpeakerOn] = useState(true);
  const [micOn, setMicOn] = useState(false); // mic mati di awal, belum minta izin
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);
  const [connectedPeers, setConnectedPeers] = useState({}); // { userId: 'connecting'|'connected'|'failed' }

  const channelRef = useRef(null);
  const localStreamRef = useRef(null); // MediaStream mic lokal (lazy, baru dibuat saat mic pertama ON)
  const peerConnectionsRef = useRef({}); // { userId: RTCPeerConnection }
  const remoteAudioElsRef = useRef({}); // { userId: HTMLAudioElement }
  const speakerOnRef = useRef(true);
  const micOnRef = useRef(false);

  useEffect(() => { speakerOnRef.current = speakerOn; }, [speakerOn]);
  useEffect(() => { micOnRef.current = micOn; }, [micOn]);

  // ── Helper: kirim signaling message lewat Supabase Broadcast ──
  const sendSignal = useCallback((toUserId, type, payload) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'signal',
      payload: { from: myUserId, to: toUserId, type, payload },
    });
  }, [myUserId]);

  // ── Buat/ambil RTCPeerConnection untuk seorang peer ──
  const getOrCreatePeerConnection = useCallback((peerUserId) => {
    if (peerConnectionsRef.current[peerUserId]) {
      return peerConnectionsRef.current[peerUserId];
    }

    const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });

    // Kirim track audio lokal kalau sudah ada (mic sudah pernah diizinkan)
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal(peerUserId, 'ice-candidate', event.candidate);
      }
    };

    pc.ontrack = (event) => {
      // Audio dari peer lain -- mainkan lewat <audio> element
      let audioEl = remoteAudioElsRef.current[peerUserId];
      if (!audioEl) {
        audioEl = new Audio();
        audioEl.autoplay = true;
        remoteAudioElsRef.current[peerUserId] = audioEl;
      }
      audioEl.srcObject = event.streams[0];
      audioEl.muted = !speakerOnRef.current; // hormati status speaker saat ini
    };

    pc.onconnectionstatechange = () => {
      setConnectedPeers(prev => ({ ...prev, [peerUserId]: pc.connectionState }));
    };

    peerConnectionsRef.current[peerUserId] = pc;
    return pc;
  }, [sendSignal]);

  // ── Cleanup satu peer connection ──
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
    setConnectedPeers(prev => {
      const next = { ...prev };
      delete next[peerUserId];
      return next;
    });
  }, []);

  // ── Setup signaling channel & handle pesan masuk ──
  useEffect(() => {
    if (!enabled || !roomId || !myUserId) return;

    const channel = supabase.channel(`voice:${roomId}`, {
      config: { broadcast: { self: false } },
    });

    channel.on('broadcast', { event: 'signal' }, async ({ payload }) => {
      const { from, to, type, payload: data } = payload;

      if (type === 'join-announce-broadcast') {
        if (from === myUserId) return;
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

      if (to !== myUserId) return; // pesan terarah, bukan untuk saya

      const pc = getOrCreatePeerConnection(from);

      if (type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(data));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal(from, 'answer', answer);
      } else if (type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(data));
      } else if (type === 'ice-candidate') {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data));
        } catch (err) {
          console.warn('[VoiceChat] Gagal addIceCandidate:', err);
        }
      }
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'signal',
          payload: { from: myUserId, to: 'all', type: 'join-announce-broadcast' },
        });
      }
    });

    channelRef.current = channel;

    return () => {
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

  // ── Toggle Speaker ──
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

  // ── Toggle Mic ──
  const toggleMic = useCallback(async () => {
    if (!speakerOnRef.current) return; // tidak bisa toggle mic kalau speaker off

    if (micOnRef.current) {
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(track => { track.enabled = false; });
      }
      setMicOn(false);
      return;
    }

    try {
      if (!localStreamRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;

        Object.values(peerConnectionsRef.current).forEach(pc => {
          stream.getTracks().forEach(track => pc.addTrack(track, stream));
        });
      } else {
        localStreamRef.current.getAudioTracks().forEach(track => { track.enabled = true; });
      }
      setMicOn(true);
      setMicPermissionDenied(false);
    } catch (err) {
      console.error('[VoiceChat] Gagal akses mikrofon:', err);
      setMicPermissionDenied(true);
    }
  }, []);

  // ── Cleanup total saat unmount ──
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