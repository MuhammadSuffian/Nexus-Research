import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

export interface ArxivSource {
  title: string;
  authors: string[];
  abstract: string;
  url: string;
  published: string;
}

export interface SynthesisContent {
  summary: string;
  keyFindings: string[];
  methodology: string;
  limitations: string;
}

export interface MindmapContent {
  nodes: { id: string; label: string; group: string }[];
  edges: { from: string; to: string }[];
}

export interface MatrixContent {
  rows: string[];
  columns: string[];
  data: Record<string, Record<string, number>>;
}

export interface CritiqueResult {
  summary: string;
  gaps: string[];
  biases: string[];
  recommendations: string[];
}

export async function updateSessionStatus(
  sessionId: string,
  status: "pending" | "running" | "complete" | "error",
) {
  const { error } = await supabase
    .from("research_sessions")
    .update({ status })
    .eq("id", sessionId);

  if (error) throw new Error(`Failed to update session: ${error.message}`);
}

export async function insertSource(
  sessionId: string,
  source: ArxivSource & { source_type: string },
) {
  const { data, error } = await supabase
    .from("sources")
    .insert({
      session_id: sessionId,
      title: source.title,
      authors: source.authors.join("; "),
      abstract: source.abstract,
      url: source.url,
      source_type: source.source_type,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to insert source: ${error.message}`);
  return data;
}

export async function getSources(sessionId: string) {
  const { data, error } = await supabase
    .from("sources")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to fetch sources: ${error.message}`);
  return data;
}

export async function insertSynthesisOutput(
  sessionId: string,
  tabType: "synthesis" | "mindmap" | "matrix",
  content: SynthesisContent | MindmapContent | MatrixContent,
) {
  const { data, error } = await supabase
    .from("synthesis_outputs")
    .insert({
      session_id: sessionId,
      tab_type: tabType,
      content,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to insert synthesis (${tabType}): ${error.message}`);
  }
  return data;
}

export async function getSynthesisOutputs(sessionId: string) {
  const { data, error } = await supabase
    .from("synthesis_outputs")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch synthesis outputs: ${error.message}`);
  }
  return data;
}

export async function insertAgentLog(
  sessionId: string,
  agentName: string,
  status: string,
  summary: string | null = null,
) {
  const { data, error } = await supabase
    .from("agent_logs")
    .insert({
      session_id: sessionId,
      agent_name: agentName,
      status,
      summary,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to insert agent log: ${error.message}`);
  return data;
}

export async function updateAgentLog(
  logId: string,
  status: string,
  summary: string | null = null,
) {
  const { error } = await supabase
    .from("agent_logs")
    .update({ status, summary })
    .eq("id", logId);

  if (error) throw new Error(`Failed to update agent log: ${error.message}`);
}

export async function getAgentLogs(sessionId: string) {
  const { data, error } = await supabase
    .from("agent_logs")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to fetch agent logs: ${error.message}`);
  return data;
}
