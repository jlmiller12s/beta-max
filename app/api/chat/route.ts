import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import {
    ConstitutionMode,
    MODE_SELECTOR_PROMPT,
    MODES,
    buildSystemPrompt,
} from '@/lib/constitution';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface HistoryMessage {
    role: 'user' | 'assistant';
    content: string;
}

export async function POST(req: NextRequest) {
    if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json(
            { error: 'OPENAI_API_KEY is not configured.' },
            { status: 500 }
        );
    }

    try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const { transcript, isPublic, history } = await req.json() as {
            transcript: string;
            isPublic: boolean;
            history: HistoryMessage[];
        };

        if (!transcript || typeof transcript !== 'string') {
            return NextResponse.json({ error: 'No transcript provided.' }, { status: 400 });
        }

        // --- Step 1: Mode selection (constitution pre-step) ---
        const recentHistory = (history ?? []).slice(-6);
        const historySnippet = recentHistory
            .map((m: HistoryMessage) => `${m.role.toUpperCase()}: ${m.content}`)
            .join('\n');

        const modeSelectorMessages = [
            { role: 'system' as const, content: MODE_SELECTOR_PROMPT },
            {
                role: 'user' as const,
                content: `Recent conversation:\n${historySnippet || '(none)'}\n\nUser's latest message: "${transcript}"\n\nMode:`,
            },
        ];

        const modeResponse = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: modeSelectorMessages,
            max_tokens: 10,
            temperature: 0,
        });

        const rawMode = (modeResponse.choices[0]?.message?.content ?? '').trim().toUpperCase();
        const mode: ConstitutionMode = MODES.includes(rawMode as ConstitutionMode)
            ? (rawMode as ConstitutionMode)
            : 'STRATEGY';

        // --- Step 2: Main chat response ---
        const systemPrompt = buildSystemPrompt(mode, isPublic ?? true);

        const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
            { role: 'system', content: systemPrompt },
            ...recentHistory.map((m: HistoryMessage) => ({
                role: m.role,
                content: m.content,
            })),
            { role: 'user', content: transcript },
        ];

        const chatResponse = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: chatMessages,
            max_tokens: 300,
            temperature: 0.7,
        });

        const reply = chatResponse.choices[0]?.message?.content ?? 'I had trouble generating a response.';

        return NextResponse.json({ mode, reply });
    } catch (err: unknown) {
        console.error('[chat]', err);
        const message = err instanceof Error ? err.message : 'Chat failed.';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
