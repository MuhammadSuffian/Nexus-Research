<div align="center">

# 🔬 Nexus Research

### AI-Powered Multi-Agent Academic Research Platform

**Transform any research question into a full literature review in under 2 minutes.**

[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-7.2-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-4.1-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-Edge_Functions-3FCF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![Groq](https://img.shields.io/badge/Groq-LLaMA_3.1-F55036?style=flat-square)](https://groq.com)

</div>

---

## ✨ What Is Nexus Research?

Nexus Research is a full-stack, serverless web application that automates academic literature review. You type a research question — the platform searches **ArXiv**, runs a chain of **3 AI agents** to enrich, synthesize, visualize, and critique the results — and presents everything across **4 interactive views**, all in real-time.

> **What normally takes 4–8 hours of manual reading and writing, Nexus Research does in ~90 seconds.**

---

## 🖥️ Features at a Glance

| Feature | Description |
|---------|-------------|
| 📄 **Synthesis Tab** | AI-written executive summary, key findings, methodology, limitations & critical review |
| 🗺️ **Mindmap Tab** | Interactive SVG knowledge graph — drag & pan to explore conceptual connections |
| 📊 **Matrix Tab** | Sortable heatmap comparison table scoring each paper across multiple dimensions |
| 💬 **Chat Tab** | Context-aware AI assistant grounded in your research synthesis |
| 🧠 **Agent Log Panel** | Real-time sidebar showing each AI agent's progress live |

---

## 🤖 The AI Agent Pipeline

When you submit a query, three AI agents run in sequence — each building on the previous one's output — and stream results back to the browser in real-time via **Server-Sent Events (SSE)**.

```
Query Submitted
      │
      ▼
┌─────────────────────────────────────┐
│  Agent 1: Literature Extractor      │
│  • Fetches 10 papers from ArXiv     │
│  • Scores relevance (0–1)           │
│  • Extracts key contribution        │
│  • Assigns topic tags               │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│  Agent 2: Synthesis Engine          │
│  • Writes narrative synthesis       │
│  • Generates mindmap JSON    ┐      │
│  • Generates matrix JSON     ┘ parallel
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│  Agent 3: Critique Agent            │
│  • Identifies research gaps         │
│  • Surfaces methodological biases   │
│  • Recommends future directions     │
└────────────────┬────────────────────┘
                 │
                 ▼
       Results stream to browser
   (Synthesis · Mindmap · Matrix · Chat)
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.3 | UI component framework |
| **TypeScript** | 5.9 | Full type safety |
| **Vite** | 7.2 | Dev server + bundler |
| **TailwindCSS** | 4.1 | Utility-first styling (OKLCH dark theme) |
| **react-markdown** | 10.1 | Markdown rendering in Chat Tab |
| **remark-gfm** | 4.0 | GitHub Flavored Markdown |
| **lucide-react** | 1.30 | Icon library |

### Backend
| Technology | Purpose |
|------------|---------|
| **Supabase Edge Functions** | Serverless compute (Deno runtime) |
| **Supabase PostgreSQL** | Session + result persistence |
| **Groq SDK** | LLM API client (`llama-3.1-70b-versatile`, `llama-3.1-8b-instant`) |
| **ArXiv API** | Open-access academic paper search (free) |

### AI Models
| Model | Used For |
|-------|----------|
| `llama-3.1-70b-versatile` | Literature enrichment, synthesis, mindmap, critique |
| `llama-3.1-8b-instant` | Matrix generation (fast, structured output) |
| `llama-3.3-70b-versatile` | Chat tab (direct browser → Groq API) |

---

## 🗄️ Database Schema

```
research_sessions     sources               synthesis_outputs     agent_logs
─────────────────     ───────────────────   ─────────────────     ──────────────
id (uuid) PK          id (uuid) PK          id (uuid) PK          id (uuid) PK
query (text)          session_id (FK)       session_id (FK)       session_id (FK)
status (text)         title (text)          tab_type (text)       agent_name (text)
created_at            authors (text)        content (jsonb)       status (text)
                      abstract (text)       created_at            summary (text)
                      url (text)                                  created_at
                      source_type (text)
                      created_at
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) >= 18
- [Supabase](https://supabase.com) account (free tier works)
- [Groq](https://console.groq.com) API key (free tier works)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for deploying Edge Functions)

---

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/nexus-research.git
cd nexus-research
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** in your Supabase dashboard and run the following to create the tables:

```sql
-- Research sessions
create table research_sessions (
  id uuid primary key,
  query text not null,
  status text not null default 'pending',
  created_at timestamptz default now()
);

-- Source papers
create table sources (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references research_sessions(id) on delete cascade,
  title text,
  authors text,
  abstract text,
  url text,
  source_type text,
  created_at timestamptz default now()
);

-- Synthesis outputs (synthesis, mindmap, matrix)
create table synthesis_outputs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references research_sessions(id) on delete cascade,
  tab_type text not null,
  content jsonb,
  created_at timestamptz default now()
);

-- Agent execution logs
create table agent_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references research_sessions(id) on delete cascade,
  agent_name text not null,
  status text not null,
  summary text,
  created_at timestamptz default now()
);
```

### 4. Configure Environment Variables

Copy the example file and fill in your credentials:

```bash
cp .env.example .env
```

```env
# Your Supabase project URL (found in Project Settings → API)
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co

# Your Supabase anon/public key (found in Project Settings → API)
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Your Groq API key (get one free at console.groq.com)
VITE_GROQ_API_KEY=gsk_...
```

### 5. Deploy the Edge Function

```bash
# Login to Supabase CLI
npx supabase login

# Link to your project
npx supabase link --project-ref your-project-ref

# Set the secrets the edge function needs
npx supabase secrets set GROQ_API_KEY=gsk_your_groq_key_here

# Deploy the function
npx supabase functions deploy research-pipeline
```

### 6. Run the Dev Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) — you're ready to go! 🎉

---

## 📁 Project Structure

```
nexus-research/
├── src/
│   ├── components/
│   │   ├── Header.tsx          # Search bar + submit
│   │   ├── TabNavigation.tsx   # Tab switcher (Synthesis/Mindmap/Matrix/Chat)
│   │   ├── SynthesisTab.tsx    # Main results view with synthesis cards
│   │   ├── MindmapTab.tsx      # Custom SVG knowledge graph with pan
│   │   ├── MatrixTab.tsx       # Heatmap comparison table
│   │   ├── ChatTab.tsx         # Context-aware AI chat interface
│   │   └── AgentLogPanel.tsx   # Real-time agent progress sidebar
│   ├── hooks/
│   │   └── usePipeline.ts      # React hook — state + pipeline runner
│   ├── lib/
│   │   ├── pipeline.ts         # SSE client, reducer, pipeline orchestration
│   │   └── supabase.ts         # Supabase client initialization
│   ├── types/
│   │   └── database.ts         # TypeScript types for DB schema
│   ├── App.tsx                 # Root component + tab router
│   └── index.css               # Global styles + CSS custom properties
├── supabase/
│   └── functions/
│       └── research-pipeline/
│           ├── index.ts        # Edge function entry + SSE orchestration
│           ├── agents.ts       # The 3 AI agents (Groq LLM calls)
│           ├── arxiv.ts        # ArXiv API wrapper (Atom XML parser)
│           └── db.ts           # Supabase DB helpers + type definitions
├── .env.example                # Environment variable template
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # TypeScript configuration
└── package.json
```

---

## 🔄 How the SSE Streaming Works

The Edge Function returns a **Server-Sent Events** stream, not a JSON response. The frontend reads this stream in real-time to update the Agent Log Panel as each agent completes.

```
Edge Function                        Browser
─────────────                        ───────
SSE: agent_start "Lit. Extractor"  → Agent Log: 🔵 Running
SSE: agent_complete "Lit. Extractor" → Agent Log: ✅ Complete
SSE: agent_start "Synthesis Engine" → Agent Log: 🔵 Running
SSE: agent_complete "Synthesis Engine" → Agent Log: ✅ Complete
SSE: agent_start "Critique Agent"  → Agent Log: 🔵 Running
SSE: agent_complete "Critique Agent" → Agent Log: ✅ Complete
SSE: pipeline_complete {all data}  → Tabs populate with results
```

---

## 💡 Usage Tips

- **Be specific with your query** — *"federated learning for medical image segmentation"* works better than *"AI in healthcare"*
- **Start with the Synthesis Tab** — get the big picture first, then drill into Mindmap or Matrix
- **Use the Matrix Tab to pick papers** — sort by the dimension most relevant to your work
- **Chat Tab is great for follow-up questions** — ask it to explain a specific concept, compare two papers, or suggest what to read next
- **Agent Log Panel shows live progress** — collapse it after the pipeline finishes to get more screen space

---

## ⚙️ Environment Variables Reference

| Variable | Required | Where to Get It |
|----------|----------|----------------|
| `VITE_SUPABASE_URL` | ✅ Yes | Supabase Dashboard → Project Settings → API |
| `VITE_SUPABASE_ANON_KEY` | ✅ Yes | Supabase Dashboard → Project Settings → API |
| `VITE_GROQ_API_KEY` | ✅ Yes (for Chat Tab) | [console.groq.com](https://console.groq.com) |

> **Note:** `VITE_GROQ_API_KEY` is used by the Chat Tab (browser → Groq direct). The Edge Function uses its own `GROQ_API_KEY` secret set via `supabase secrets set`.

---

## 🚧 Known Limitations

- **ArXiv only** — currently fetches from ArXiv; PubMed, Semantic Scholar, etc. are not yet supported
- **10 paper cap** — hardcoded `maxResults=10` in the ArXiv query
- **No authentication** — sessions are anonymous UUID-based; no user accounts or history browser
- **No token streaming** — LLM responses arrive all at once, not token-by-token
- **Chat API key exposed** — `VITE_GROQ_API_KEY` is visible in the browser bundle; for production, proxy through a backend

---

## 🤝 Contributing

Contributions are welcome! Here are some ideas:

- [ ] Add PubMed / Semantic Scholar as additional paper sources
- [ ] Add user authentication and saved research history
- [ ] Stream LLM tokens for a typing effect in the Chat Tab
- [ ] Export results as PDF or Markdown
- [ ] Add citation format generation (APA, MLA, BibTeX)
- [ ] Implement paper filtering by date, citation count, or author

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

Built with ❤️ using React, Supabase, and Groq

</div>
