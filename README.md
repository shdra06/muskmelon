# 🍉 MuskMelon — The Version-Controlled Knowledge Twin of Elon Musk

> **Git for Human Knowledge**: Ask what Elon Musk knows, travel back in time to inspect historical stances, analyze belief shifts across eras, and verify every single response with claim-level **Answer Receipts** powered by **Swytchcode** and **Weaviate Cloud**.

---

## 🧠 1. What is MuskMelon?

MuskMelon is a **Cognitive Version-Controlled Knowledge Twin** of Elon Musk built for the **Swytchcode Hackathon (Trial 2: The Persona Clone)**. It models Musk's cognitive reasoning, first-principles logic, and conversational rhythm while strictly isolating fact from style using the **Knowledge-Voice Firewall**.

### ✨ Core Features & Problem Statements:

- **PS1: Temporal Grounding & Answer Receipts**:
  - **Now Mode (2025+)**: Answers using verified knowledge up to the latest timeline (Starship Flight 5 catch, Cybercab, Colossus 100k H100 cluster).
  - **Time Lens Mode**: Constrains answers strictly to what was known as of a chosen date (e.g. asking in 2017 vs 2021 about Bitcoin).
  - **Belief Diff Mode**: Side-by-side comparison of position shifts across two historical periods.
  - **Answer Receipts**: Cryptographic claim-level verification attaching verbatim quotes, primary sources, dates, and grounding confidence scores (e.g. 95%).
  - **Honest Absence**: Honestly distinguishes between *"Elon never addressed this"* vs missing data without hallucination.
  - **Trap-Question Defense**: Automatically refutes false premises (e.g. flat earth).

- **PS2: Generalization, Style & Tone Cloning**:
  - Clones Elon Musk's genuine phrasing, conversational cadence (*"Yeah, I mean...", "Look, from a physics standpoint..."*), and 5-step engineering algorithm.
  - Reasons through **novel, out-of-dataset scenarios** from first-principles physical limits (mass, energy, cycle time).

---

## ⚡ 2. Swytchcode API Execution Layer

Swytchcode serves as the central middleware between the AI Agent and external production APIs, enforcing policies, auth, retries, and audit telemetry.

$$\text{User / Event} \longrightarrow \text{AI Agent} \longrightarrow \text{\textbf{Swytchcode Execution Layer}} \longrightarrow \text{External APIs} \longrightarrow \text{Result / Action}$$

### Connected Integrations:
1. **OpenAI (`openai`)**: Default primary reasoning model (`gpt-4o`) with temporal RAG context.
2. **Weaviate (`weaviate`)**: Live cloud vector cluster (`ElonMuskMemory` & `ElonKnowledgeGraph`).
3. **Google Drive (`googledrive`)**: Approved document and historical transcript ingestion.
4. **Stripe (`stripe`)**: Production-ready agentic refund flow with `$500` policy guardrail.
5. **Gmail (`gmail`) / Slack (`slack`) / Telegram (`telegram`)**: Multi-channel verified notification delivery.

### Swytchcode CLI & Audit Inspection:
```powershell
# 1. Check logged-in account status
swy.cmd whoami

# 2. Check enabled tools in project boundary
swy.cmd list

# 3. View live execution metrics & latency
swy.cmd audit stats

# 4. Inspect recent network calls executed through Swytchcode
swy.cmd audit network -n 10

# 5. Run the built-in MCP server for AI coding assistants
swy.cmd mcp serve --claude
```

---

## 🗄️ 3. Live Weaviate Cloud Vector & Knowledge Graph

MuskMelon is connected to a live cloud cluster:
- **REST Endpoint**: `https://xqr3z5ags5w0vxrzhitlw.c0.eu-central-1.aws.weaviate.cloud`
- **Schemas**:
  - `ElonMuskMemory`: 1536-dimensional temporal vectors with `validFrom` / `validTo` date timestamps.
  - `ElonKnowledgeGraph`: Structured entity relationships (`SpaceX DEVELOPED Starship -> TARGETS Mars`) and cognitive rhythm profiles.

---

## 🚀 4. Quick Start & Running Locally

```bash
# 1. Clone the repository
git clone https://github.com/shdra06/muskmelon.git
cd muskmelon

# 2. Install dependencies
npm install

# 3. Configure environment variables in .env.local
WEAVIATE_URL=https://xqr3z5ags5w0vxrzhitlw.c0.eu-central-1.aws.weaviate.cloud
WEAVIATE_API_KEY=bTBEMHdEVVVsTVBlSSt5K19zUlFqdjBWL053Qm42ck95bW1vWllQeVRIUFRkemxRYzBqNEtLMk43ejVZPV92MjAw
OPENAI_API_KEY=sk-proj-your-openai-key-here

# 4. Sync Weaviate Cloud database
npm run sync:weaviate

# 5. Run the GDG Agentic Refund test suite ($2,500 rejection & $400 approval)
npm run test:gdg-agent

# 6. Start the production web application
npm run build && npm start
# Open http://localhost:3000
```

---

## 🧪 5. Verification & Test Commands

| Test Suite | Command | What It Verifies |
|---|---|---|
| **GDG Agentic Guardrails** | `npm run test:gdg-agent` | Proves `$2,500` refund is blocked by policy (Exit 4) and `$400` refund is executed via Stripe + Gmail (Exit 0). |
| **Weaviate Database Sync** | `npm run sync:weaviate` | Ingests all 2010–2025 knowledge chunks and Knowledge Graph nodes to Weaviate Cloud. |
| **Swytchcode Telemetry Audit** | `swy.cmd audit stats` | Live audit logs of all API executions and policy rules. |

---

## 📁 6. Codebase Architecture

```
muskmelon/
├── .swytchcode/                      # Swytchcode Trust Boundary & Policies
│   ├── tooling.json                  # Registered external tools (OpenAI, Weaviate, Stripe, Gmail)
│   ├── policies.json                 # $500 refund limit, read/write permissions
│   └── manifest.json                 # Project execution manifest
├── src/
│   ├── app/                          # Next.js 15 App Router
│   │   ├── page.tsx                  # Ultra-premium Cyberpunk Glassmorphic HUD & Press Notebook
│   │   ├── admin/page.tsx            # Knowledge ingestion & telemetry audit portal
│   │   └── api/                      # REST Endpoints (/api/chat, /api/pipeline, /api/diff, /api/ingest)
│   ├── lib/
│   │   ├── agent/persona-agent.ts    # Multi-turn orchestrator
│   │   ├── rag/grounded-generator.ts # OpenAI GPT-4o generator with Knowledge-Voice Firewall
│   │   ├── rag/cognitive-signature.ts# PS2 Elon Musk personality, rhythm, and tone definitions
│   │   ├── rag/answer-receipt.ts     # Provenance verifier with confidence scoring
│   │   ├── weaviate/weaviate-client.ts# Live Weaviate Cloud vector store connector
│   │   ├── knowledge-graph/          # Graph engine & 2010–2025 Elon database
│   │   └── swytchcode/               # Swytchcode middleware, tools, telemetry, and pipeline engine
│   └── components/                   # React UI components
├── scripts/
│   ├── test-gdg-agent.ts             # GDG Production-Ready AI Agent test suite
│   └── sync-weaviate-knowledge.ts    # Weaviate Cloud synchronization script
├── SWYTCHCODE_DEEP_AUDIT.md          # Comprehensive hackathon Swytchcode deep audit report
├── ARCHITECTURE.md                   # System design & Knowledge-Voice Firewall specification
└── README.md
```

---

## 📄 License
MIT. Built for the NSUT Hackathon 2026.
