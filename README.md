# 🍉 MuskMelon — The Version-Controlled Knowledge Twin of Elon Musk

> **Git for human knowledge**: ask what Elon Musk knows, travel back in time to inspect historical stances, analyze belief shifts, and verify every response with claim-level Answer Receipts.

---

## 🧠 What is MuskMelon?

MuskMelon is a **Cognitive Version-Controlled Knowledge Twin** of Elon Musk built for hackathon challenge #2. It grounds every response strictly in verified historical statements, tweets (2010–2025), transcripts, and public roadmap documents.

### Key Capabilities

- 🕒 **Three Temporal Modes**:
  - **Now Mode (2025+)**: Answers using verified knowledge up to the latest timeline (Starship flights, Cybercab, Grok, DOGE).
  - **Time Lens**: Answers strictly according to what was known as of a chosen date (e.g. asking in 2018 vs 2021 about Bitcoin).
  - **Belief Diff**: Compares positions across two time periods and explains *what* changed and *why*.
- 🧾 **Traceable Answer Receipts**: Every response includes inspectable claim-level provenance, supporting source dates, and contradiction detection.
- 🧱 **Knowledge-Voice Firewall**: Elon's bold, first-principles speaking style shapes expression, but is strictly prohibited from introducing unsupported facts.
- 🛡️ **Trap-Question Defence**: Detects and refutes leading questions with false premises (e.g. flat earth).
- 🎙️ **Voice Synthesizer & Speech Input**: Live microphone transcription and custom voice synthesis matching speech cadence.

---

## 🔧 Swytchcode API Execution Layer

Swytchcode serves as the **API execution layer and middleware layer** for the Knowledge Twin, providing managed authentication, schema validation, policy guardrails, and execution metadata logging.

### 3 Core Integrations:
1. **Google Drive (`googledrive`)**: Approved document and knowledge ingestion.
2. **Weaviate (`weaviate`)**: Versioned semantic retrieval.
3. **OpenAI / Gemini**: Grounded response generation with citation synthesis.
*(Optional 4th Channel)*: **Telegram / Slack**: Authorized communication channel with human approval policies.

### Swytchcode Configuration & CLI Reference:
- Tooling Boundary: `.swytchcode/tooling.json`
- Policy Guardrails: `.swytchcode/integrations/policies.json`
- Telemetry & Metadata: `swy.cmd audit stats`, `swy.cmd audit network -n 10`, `swy.cmd audit policy -n 10`
- Model Context Protocol: `swy.cmd mcp serve --claude`

See [SWYTCHCODE.md](./SWYTCHCODE.md) for the full architectural guide.

---

## 🚀 Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/shdra06/muskmelon.git
cd muskmelon

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Add your OPENAI_API_KEY (optional: fallback offline engine is included)

# 4. Start the application
npm run dev
# Open http://localhost:3000
```

---

## 📁 Project Structure

```
muskmelon/
├── .swytchcode/                      # Swytchcode configuration
│   ├── tooling.json                  # Integrations & tools boundary
│   └── integrations/
│       └── policies.json             # Policy guardrails
├── data/musk/                        # Elon Musk dataset (2010–2025)
│   ├── biography.json                # Complete milestone timeline
│   ├── belief-evolution.md           # Position changes over time
│   ├── elon_musk_dataset_2010_2025.json # Seed knowledge base
│   └── sample-tweets.csv             # Tweet dataset archive
├── public/                           # Assets
│   ├── bg-elon-office.png            # Main scene background
│   └── muskmelon-logo.png            # Custom MuskMelon logo
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── page.tsx                  # Main chat & interactive scene
│   │   ├── admin/page.tsx            # Ingest & commit management
│   │   └── api/                      # Route handlers (chat, diff, commits, ingest)
│   ├── components/                   # React components
│   │   ├── press-notebook.tsx        # Physical clipboard input
│   │   ├── crt-screen.tsx            # Phosphor terminal screen
│   │   ├── answer-receipt.tsx        # Provenance verification card
│   │   ├── belief-diff-viewer.tsx    # Side-by-side belief comparison
│   │   ├── sessions-drawer.tsx       # Conversation sessions
│   │   └── settings-drawer.tsx       # Settings & Memory drawer
│   └── lib/                          # Backend logic
│       ├── agent/persona-agent.ts    # Main orchestrator
│       ├── commits/commit-engine.ts  # Knowledge commits
│       ├── rag/grounded-generator.ts # Grounded generation
│       ├── rag/retriever.ts          # Temporal retriever
│       ├── temporal/belief-diff.ts   # Belief diff engine
│       ├── swytchcode/tools.ts       # Swytchcode tool execution
│       ├── voice.ts                  # Voice input & TTS helper
│       └── types.ts                  # TypeScript types
├── PROMPTS.md                        # All system prompts & guardrails
├── SWYTCHCODE.md                     # Swytchcode integration documentation
└── README.md
```

---

## 📄 License

MIT. Built for the NSUT Hackathon 2026.
