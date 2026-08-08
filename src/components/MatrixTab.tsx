import { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types (mirror edge function db.ts MatrixContent)
// ---------------------------------------------------------------------------

export interface MatrixContent {
  rows: string[];
  columns: string[];
  data: Record<string, Record<string, number>>;
}

interface MatrixTabProps {
  content: MatrixContent;
}

// ---------------------------------------------------------------------------
// Score → colour (0=dark, 1=bright blue-indigo)
// ---------------------------------------------------------------------------

function scoreToColor(score: number): string {
  // clamp
  const s = Math.max(0, Math.min(1, score));
  // interpolate between dark surface and primary
  const l = 0.15 + s * 0.5;
  const c = s * 0.19;
  return `oklch(${l.toFixed(2)} ${c.toFixed(3)} 260)`;
}

function scoreToText(score: number): string {
  const s = Math.max(0, Math.min(1, score));
  if (s >= 0.8) return 'oklch(0.92 0.01 260)';
  if (s >= 0.5) return 'oklch(0.8 0.05 260)';
  return 'oklch(0.55 0.02 260)';
}

// Truncate paper title for rows
function truncate(str: string, n: number) {
  return str.length > n ? str.slice(0, n - 1) + '…' : str;
}

// ---------------------------------------------------------------------------
// Score bar cell
// ---------------------------------------------------------------------------

function ScoreCell({ score }: { score: number }) {
  const s = Math.max(0, Math.min(1, score));
  const pct = Math.round(s * 100);
  const textColor = scoreToText(s);

  return (
    <div className="flex flex-col gap-1.5 px-3 py-2.5">
      {/* Bar */}
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: 'oklch(0.62 0.19 260)' }}
        />
      </div>
      {/* Number */}
      <span className="text-[11px] font-semibold tabular-nums" style={{ color: textColor }}>
        {pct}%
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sort state
// ---------------------------------------------------------------------------

type SortDir = 'asc' | 'desc' | null;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export default function MatrixTab({ content }: MatrixTabProps) {
  const { rows, columns, data } = content;
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const sortedRows = useMemo(() => {
    if (!sortCol || !sortDir) return rows;
    return [...rows].sort((a, b) => {
      const va = data[a]?.[sortCol] ?? 0;
      const vb = data[b]?.[sortCol] ?? 0;
      return sortDir === 'asc' ? va - vb : vb - va;
    });
  }, [rows, data, sortCol, sortDir]);

  function handleSort(col: string) {
    if (sortCol !== col) {
      setSortCol(col);
      setSortDir('desc');
    } else if (sortDir === 'desc') {
      setSortDir('asc');
    } else {
      setSortCol(null);
      setSortDir(null);
    }
  }

  function SortIcon({ col }: { col: string }) {
    if (sortCol !== col) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    if (sortDir === 'desc') return <ArrowDown className="h-3 w-3 text-primary" />;
    return <ArrowUp className="h-3 w-3 text-primary" />;
  }

  if (!rows || rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted">
        No matrix data available.
      </div>
    );
  }

  // Column average scores
  const colAverages = columns.reduce<Record<string, number>>((acc, col) => {
    const vals = rows.map((r) => data[r]?.[col] ?? 0);
    acc[col] = vals.reduce((s, v) => s + v, 0) / (vals.length || 1);
    return acc;
  }, {});

  return (
    <div className="space-y-4" style={{ animation: 'fadeSlideIn 0.35s ease both' }}>
      {/* Info bar */}
      <div className="flex items-center gap-2 text-xs text-muted">
        <span>{rows.length} papers</span>
        <span className="text-border">·</span>
        <span>{columns.length} dimensions</span>
        <span className="text-border">·</span>
        <span>Click a column header to sort</span>
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-xl border border-border">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-elevated">
              {/* Paper column */}
              <th className="sticky left-0 z-10 min-w-[200px] bg-surface-elevated px-4 py-3 text-left text-xs font-semibold text-muted">
                Paper
              </th>
              {columns.map((col) => (
                <th
                  key={col}
                  className="min-w-[120px] px-3 py-3 text-left"
                >
                  <button
                    onClick={() => handleSort(col)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-foreground transition-colors"
                  >
                    {col}
                    <SortIcon col={col} />
                  </button>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {sortedRows.map((row, ri) => (
              <tr
                key={row}
                className="border-b border-border last:border-0 hover:bg-surface-elevated/50 transition-colors"
                style={{ animation: `fadeSlideIn ${0.1 + ri * 0.04}s ease both` }}
              >
                {/* Sticky paper name */}
                <td className="sticky left-0 z-10 bg-surface px-4 py-2 hover:bg-surface-elevated/50">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-foreground leading-snug">
                      {truncate(row, 40)}
                    </span>
                    {/* Row average badge */}
                    <span className="mt-1 text-[10px] text-muted tabular-nums">
                      avg{' '}
                      {Math.round(
                        (Object.values(data[row] ?? {}).reduce((s, v) => s + v, 0) /
                          (columns.length || 1)) *
                          100,
                      )}
                      %
                    </span>
                  </div>
                </td>

                {columns.map((col) => {
                  const score = data[row]?.[col] ?? 0;
                  return (
                    <td
                      key={col}
                      className="transition-colors"
                      style={{ backgroundColor: scoreToColor(score) + '33' }}
                    >
                      <ScoreCell score={score} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>

          {/* Averages footer */}
          <tfoot>
            <tr className="border-t border-border-strong bg-surface-elevated">
              <td className="sticky left-0 z-10 bg-surface-elevated px-4 py-2.5 text-xs font-semibold text-muted">
                Column avg
              </td>
              {columns.map((col) => (
                <td key={col}>
                  <ScoreCell score={colAverages[col]} />
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Colour scale legend */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] text-muted">Score scale:</span>
        <div className="flex h-3 w-40 overflow-hidden rounded-full border border-border">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="flex-1"
              style={{ backgroundColor: scoreToColor(i / 19) }}
            />
          ))}
        </div>
        <span className="text-[10px] text-muted">0% → 100%</span>
      </div>
    </div>
  );
}
