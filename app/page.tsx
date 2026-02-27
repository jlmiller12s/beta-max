'use client';

import { useCallback, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { PushToTalk } from '@/components/PushToTalk';
import { AvatarState } from '@/components/AvatarScene';
import styles from './page.module.css';

// Dynamically import R3F canvas (no SSR)
const AvatarScene = dynamic(
  () => import('@/components/AvatarScene').then((m) => m.AvatarScene),
  { ssr: false }
);

interface Message {
  role: 'user' | 'assistant';
  content: string;
  mode?: string;
}

export default function Home() {
  const [avatarState, setAvatarState] = useState<AvatarState>('idle');
  const [amplitude, setAmplitude] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [isPublic, setIsPublic] = useState(true);
  const [currentMode, setCurrentMode] = useState<string>('–');
  const [apiError, setApiError] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const amplitudeFrameRef = useRef<number>(0);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const getAmplitude = useCallback((analyser: AnalyserNode): number => {
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (const v of data) sum += Math.abs(v - 128);
    return Math.min(1, (sum / data.length) / 30);
  }, []);

  const stopAmplitudeTracking = useCallback(() => {
    if (amplitudeFrameRef.current) {
      cancelAnimationFrame(amplitudeFrameRef.current);
      amplitudeFrameRef.current = 0;
    }
    setAmplitude(0);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch (e) { /* already stopped */ }
      sourceRef.current = null;
    }
    stopAmplitudeTracking();
    setStatus('idle');
    setAvatarState('idle');
  }, [stopAmplitudeTracking]);

  const handleTranscript = useCallback(async (transcript: string) => {
    setApiError(null);
    setShowTranscript(true);
    const userMsg: Message = { role: 'user', content: transcript };
    setMessages((prev) => {
      const next = [...prev, userMsg];
      scrollToBottom();
      return next;
    });

    setStatus('thinking');
    setAvatarState('thinking');

    // ----- Chat -----
    let reply = '';
    let mode = 'STRATEGY';
    try {
      const chatRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          isPublic,
          history: messages.slice(-6),
        }),
      });
      const chatData = await chatRes.json();
      if (chatData.error) throw new Error(chatData.error);
      reply = chatData.reply;
      mode = chatData.mode ?? 'STRATEGY';
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Chat failed.';
      setApiError(msg);
      setStatus('idle');
      setAvatarState('idle');
      return;
    }

    setCurrentMode(mode);
    const assistantMsg: Message = { role: 'assistant', content: reply, mode };
    setMessages((prev) => {
      const next = [...prev, assistantMsg];
      scrollToBottom();
      return next;
    });

    // ----- TTS -----
    setStatus('speaking');
    setAvatarState('speaking');

    try {
      const ttsRes = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: reply }),
      });
      const ttsData = await ttsRes.json();
      if (ttsData.error) throw new Error(ttsData.error);

      const binary = atob(ttsData.audio);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const arrayBuffer = bytes.buffer;

      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') await ctx.resume();

      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      source.connect(analyser);
      analyser.connect(ctx.destination);

      const trackAmp = () => {
        if (!analyserRef.current) return;
        const amp = getAmplitude(analyserRef.current);
        setAmplitude(amp);
        amplitudeFrameRef.current = requestAnimationFrame(trackAmp);
      };
      amplitudeFrameRef.current = requestAnimationFrame(trackAmp);

      sourceRef.current = source;
      source.start();
      source.onended = () => {
        sourceRef.current = null;
        stopAmplitudeTracking();
        setStatus('idle');
        setAvatarState('idle');
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Audio playback failed.';
      console.error('[TTS playback]', msg);
      setApiError(msg);
      stopAmplitudeTracking();
      setStatus('idle');
      setAvatarState('idle');
    }
  }, [isPublic, messages, getAmplitude, stopAmplitudeTracking]);

  const handlePttStateChange = useCallback((s: 'idle' | 'listening') => {
    setStatus(s);
    setAvatarState(s);
  }, []);

  function scrollToBottom() {
    setTimeout(() => {
      transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: 'smooth' });
    }, 50);
  }

  const modeColors: Record<string, string> = {
    STABILIZE: '#66ddaa',
    STRATEGY: '#66aaff',
    CORRECTION: '#ff9966',
    BUILD: '#cc88ff',
  };

  const statusLabels: Record<string, string> = {
    idle: 'Idle',
    listening: 'Listening',
    thinking: 'Thinking',
    speaking: 'Speaking',
  };

  return (
    <main className={styles.main}>
      {/* ── Fullscreen Avatar Background ──────────── */}
      <div className={styles.avatarFullscreen}>
        <AvatarScene state={avatarState} amplitude={amplitude} />
      </div>

      {/* ── Floating Header ──────────────────────── */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoText}>CORTEX</span>
          <span className={styles.logoSub}>AI</span>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.statusPill} data-state={status}>
            <span className={styles.statusDot} />
            {statusLabels[status]}
          </div>
          <div
            className={styles.modeTag}
            style={{ color: modeColors[currentMode] ?? '#aaa' }}
          >
            {currentMode !== '–' && (
              <span
                className={styles.modeDot}
                style={{ background: modeColors[currentMode] ?? '#aaa' }}
              />
            )}
            {currentMode}
          </div>
          <label className={styles.toggle}>
            <span className={isPublic ? styles.toggleLabelActive : styles.toggleLabel}>Public</span>
            <div
              id="mode-toggle"
              className={styles.toggleSwitch}
              role="switch"
              aria-checked={!isPublic}
              onClick={() => setIsPublic((p) => !p)}
            >
              <span className={`${styles.toggleThumb} ${!isPublic ? styles.toggleThumbRight : ''}`} />
            </div>
            <span className={!isPublic ? styles.toggleLabelActive : styles.toggleLabel}>Private</span>
          </label>

        </div>
      </header>

      {/* ── Floating Bottom Controls ─────────────── */}
      <div className={styles.bottomControls}>
        {status === 'speaking' ? (
          <button className={styles.stopBtn} onClick={stopSpeaking} aria-label="Stop speaking">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          </button>
        ) : (
          <PushToTalk
            onTranscript={handleTranscript}
            onStateChange={handlePttStateChange}
            disabled={status === 'thinking'}
          />
        )}
      </div>

      {/* ── Transcript Drawer (slides in from right) */}
      {showTranscript && (
        <aside className={styles.transcriptDrawer}>
          <div className={styles.transcriptHeader}>
            <h2 className={styles.transcriptTitle}>Conversation</h2>
            <button
              className={styles.closeBtn}
              onClick={() => setShowTranscript(false)}
              aria-label="Close transcript"
            >
              ✕
            </button>
          </div>
          <div className={styles.messageList} ref={transcriptRef}>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`${styles.message} ${msg.role === 'user' ? styles.userMessage : styles.assistantMessage}`}
              >
                {msg.role === 'assistant' && msg.mode && (
                  <span
                    className={styles.messageModeTag}
                    style={{ color: modeColors[msg.mode] ?? '#aaa' }}
                  >
                    {msg.mode}
                  </span>
                )}
                <p className={styles.messageContent}>{msg.content}</p>
              </div>
            ))}
          </div>
          {apiError && (
            <div className={styles.errorBanner}>⚠ {apiError}</div>
          )}
        </aside>
      )}

      {/* Show transcript toggle when hidden */}
      {!showTranscript && messages.length > 0 && (
        <button
          className={styles.showTranscriptBtn}
          onClick={() => setShowTranscript(true)}
          aria-label="Show transcript"
        >
          💬
        </button>
      )}
    </main>
  );
}
