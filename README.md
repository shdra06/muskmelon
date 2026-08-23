# MindCommit — The Version-Controlled Knowledge Twin

> **Git for human knowledge**: ask what Elon Musk knows, see how his thinking evolved, and verify every answer.

## 🧠 What is MindCommit?

MindCommit creates a consent-based, version-controlled knowledge twin that can answer as a person knew at a selected point in time, reveal how their thinking changed, and prove every response through a traceable **Answer Receipt**.

**Current Subject**: Elon Musk (tweets 2010–2025 + public statements)

### Three Modes

| Mode | What it Does |
|------|-------------|
| **Now Mode** | Answers using the latest verified knowledge |
| **Time Lens** | Answers exactly as the data supported at a selected date |
| **Belief Diff** | Compares two periods and explains what changed |

### Key Features

- 🔒 **Cognitive Version Control** — Knowledge stored as evolving, timestamped commits
- 📊 **Belief Diff** — Compare how positions changed between two dates
- 🧱 **Knowledge–Voice Firewall** — Style shapes expression but never introduces facts
- ⚡ **Temporal Contradiction Engine** — Conflicting statements placed on a timeline
- 🧾 **Answer Receipts** — Every response includes inspectable claim-level provenance
- 🗺️ **Knowledge Boundary Map** — Shows which topics are covered deeply vs. partially
- 🛡️ **Trap-Question Defence** — Detects leading questions with false premises
- 🤖 **AI Identity Watermark** — Every response identified as an AI reconstruction

## 🔧 Powered by Swytchcode

Swytchcode is the **backbone** of MindCommit — every external API call flows through it.

**10 integrations, 30+ tools, 16 policy rules**

See [SWYTCHCODE.md](./SWYTCHCODE.md) for the complete integration documentation.

```bash
# Install Swytchcode
npm install -g swytchcode

# Set up integrations
swy init && swy login
swy get googledrive notion github youtube gmail slack telegram resend firecrawl google_calendar
```

## 🚀 Quick Start

```bash
# 1. Clone and install
git clone <repo>
cd vibewrite
npm install

# 2. Configure
cp .env.example .env.local
# Add your OPENAI_API_KEY

# 3. Run
npm run dev

# 4. Open
# http://localhost:3000       — Chat with the Knowledge Twin
# http://localhost:3000/admin — Upload tweets CSV & manage sources
```

## 📁 Project Structure

```
vibewrite/
├── .swytchcode/                    # Swytchcode configuration
│   ├── tooling.json                # 10 integrations, 30+ tools
│   └── policies.json               # 16 policy rules
├── data/musk/                      # Elon Musk knowledge dataset
│   ├── biography.json              # Life timeline
│   ├── belief-evolution.md         # Position changes over time
│   └── sample-tweets.csv           # Sample tweets for testing
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── page.tsx                # Main chat UI (3 modes)
│   │   ├── admin/page.tsx          # Admin panel
│   │   └── api/                    # API routes
│   │       ├── chat/route.ts       # Chat endpoint
│   │       ├── ingest/route.ts     # File ingestion
│   │       ├── commits/route.ts    # Knowledge commits
│   │       └── diff/route.ts       # Belief diff
│   ├── components/                 # React components
│   │   ├── mode-selector.tsx       # Now | Time Lens | Belief Diff
│   │   ├── chat-message.tsx        # Chat messages with receipts
│   │   ├── answer-receipt.tsx      # Provenance display
│   │   ├── belief-diff-viewer.tsx  # Side-by-side diff
│   │   ├── commit-timeline.tsx     # Timeline visualization
│   │   ├── sources-panel.tsx       # Source chunks panel
│   │   └── upload-zone.tsx         # File upload
│   └── lib/                        # Backend logic
│       ├── agent/                   # Main persona agent
│       ├── commits/                 # Knowledge Commit Engine
│       ├── ingest/                  # Document parsing + chunking
│       ├── rag/                     # RAG pipeline + Answer Receipts
│       ├── swytchcode/             # Swytchcode integration
│       ├── temporal/               # Temporal index + Contradiction Engine
│       ├── vectorstore/            # In-memory vector store
│       └── types.ts                # Type system
├── SWYTCHCODE.md                   # Swytchcode integration docs
└── README.md                       # This file
```

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TailwindCSS |
| Backend | Node.js, TypeScript |
| AI/LLM | OpenAI GPT-4o |
| Embeddings | OpenAI text-embedding-3-small |
| Vector Store | In-memory (hackathon) / Weaviate (production) |
| API Layer | **Swytchcode** (CLI + MCP Server) |
| Dataset | Elon Musk Tweets 2010–2025 (Kaggle) |

## 📄 License

Built for NSUT Hackathon 2026.
