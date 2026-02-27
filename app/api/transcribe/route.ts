import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
    if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json(
            { error: 'OPENAI_API_KEY is not configured.' },
            { status: 500 }
        );
    }

    try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const formData = await req.formData();
        const audioFile = formData.get('audio') as File | null;

        if (!audioFile) {
            return NextResponse.json({ error: 'No audio file provided.' }, { status: 400 });
        }

        // Strip codec params so OpenAI gets a clean content-type it recognises.
        // e.g. "audio/webm;codecs=opus" → "audio/webm"
        const rawType = (audioFile.type ?? 'audio/webm').split(';')[0].trim();
        const ext = rawType.includes('ogg') ? 'ogg' : 'webm';
        const arrayBuffer = await audioFile.arrayBuffer();
        const cleanFile = new File([arrayBuffer], `audio.${ext}`, { type: rawType });

        const transcription = await openai.audio.transcriptions.create({
            model: 'whisper-1',
            file: cleanFile,
            response_format: 'text',
        });

        return NextResponse.json({ transcript: transcription });
    } catch (err: unknown) {
        console.error('[transcribe]', err);
        const message = err instanceof Error ? err.message : 'Transcription failed.';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
