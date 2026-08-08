import { useReducer, useCallback, useRef } from 'react';
import {
  pipelineReducer,
  runPipeline,
  initialState,
  type PipelineState,
} from '../lib/pipeline';

export function usePipeline() {
  const [state, dispatch] = useReducer(pipelineReducer, initialState);
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback((query: string) => {
    // Abort any in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;
    runPipeline(query, dispatch, controller.signal);
  }, []);

  const reset = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    dispatch({ type: 'RESET' });
  }, []);

  return { state, start, reset } as const;
}

export type { PipelineState };
