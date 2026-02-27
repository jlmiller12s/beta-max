# CORTEX — AI Assistant

> A Next.js 14 (App Router) AI assistant with a Three.js 3D avatar, push-to-talk, OpenAI Whisper STT, GPT-4o-mini chat with an autonomous "constitution" mode selector, and OpenAI TTS audio playback with amplitude-driven avatar animation.

---

## Local Development

### 1. Prerequisites
- Node.js 18+
- npm 9+
- An OpenAI API key (paid tier, with access to Whisper + TTS)

### 2. Environment Setup

```bash
# In the cortex/ directory
cp .env.local.example .env.local
```

Open `.env.local` and replace `sk-...` with your actual OpenAI API key:

```
OPENAI_API_KEY=sk-your-key-here
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

### 5. Add your Avatar

Place your avatar image at:

```
public/avatar.png
```

The image is rendered on a 3D plane. A transparent PNG with a visible character works best. The plane aspect ratio is **2:3 (width:height)** — portrait orientation is ideal.

---

## Using CORTEX

| Action | How |
|---|---|
| **Start talking** | Hold the **Hold to Talk** button, or hold **Spacebar** |
| **Release** | Release button/Spacebar to send audio |
| **Toggle mode** | Click **Public / Private** toggle (top-right) |
| **Conversation history** | Shown in the right panel; last 6 turns are sent to the AI |

### Avatar States
| State | What's happening |
|---|---|
| **Idle** | Floating gently, slow chest glow pulse |
| **Listening** | Faster glow, brighter eyes while recording |
| **Thinking** | Blinking eyes, steady chest glow |
| **Speaking** | Chest pulses to audio amplitude |

### Constitution Modes
The AI auto-selects a mode each turn based on context:

| Mode | Behavior |
|---|---|
| **STABILIZE** | Calm, grounding, one step at a time |
| **STRATEGY** | Structured, decisive, tradeoff-aware |
| **CORRECTION** | Direct, clear, no hedging |
| **BUILD** | Energetic, generative, expansive |

The active mode is shown below the avatar and next to each assistant message.

---

## Vercel Deployment

1. Push the `cortex/` directory contents to a GitHub repository (or use the folder as the root).
2. Import the repo in [Vercel](https://vercel.com/new).
3. Set the **Root Directory** to `cortex` if you placed it in a subdirectory.
4. Add the environment variable:
   - **Name:** `OPENAI_API_KEY`
   - **Value:** your key
5. Deploy. Vercel will run `next build` automatically.

> **Note:** Vercel Hobby plan has a 10-second serverless function timeout. STT + TTS calls on long audio may need the Pro plan (60s timeout). `maxDuration = 30` is already configured on each route.

---

## Customizing the Avatar Glow

Open `components/AvatarScene.tsx`. At the top you'll find:

```ts
const EYE_LEFT_POS:  [number, number, number] = [-0.28, 0.62, 0.02];
const EYE_RIGHT_POS: [number, number, number] = [ 0.28, 0.62, 0.02];
const CHEST_POS:     [number, number, number] = [ 0.0, -0.1,  0.02];
```

Adjust `[x, y, z]` to move glow sprites to match your avatar's eyes and chest.
- Plane is 2 units wide x 3 units tall. (0,0) = center.
- Leave Z at 0.02 (slightly in front of the plane).
- Change `EYE_COLOR` / `CHEST_COLOR` for different glow colors.

---

## Swapping the Avatar

Replace `public/avatar.png` with any PNG. Best results with:
- Transparent background
- Portrait orientation (taller than wide)
- 512×768 px or higher resolution

Then adjust the glow constants in `AvatarScene.tsx` to match the new face/chest positions.

---

## Project Structure

```
cortex/
├── app/
│   ├── api/
│   │   ├── chat/route.ts         # Chat + constitution mode selector
│   │   ├── transcribe/route.ts   # Whisper STT
│   │   └── tts/route.ts          # OpenAI TTS → base64 mp3
│   ├── globals.css               # Global dark theme
│   ├── layout.tsx                # Root layout
│   ├── page.module.css           # Page styles
│   └── page.tsx                  # Main UI + state machine
├── components/
│   ├── AvatarScene.tsx           # R3F Three.js canvas + animations
│   ├── PushToTalk.tsx            # Hold-to-record component
│   └── PushToTalk.module.css     # PTT button styles
├── lib/
│   └── constitution.ts           # Mode selector + system prompts
├── public/
│   └── avatar.png                # Your avatar image (add this!)
├── .env.local.example
└── README.md
```
