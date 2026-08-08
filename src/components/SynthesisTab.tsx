import { useState } from 'react';
import {
  FileText,
  Lightbulb,
  FlaskConical,
  AlertTriangle,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  BookOpen,
  Target,
  TrendingUp,
} from 'lucide-react';
import type { PipelineResult } from '../lib/pipeline';

// ---------------------------------------------------------------------------
// Types (mirror edge function db.ts shapes)
// ---------------------------------------------------------------------------

interface SynthesisContent {
  summary: string;
  keyFindings: string[];
  methodology: string;
  limitations: string;
}

interface CritiqueResult {
  summary: string;
  gaps: string[];
  biases: string[];
  recommendations: string[];
}

interface Source {
  id: string;
  title: string | null;
  authors: string | null;
  abstract: string | null;
  url: string | null;
  source_type: string | null;
}

interface SynthesisTabProps {
  result: PipelineResult;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionCard({
  icon: Icon,
  title,
  accent,
  children,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl border border-border bg-surface p-5"
      style={{ animation: 'fadeSlideIn 0.35s ease both' }}
    >
      <div className="mb-4 flex items-center gap-2.5">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: accent + '22' }}
        >
          <Icon className="h-4 w-4" style={{ color: accent }} />
        </div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span
      className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium"
      style={{ backgroundColor: color + '18', color }}
    >
      {text}
    </span>
  );
}

function CollapsibleList({
  items,
  color,
  emptyText,
}: {
  items: string[];
  color: string;
  emptyText: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, 3);
  if (items.length === 0)
    return <p className="text-xs text-muted italic">{emptyText}</p>;
  return (
    <div className="space-y-2">
      {visible.map((item, i) => (
        <div key={i} className="flex gap-2.5">
          <span
            className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
            style={{ backgroundColor: color + '22', color }}
          >
            {i + 1}
          </span>
          <p className="text-xs leading-relaxed text-muted-foreground">{item}</p>
        </div>
      ))}
      {items.length > 3 && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-1 flex items-center gap-1 text-xs text-primary hover:text-primary-hover transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" /> Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" /> +{items.length - 3} more
            </>
          )}
        </button>
      )}
    </div>
  );
}

function SourcesList({ sources }: { sources: Source[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-surface">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-3.5 text-sm font-semibold text-foreground hover:bg-surface-elevated transition-colors rounded-xl"
      >
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-4 w-4 text-primary" />
          <span>Sources ({sources.length} papers)</span>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted" />
        )}
      </button>
      {open && (
        <div className="border-t border-border px-5 pb-4 pt-3 space-y-3">
          {sources.map((s, i) => (
            <div key={s.id} className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">
                {i + 1}
              </span>
              <div className="min-w-0">
                <div className="flex items-start gap-1.5">
                  <p className="text-xs font-medium text-foreground leading-snug">
                    {s.title ?? 'Untitled'}
                  </p>
                  {s.url && (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 shrink-0 text-primary hover:text-primary-hover transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                {s.authors && (
                  <p className="mt-0.5 text-[11px] text-muted truncate">{s.authors}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export default function SynthesisTab({ result }: SynthesisTabProps) {
  const synthOutput = result.synthesisOutputs.find((o) => o.tab_type === 'synthesis');
  const synthesis = (synthOutput?.content ?? result.synthesis) as SynthesisContent | null;
  const critique = result.critique as CritiqueResult | null;

  const accentBlue = 'oklch(0.62 0.19 260)';
  const accentGreen = 'oklch(0.6 0.18 155)';
  const accentAmber = 'oklch(0.65 0.16 80)';
  const accentRed = 'oklch(0.6 0.2 25)';
  const accentPurple = 'oklch(0.62 0.19 300)';

  if (!synthesis) {
    return (
      <div className="py-20 text-center text-sm text-muted">
        No synthesis data available.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary */}
      <SectionCard icon={FileText} title="Executive Summary" accent={accentBlue}>
        <div className="space-y-3">
          {synthesis.summary.split(/\n\n+/).map((para, i) => (
            <p key={i} className="text-sm leading-relaxed text-muted-foreground">
              {para.trim()}
            </p>
          ))}
        </div>
      </SectionCard>

      {/* Key Findings */}
      {synthesis.keyFindings?.length > 0 && (
        <SectionCard icon={Lightbulb} title="Key Findings" accent={accentGreen}>
          <CollapsibleList
            items={synthesis.keyFindings}
            color={accentGreen}
            emptyText="No findings listed."
          />
        </SectionCard>
      )}

      {/* Two-col: Methodology + Limitations */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {synthesis.methodology && (
          <SectionCard icon={FlaskConical} title="Methodology" accent={accentPurple}>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {synthesis.methodology}
            </p>
          </SectionCard>
        )}
        {synthesis.limitations && (
          <SectionCard icon={AlertTriangle} title="Limitations" accent={accentAmber}>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {synthesis.limitations}
            </p>
          </SectionCard>
        )}
      </div>

      {/* Critique */}
      {critique && (
        <>
          <div
            className="flex items-center gap-2 pt-1"
          >
            <ShieldAlert className="h-4 w-4 text-muted" />
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">
              Critical Review
            </h2>
          </div>

          {critique.summary && (
            <div className="rounded-xl border border-border bg-surface p-5" style={{ animation: 'fadeSlideIn 0.4s ease both' }}>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {critique.summary}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {/* Gaps */}
            <SectionCard icon={Target} title="Research Gaps" accent={accentRed}>
              <CollapsibleList
                items={critique.gaps ?? []}
                color={accentRed}
                emptyText="No gaps identified."
              />
            </SectionCard>

            {/* Biases */}
            <SectionCard icon={ShieldAlert} title="Potential Biases" accent={accentAmber}>
              <CollapsibleList
                items={critique.biases ?? []}
                color={accentAmber}
                emptyText="No biases identified."
              />
            </SectionCard>

            {/* Recommendations */}
            <SectionCard icon={TrendingUp} title="Recommendations" accent={accentGreen}>
              <CollapsibleList
                items={critique.recommendations ?? []}
                color={accentGreen}
                emptyText="No recommendations."
              />
            </SectionCard>
          </div>
        </>
      )}

      {/* Tags from any source */}
      {result.sources.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {Array.from(
            new Set(
              result.sources
                .flatMap((s) => (s.source_type ? [s.source_type] : []))
            )
          ).map((tag) => (
            <Badge key={tag} text={tag} color={accentBlue} />
          ))}
        </div>
      )}

      {/* Sources */}
      {result.sources.length > 0 && <SourcesList sources={result.sources} />}
    </div>
  );
}
