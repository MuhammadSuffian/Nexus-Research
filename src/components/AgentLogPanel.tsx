import { useState } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  Brain,
} from 'lucide-react';
import type { AgentLogEntry, PipelineStatus } from '../lib/pipeline';

interface AgentLogPanelProps {
  agentLogs: AgentLogEntry[];
  status: PipelineStatus;
  error: string | null;
}

function AgentIcon() {
  // Use Lucide Brain as fallback; emoji only for the icon decoration
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
      <Brain className="h-3.5 w-3.5 text-primary" />
    </div>
  );
}

function StatusBadge({ status }: { status: AgentLogEntry['status'] }) {
  switch (status) {
    case 'running':
      return (
        <span className="flex items-center gap-1 text-xs text-primary">
          <Loader2 className="h-3 w-3 animate-spin" />
          Running
        </span>
      );
    case 'complete':
      return (
        <span className="flex items-center gap-1 text-xs text-success">
          <CheckCircle2 className="h-3 w-3" />
          Complete
        </span>
      );
    case 'error':
      return (
        <span className="flex items-center gap-1 text-xs text-destructive">
          <XCircle className="h-3 w-3" />
          Error
        </span>
      );
    default:
      return null;
  }
}

export default function AgentLogPanel({
  agentLogs,
  status,
  error,
}: AgentLogPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  const hasContent = agentLogs.length > 0 || status === 'running' || error;

  return (
    <div
      className={`
        flex flex-col border-l border-border bg-surface/50 transition-all duration-300 ease-out
        ${collapsed ? 'w-10' : 'w-72'}
      `}
    >
      {/* Toggle button */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        {!collapsed && (
          <span className="text-xs font-medium tracking-wide text-muted uppercase">
            Agent Log
          </span>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="ml-auto flex h-6 w-6 items-center justify-center rounded text-muted
                     transition-colors duration-150 hover:bg-surface-elevated hover:text-foreground
                     cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30"
          aria-label={collapsed ? 'Expand agent log' : 'Collapse agent log'}
        >
          {collapsed ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      </div>

      {!collapsed && (
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {hasContent ? (
            <ul className="divide-y divide-border/50">
              {agentLogs.map((log, idx) => (
                <li
                  key={log.agent_name}
                  className="animate-[fadeSlideIn_300ms_ease-out] px-3 py-3"
                  style={{ animationDelay: `${idx * 80}ms`, animationFillMode: 'both' }}
                >
                  <div className="flex items-start gap-2.5">
                    <AgentIcon />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-medium text-foreground">
                          {log.agent_name}
                        </span>
                        <StatusBadge status={log.status} />
                      </div>
                      {log.summary && (
                        <p className="mt-1 text-xs leading-relaxed text-muted line-clamp-3">
                          {log.summary}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
              <Brain className="h-6 w-6 text-muted/50" />
              <p className="text-xs text-muted">
                Agent progress will appear here when a pipeline is running.
              </p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="mx-3 mb-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5">
              <div className="flex items-start gap-2">
                <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                <p className="text-xs leading-relaxed text-destructive">{error}</p>
              </div>
            </div>
          )}

          {/* Idle empty state */}
          {status === 'idle' && agentLogs.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
              <Brain className="h-6 w-6 text-muted/50" />
              <p className="text-xs text-muted">
                Submit a research question to start the agent pipeline.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
