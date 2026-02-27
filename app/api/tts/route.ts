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
        const { text } = await req.json();
        if (!text || typeof text !== 'string') {
            return NextResponse.json({ error: 'No text provided.' }, { status: 400 });
        }

        const mp3Response = await openai.audio.speech.create({
            model: 'tts-1',
            voice: 'coral',
            input: text.slice(0, 4096),
            response_format: 'mp3',
        });

        const buffer = Buffer.from(await mp3Response.arrayBuffer());
        const base64 = buffer.toString('base64');

        return NextResponse.json({ audio: base64 });
    } catch (err: unknown) {
        console.error('[tts]', err);
        const message = err instanceof Error ? err.message : 'TTS failed.';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
