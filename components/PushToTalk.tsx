'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './PushToTalk.module.css';

interface PushToTalkProps {
    onTranscript: (text: string) => void;
    onStateChange: (state: 'idle' | 'listening') => void;
    disabled?: boolean;
}

export function PushToTalk({ onTranscript, onStateChange, disabled }: PushToTalkProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const isHoldingRef = useRef(false);

    const startRecording = useCallback(async () => {
        if (isHoldingRef.current || disabled) return;
        isHoldingRef.current = true;
        setError(null);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            chunksRef.current = [];

            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : MediaRecorder.isTypeSupported('audio/webm')
                    ? 'audio/webm'
                    : 'audio/ogg';

            const recorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.onstop = async () => {
                // Stop tracks
                stream.getTracks().forEach((t) => t.stop());
                streamRef.current = null;

                if (chunksRef.current.length === 0) return;

                const blob = new Blob(chunksRef.current, { type: mimeType });
                const ext = mimeType.includes('ogg') ? 'ogg' : 'webm';
                const file = new File([blob], `recording.${ext}`, { type: mimeType });

                const formData = new FormData();
                formData.append('audio', file);

                try {
                    const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
                    const data = await res.json();
                    if (data.error) {
                        setError(data.error);
                    } else if (data.transcript?.trim()) {
                        onTranscript(data.transcript.trim());
                    }
                } catch (e) {
                    setError('Transcription request failed.');
                    console.error(e);
                }
            };

            recorder.start(100); // collect every 100ms
            setIsRecording(true);
            onStateChange('listening');
        } catch (e) {
            isHoldingRef.current = false;
            setError('Microphone access denied.');
            console.error(e);
        }
    }, [disabled, onTranscript, onStateChange]);

    const stopRecording = useCallback(() => {
        if (!isHoldingRef.current) return;
        isHoldingRef.current = false;
        setIsRecording(false);
        onStateChange('idle');

        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
    }, [onStateChange]);

    // Spacebar push-to-talk (don't fire if typing in an input/textarea)
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.code !== 'Space') return;
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;
            e.preventDefault();
            startRecording();
        };

        const onKeyUp = (e: KeyboardEvent) => {
            if (e.code !== 'Space') return;
            stopRecording();
        };

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
        };
    }, [startRecording, stopRecording]);

    return (
        <div className={styles.container}>
            {error && <p className={styles.error}>{error}</p>}
            <div className={styles.buttonWrap}>
                {isRecording && (
                    <>
                        <span className={styles.ring1} />
                        <span className={styles.ring2} />
                    </>
                )}
                <button
                    id="ptt-button"
                    className={`${styles.button} ${isRecording ? styles.active : ''} ${disabled ? styles.disabled : ''}`}
                    onPointerDown={startRecording}
                    onPointerUp={stopRecording}
                    onPointerLeave={stopRecording}
                    disabled={disabled}
                    aria-label="Hold to talk"
                >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" y1="19" x2="12" y2="23" />
                        <line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                </button>
            </div>
            <p className={styles.hint}>
                {isRecording ? 'Listening…' : 'Hold to talk  ·  Space'}
            </p>
        </div>
    );
}
