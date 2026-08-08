// ---------------------------------------------------------------------------
// Pipeline State & SSE Client — NexusResearch AI
// ---------------------------------------------------------------------------

import { supabase } from './supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PipelineStatus = 'idle' | 'running' | 'complete' | 'error';

export interface AgentLogEntry {
  agent_name: string;
  status: 'running' | 'complete' | 'error';
  summary: string | null;
}

export interface PipelineResult {
  sessionId: string;
  status: 'complete';
  query: string;
  sources: Array<{
    id: string;
    title: string | null;
    authors: string | null;
    abstract: string | null;
    url: string | null;
    source_type: string | null;
  }>;
  synthesisOutputs: Array<{
    id: string;
    tab_type: string;
    content: unknown;
  }>;
  agentLogs: Array<{
    id: string;
    agent_name: string;
    status: string;
    summary: string | null;
  }>;
  synthesis: unknown;
  critique: unknown;
}

export interface PipelineState {
  sessionId: string | null;
  status: PipelineStatus;
  query: string;
  agentLogs: AgentLogEntry[];
  result: PipelineResult | null;
  error: string | null;
}

// ---------------------------------------------------------------------------
// SSE Event types (from edge function)
// ---------------------------------------------------------------------------

type SSEEvent =
  | { type: 'agent_start'; agent_name: string }
  | { type: 'agent_complete'; agent_name: string; summary: string }
  | { type: 'agent_error'; agent_name: string; error: string }
  | { type: 'pipeline_complete' } & Omit<PipelineResult, 'status'>
  | { type: 'pipeline_error'; error: string };

// ---------------------------------------------------------------------------
// Initial State
// ---------------------------------------------------------------------------

export const initialState: PipelineState = {
  sessionId: null,
  status: 'idle',
  query: '',
  agentLogs: [],
  result: null,
  error: null,
};

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

export type PipelineAction =
  | { type: 'START_PIPELINE'; sessionId: string; query: string }
  | { type: 'AGENT_PROGRESS'; agent: AgentLogEntry }
  | { type: 'PIPELINE_COMPLETE'; result: PipelineResult }
  | { type: 'PIPELINE_ERROR'; error: string }
  | { type: 'RESET' };

export function pipelineReducer(
  state: PipelineState,
  action: PipelineAction,
): PipelineState {
  switch (action.type) {
    case 'START_PIPELINE':
      return {
        ...initialState,
        sessionId: action.sessionId,
        query: action.query,
        status: 'running',
      };

    case 'AGENT_PROGRESS': {
      const existingIdx = state.agentLogs.findIndex(
        (a) => a.agent_name === action.agent.agent_name,
      );
      if (existingIdx >= 0) {
        const updated = [...state.agentLogs];
        updated[existingIdx] = action.agent;
        return { ...state, agentLogs: updated };
      }
      return {
        ...state,
        agentLogs: [...state.agentLogs, action.agent],
      };
    }

    case 'PIPELINE_COMPLETE':
      return {
        ...state,
        status: 'complete',
        result: action.result,
      };

    case 'PIPELINE_ERROR':
      return {
        ...state,
        status: 'error',
        error: action.error,
      };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// SSE Event Handler
// ---------------------------------------------------------------------------

function handleSSEEvent(
  event: SSEEvent,
  dispatch: (action: PipelineAction) => void,
  sessionId: string,
  query: string,
) {
  switch (event.type) {
    case 'agent_start':
      dispatch({
        type: 'AGENT_PROGRESS',
        agent: {
          agent_name: event.agent_name,
          status: 'running',
          summary: null,
        },
      });
      break;

    case 'agent_complete':
      dispatch({
        type: 'AGENT_PROGRESS',
        agent: {
          agent_name: event.agent_name,
          status: 'complete',
          summary: event.summary,
        },
      });
      break;

    case 'agent_error':
      dispatch({
        type: 'AGENT_PROGRESS',
        agent: {
          agent_name: event.agent_name,
          status: 'error',
          summary: event.error,
        },
      });
      break;

    case 'pipeline_complete':
      dispatch({
        type: 'PIPELINE_COMPLETE',
        result: {
          sessionId,
          status: 'complete',
          query,
          sources: event.sources,
          synthesisOutputs: event.synthesisOutputs,
          agentLogs: event.agentLogs,
          synthesis: event.synthesis,
          critique: event.critique,
        },
      });
      break;

    case 'pipeline_error':
      dispatch({ type: 'PIPELINE_ERROR', error: event.error });
      break;
  }
}

// ---------------------------------------------------------------------------
// SSE Stream Parser
// ---------------------------------------------------------------------------

async function parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  dispatch: (action: PipelineAction) => void,
  sessionId: string,
  query: string,
): Promise<void> {
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('data: ')) {
        const jsonStr = trimmed.slice(6);
        if (!jsonStr) continue;
        try {
          const event: SSEEvent = JSON.parse(jsonStr);
          handleSSEEvent(event, dispatch, sessionId, query);
        } catch {
          // Skip malformed JSON lines
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Run Pipeline
// ---------------------------------------------------------------------------

const EDGE_FUNCTION_URL =
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/research-pipeline`;

const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export async function runPipeline(
  query: string,
  dispatch: (action: PipelineAction) => void,
  signal?: AbortSignal,
): Promise<void> {
  const sessionId = crypto.randomUUID();

  // Insert the session row so the edge function can update it
  const { error: insertError } = await supabase
    .from('research_sessions')
    .insert({ id: sessionId, query, status: 'pending' });

  if (insertError) {
    dispatch({
      type: 'PIPELINE_ERROR',
      error: `Failed to create session: ${insertError.message}`,
    });
    return;
  }

  dispatch({ type: 'START_PIPELINE', sessionId, query });

  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({ sessionId, query }),
      signal,
    });

    if (!response.ok) {
      let errorMsg = `HTTP ${response.status}`;
      try {
        const err = await response.json();
        errorMsg = err.error || errorMsg;
      } catch { /* ignore */ }
      dispatch({ type: 'PIPELINE_ERROR', error: errorMsg });
      return;
    }

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('text/event-stream') && response.body) {
      // SSE streaming mode
      const reader = response.body.getReader();
      await parseSSEStream(reader, dispatch, sessionId, query);
    } else {
      // Synchronous JSON mode (fallback)
      const result = await response.json();

      if (result.status === 'error') {
        dispatch({
          type: 'PIPELINE_ERROR',
          error: result.error || 'Pipeline failed',
        });
        return;
      }

      // Populate agent logs from DB records
      if (result.agentLogs) {
        for (const log of result.agentLogs) {
          dispatch({
            type: 'AGENT_PROGRESS',
            agent: {
              agent_name: log.agent_name,
              status: log.status as AgentLogEntry['status'],
              summary: log.summary,
            },
          });
        }
      }

      dispatch({
        type: 'PIPELINE_COMPLETE',
        result: {
          sessionId,
          status: 'complete',
          query,
          sources: result.sources || [],
          synthesisOutputs: result.synthesisOutputs || [],
          agentLogs: result.agentLogs || [],
          synthesis: result.synthesis,
          critique: result.critique,
        },
      });
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return;
    dispatch({
      type: 'PIPELINE_ERROR',
      error: err instanceof Error ? err.message : 'An unexpected error occurred',
    });
  }
}
