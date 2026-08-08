import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { searchArXiv } from "./arxiv.ts";
import {
  runCritiqueAgent,
  runLiteratureExtractor,
  runMatrixGenerator,
  runMindmapGenerator,
  runSynthesisEngine,
} from "./agents.ts";
import {
  getAgentLogs,
  getSources,
  getSynthesisOutputs,
  insertAgentLog,
  insertSource,
  insertSynthesisOutput,
  updateAgentLog,
  updateSessionStatus,
} from "./db.ts";

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function corsResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// SSE helpers
// ---------------------------------------------------------------------------

interface SSEEvent {
  type: string;
  [key: string]: unknown;
}

function sendSSE(controller: ReadableStreamDefaultController, event: SSEEvent) {
  const encoder = new TextEncoder();
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

interface PipelineRequest {
  sessionId: string;
  query: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== "POST") {
    return corsResponse({ error: "Only POST requests are accepted." }, 405);
  }

  let body: PipelineRequest;
  try {
    body = await req.json();
  } catch {
    return corsResponse({ error: "Invalid JSON body." }, 400);
  }

  const { sessionId, query } = body;

  if (!sessionId || typeof sessionId !== "string") {
    return corsResponse({ error: "Missing or invalid sessionId." }, 400);
  }

  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return corsResponse({ error: "Missing or invalid query." }, 400);
  }

  const trimmedQuery = query.trim();

  // Build an SSE stream that runs the full pipeline
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // --------------------------------------
        // STEP 1: Mark session as running
        // --------------------------------------
        await updateSessionStatus(sessionId, "running");

        // --------------------------------------
        // STEP 2: Agent 1 — Literature Extractor
        // --------------------------------------
        sendSSE(controller, { type: "agent_start", agent_name: "Literature Extractor" });

        const extractorLogId = (await insertAgentLog(
          sessionId,
          "Literature Extractor",
          "running",
        )).id;

        const arxivPapers = await searchArXiv(trimmedQuery, 10);
        const enrichedPapers = await runLiteratureExtractor(trimmedQuery, arxivPapers);

        for (const paper of enrichedPapers) {
          await insertSource(sessionId, {
            title: paper.title,
            authors: paper.authors,
            abstract: paper.summary,
            url: paper.url,
            source_type: "arxiv",
            published: paper.published,
          } as Parameters<typeof insertSource>[1]);
        }

        const extractorSummary =
          `Extracted and enriched ${enrichedPapers.length} papers from ArXiv for query: "${trimmedQuery}"`;

        await updateAgentLog(extractorLogId, "complete", extractorSummary);

        sendSSE(controller, {
          type: "agent_complete",
          agent_name: "Literature Extractor",
          summary: `Extracted and enriched ${enrichedPapers.length} papers from ArXiv.`,
        });

        // --------------------------------------
        // STEP 3: Agent 2 — Synthesis Engine
        // --------------------------------------
        sendSSE(controller, { type: "agent_start", agent_name: "Synthesis Engine" });

        const synthesisLogId = (await insertAgentLog(
          sessionId,
          "Synthesis Engine",
          "running",
        )).id;

        // Narrative synthesis
        const synthesis = await runSynthesisEngine(trimmedQuery, enrichedPapers);
        await insertSynthesisOutput(sessionId, "synthesis", synthesis);

        // Mindmap + Matrix (parallel)
        const mindmapPromise = runMindmapGenerator(
          trimmedQuery,
          enrichedPapers,
          synthesis,
        ).then((mindmap) => insertSynthesisOutput(sessionId, "mindmap", mindmap));

        const matrixPromise = runMatrixGenerator(
          trimmedQuery,
          enrichedPapers,
          synthesis,
        ).then((matrix) => insertSynthesisOutput(sessionId, "matrix", matrix));

        await Promise.all([mindmapPromise, matrixPromise]);

        const synthesisSummary =
          `Generated synthesis, mindmap, and comparison matrix from ${enrichedPapers.length} papers.`;

        await updateAgentLog(synthesisLogId, "complete", synthesisSummary);

        sendSSE(controller, {
          type: "agent_complete",
          agent_name: "Synthesis Engine",
          summary: synthesisSummary,
        });

        // --------------------------------------
        // STEP 4: Agent 3 — Critique Agent
        // --------------------------------------
        sendSSE(controller, { type: "agent_start", agent_name: "Critique Agent" });

        const critiqueLogId = (await insertAgentLog(
          sessionId,
          "Critique Agent",
          "running",
        )).id;

        const critique = await runCritiqueAgent(
          trimmedQuery,
          enrichedPapers,
          synthesis,
        );

        const critiqueSummary = critique.summary.substring(0, 300);

        await updateAgentLog(critiqueLogId, "complete", critiqueSummary);

        sendSSE(controller, {
          type: "agent_complete",
          agent_name: "Critique Agent",
          summary: critiqueSummary,
        });

        // --------------------------------------
        // STEP 5: Mark session complete
        // --------------------------------------
        await updateSessionStatus(sessionId, "complete");

        // --------------------------------------
        // STEP 6: Gather and stream final results
        // --------------------------------------
        const [sources, synthesisOutputs, agentLogs] = await Promise.all([
          getSources(sessionId),
          getSynthesisOutputs(sessionId),
          getAgentLogs(sessionId),
        ]);

        sendSSE(controller, {
          type: "pipeline_complete",
          sessionId,
          query: trimmedQuery,
          sources,
          synthesisOutputs,
          agentLogs,
          synthesis,
          critique,
        });

        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("Pipeline error:", message);

        // Attempt to mark as error (best-effort)
        try {
          await updateSessionStatus(sessionId, "error");
        } catch {
          // ignore — session may not exist
        }

        sendSSE(controller, { type: "pipeline_error", error: message });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
});
