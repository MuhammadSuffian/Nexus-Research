import Groq from "npm:groq-sdk";
import type { ArxivPaper } from "./arxiv.ts";
import type {
  CritiqueResult,
  MatrixContent,
  MindmapContent,
  SynthesisContent,
} from "./db.ts";

const groq = new Groq({ apiKey: Deno.env.get("GROQ_API_KEY")! });

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const DEFAULT_MODEL = "llama-3.1-70b-versatile";
const FAST_MODEL = "llama-3.1-8b-instant";

async function chat(messages: Groq.Chat.Completions.ChatCompletionMessageParam[]) {
  const completion = await groq.chat.completions.create({
    messages,
    model: DEFAULT_MODEL,
    temperature: 0.3,
    max_tokens: 4096,
  });
  return completion.choices[0]?.message?.content ?? "";
}

async function chatFast(
  messages: Groq.Chat.Completions.ChatCompletionMessageParam[],
  maxTokens = 2048,
) {
  const completion = await groq.chat.completions.create({
    messages,
    model: FAST_MODEL,
    temperature: 0.2,
    max_tokens: maxTokens,
  });
  return completion.choices[0]?.message?.content ?? "";
}

function tryParseJson(raw: string): Record<string, unknown> | null {
  // Trim possible markdown fences
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// 1. Literature Extractor — enriches ArXiv papers with AI metadata
// ---------------------------------------------------------------------------

interface EnrichedPaper extends ArxivPaper {
  relevanceScore: number;
  keyContribution: string;
  tags: string[];
}

export async function runLiteratureExtractor(
  query: string,
  papers: ArxivPaper[],
): Promise<EnrichedPaper[]> {
  if (papers.length === 0) return [];

  const papersForPrompt = papers.map((p, i) =>
    `${i + 1}. Title: ${p.title}\n   Authors: ${p.authors.join(", ")}\n   Abstract: ${p.summary}`
  ).join("\n\n");

  const system = `You are a research literature analyst. Given a research query and a list of ArXiv papers, rate each paper's relevance, extract its single key contribution (one sentence), and assign 2-4 topic tags.

Return ONLY valid JSON (no markdown, no commentary) in this exact shape:
{
  "papers": [
    {
      "index": 1,
      "relevanceScore": 0.95,
      "keyContribution": "...",
      "tags": ["...", "..."]
    },
    ...
  ]
}`;

  const user = `Research query: "${query}"

Papers:
${papersForPrompt}

Return the JSON analysis.`;

  const raw = await chat([
    { role: "system", content: system },
    { role: "user", content: user },
  ]);

  const parsed = tryParseJson(raw);
  const results = (parsed?.papers as Record<string, unknown>[]) ?? [];

  return papers.map((paper, i) => {
    const match = results.find(
      (r: Record<string, unknown>) => r.index === i + 1,
    ) as Record<string, unknown> | undefined;
    return {
      ...paper,
      relevanceScore: (match?.relevanceScore as number) ?? 0.5,
      keyContribution: (match?.keyContribution as string) ?? "",
      tags: (match?.tags as string[]) ?? [],
    };
  });
}

// ---------------------------------------------------------------------------
// 2. Synthesis Engine — narrative synthesis
// ---------------------------------------------------------------------------

export async function runSynthesisEngine(
  query: string,
  papers: ArxivPaper[],
): Promise<SynthesisContent> {
  const sourcesBlock = papers.map((p, i) =>
    `${i + 1}. "${p.title}" — ${p.authors.join(", ")}. ${p.summary}`
  ).join("\n\n");

  const system = `You are a research synthesis expert. Read the provided papers and produce a structured research synthesis.

Return ONLY valid JSON (no markdown, no commentary) in this shape:
{
  "summary": "2-3 paragraph narrative synthesis weaving together the papers...",
  "keyFindings": ["Finding 1", "Finding 2", "..."],
  "methodology": "Overview of common methodologies and approaches...",
  "limitations": "Key limitations across the papers..."
}`;

  const user = `Research query: "${query}"

Source papers:
${sourcesBlock}

Synthesize these into a coherent research overview. Return JSON.`;

  const raw = await chat([
    { role: "system", content: system },
    { role: "user", content: user },
  ]);

  const parsed = tryParseJson(raw);
  return {
    summary: (parsed?.summary as string) ?? raw,
    keyFindings: (parsed?.keyFindings as string[]) ?? [],
    methodology: (parsed?.methodology as string) ?? "",
    limitations: (parsed?.limitations as string) ?? "",
  };
}

// ---------------------------------------------------------------------------
// 3. Mindmap Generator
// ---------------------------------------------------------------------------

export async function runMindmapGenerator(
  query: string,
  papers: ArxivPaper[],
  synthesis: SynthesisContent,
): Promise<MindmapContent> {
  const paperList = papers.map((p) => `- ${p.title}`).join("\n");

  const system = `You create visual concept maps (mindmaps) from research literature. Nodes represent concepts/papers/themes and edges represent relationships.

Return ONLY valid JSON:
{
  "nodes": [
    { "id": "n1", "label": "Central Theme", "group": "core" },
    { "id": "n2", "label": "Paper / Concept", "group": "paper" }
  ],
  "edges": [
    { "from": "n1", "to": "n2" }
  ]
}

Rules:
- Use "core" group for the central query node.
- Use "paper" group for individual papers.
- Use "concept" group for cross-cutting themes/concepts.
- Use "finding" group for key findings.
- Create 8-15 nodes and meaningful edges.
- node ids use the "n1", "n2", ... format.`;

  const user = `Research query: "${query}"

Key findings: ${synthesis.keyFindings.join("; ")}

Papers:
${paperList}

Create a mindmap. Return JSON only.`;

  const raw = await chatFast([
    { role: "system", content: system },
    { role: "user", content: user },
  ], 3072);

  const parsed = tryParseJson(raw);
  return {
    nodes: (parsed?.nodes as MindmapContent["nodes"]) ?? [],
    edges: (parsed?.edges as MindmapContent["edges"]) ?? [],
  };
}

// ---------------------------------------------------------------------------
// 4. Matrix Generator (comparison table)
// ---------------------------------------------------------------------------

export async function runMatrixGenerator(
  query: string,
  papers: ArxivPaper[],
  synthesis: SynthesisContent,
): Promise<MatrixContent> {
  const paperList = papers.map((p) => `- ${p.title}`).join("\n");

  const system = `You create comparison matrices for research papers. Given a list of papers, create a matrix comparing them across several dimensions.

Return ONLY valid JSON:
{
  "rows": ["Paper A", "Paper B", ...],
  "columns": ["Methodology", "Dataset Size", "Key Metric", "Novelty", "Limitations"],
  "data": {
    "Paper A": { "Methodology": 0.8, "Dataset Size": 0.6, ... },
    "Paper B": { ... }
  }
}

Rules:
- rows should be paper titles (shortened if needed).
- columns should be 4-6 meaningful comparison dimensions relevant to the query.
- data values are 0.0-1.0 scores representing how well each paper satisfies each dimension.
- Be fair and objective in scoring.`;

  const user = `Research query: "${query}"

Summary: ${synthesis.summary}

Papers:
${paperList}

Create a comparison matrix. Return JSON only.`;

  const raw = await chatFast([
    { role: "system", content: system },
    { role: "user", content: user },
  ], 3072);

  const parsed = tryParseJson(raw);
  return {
    rows: (parsed?.rows as string[]) ?? [],
    columns: (parsed?.columns as string[]) ?? [],
    data: (parsed?.data as Record<string, Record<string, number>>) ?? {},
  };
}

// ---------------------------------------------------------------------------
// 5. Critique Agent
// ---------------------------------------------------------------------------

export async function runCritiqueAgent(
  query: string,
  papers: ArxivPaper[],
  synthesis: SynthesisContent,
): Promise<CritiqueResult> {
  const paperList = papers.map((p) => `- ${p.title}`).join("\n");

  const system = `You are a critical research reviewer. Review a research synthesis and its source papers, then identify gaps, biases, and provide actionable recommendations.

Return ONLY valid JSON:
{
  "summary": "Overall assessment of the research quality and coverage...",
  "gaps": ["Gap 1", "Gap 2", "..."],
  "biases": ["Bias 1", "Bias 2", "..."],
  "recommendations": ["Recommendation 1", "Recommendation 2", "..."]
}`;

  const user = `Research query: "${query}"

Synthesis summary: ${synthesis.summary}
Key findings: ${synthesis.keyFindings.join("; ")}
Limitations: ${synthesis.limitations}

Papers reviewed:
${paperList}

Critique this research. Return JSON only.`;

  const raw = await chat([
    { role: "system", content: system },
    { role: "user", content: user },
  ]);

  const parsed = tryParseJson(raw);
  return {
    summary: (parsed?.summary as string) ?? raw,
    gaps: (parsed?.gaps as string[]) ?? [],
    biases: (parsed?.biases as string[]) ?? [],
    recommendations: (parsed?.recommendations as string[]) ?? [],
  };
}
