import { useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Types (mirror edge function db.ts MindmapContent)
// ---------------------------------------------------------------------------

interface MindmapNode {
  id: string;
  label: string;
  group: 'core' | 'paper' | 'concept' | 'finding' | string;
}

interface MindmapEdge {
  from: string;
  to: string;
}

export interface MindmapContent {
  nodes: MindmapNode[];
  edges: MindmapEdge[];
}

interface MindmapTabProps {
  content: MindmapContent;
}

// ---------------------------------------------------------------------------
// Layout — radial positioning by group
// ---------------------------------------------------------------------------

const GROUP_CONFIG: Record<string, { color: string; bg: string; radius: number; ring: number }> = {
  core:    { color: 'oklch(0.75 0.2  80)',  bg: 'oklch(0.2 0.05 80)',  radius: 0,   ring: 0 },
  paper:   { color: 'oklch(0.62 0.19 260)', bg: 'oklch(0.18 0.04 260)', radius: 230, ring: 1 },
  concept: { color: 'oklch(0.62 0.19 300)', bg: 'oklch(0.18 0.04 300)', radius: 145, ring: 2 },
  finding: { color: 'oklch(0.6  0.18 155)', bg: 'oklch(0.18 0.04 155)', radius: 155, ring: 3 },
};

function getGroupConfig(group: string) {
  return (
    GROUP_CONFIG[group] ?? {
      color: 'oklch(0.55 0.02 260)',
      bg: 'oklch(0.2 0.01 260)',
      radius: 190,
      ring: 4,
    }
  );
}

function buildLayout(
  nodes: MindmapNode[],
  cx: number,
  cy: number,
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const byGroup = new Map<string, MindmapNode[]>();

  for (const n of nodes) {
    const g = n.group ?? 'concept';
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g)!.push(n);
  }

  for (const [group, groupNodes] of byGroup.entries()) {
    const cfg = getGroupConfig(group);
    if (cfg.radius === 0) {
      // Core — center
      for (const n of groupNodes) {
        positions.set(n.id, { x: cx, y: cy });
      }
    } else {
      const total = groupNodes.length;
      groupNodes.forEach((n, i) => {
        // Offset angle per ring to avoid overlap
        const offset = (cfg.ring ?? 0) * 0.3;
        const angle = (2 * Math.PI * i) / total - Math.PI / 2 + offset;
        positions.set(n.id, {
          x: cx + cfg.radius * Math.cos(angle),
          y: cy + cfg.radius * Math.sin(angle),
        });
      });
    }
  }

  return positions;
}

// ---------------------------------------------------------------------------
// Node radius by group
// ---------------------------------------------------------------------------

function nodeRadius(group: string) {
  if (group === 'core') return 38;
  if (group === 'paper') return 28;
  return 22;
}

// ---------------------------------------------------------------------------
// Truncate label for SVG
// ---------------------------------------------------------------------------

function truncateLabel(label: string, maxLen = 18) {
  return label.length > maxLen ? label.slice(0, maxLen - 1) + '…' : label;
}

// ---------------------------------------------------------------------------
// Wrap label into lines (SVG tspan)
// ---------------------------------------------------------------------------

function wrapLabel(label: string, maxChars: number): string[] {
  const words = label.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxChars) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = (current + ' ' + word).trim();
    }
  }
  if (current) lines.push(current.trim());
  return lines.slice(0, 3);
}

// ---------------------------------------------------------------------------
// Legend
// ---------------------------------------------------------------------------

function Legend() {
  const items = [
    { group: 'core',    label: 'Core Query' },
    { group: 'paper',   label: 'Paper' },
    { group: 'concept', label: 'Concept' },
    { group: 'finding', label: 'Finding' },
  ];
  return (
    <div className="absolute bottom-4 left-4 flex flex-col gap-1.5 rounded-lg border border-border bg-surface/90 px-3 py-2.5 backdrop-blur-sm">
      {items.map(({ group, label }) => {
        const cfg = getGroupConfig(group);
        return (
          <div key={group} className="flex items-center gap-2">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: cfg.color }}
            />
            <span className="text-[10px] text-muted">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export default function MindmapTab({ content }: MindmapTabProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 800, h: 560 });
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string } | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);

  // Observe container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setDims({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setDims({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const { nodes, edges } = content;
  const cx = dims.w / 2;
  const cy = dims.h / 2;
  const positions = buildLayout(nodes, cx, cy);

  // Pan handlers
  function onMouseDown(e: React.MouseEvent) {
    setDragging(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!dragging || !dragStart.current) return;
    setPan({
      x: dragStart.current.px + e.clientX - dragStart.current.mx,
      y: dragStart.current.py + e.clientY - dragStart.current.my,
    });
  }
  function onMouseUp() {
    setDragging(false);
    dragStart.current = null;
  }

  if (!nodes || nodes.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted">
        No mindmap data available.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-xl border border-border bg-surface"
      style={{ height: 560, cursor: dragging ? 'grabbing' : 'grab' }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      <svg
        width={dims.w}
        height={dims.h}
        style={{ position: 'absolute', inset: 0 }}
      >
        <defs>
          {/* Glow filter per group */}
          {Object.keys(GROUP_CONFIG).map((group) => (
            <filter key={group} id={`glow-${group}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}
        </defs>

        <g transform={`translate(${pan.x},${pan.y})`}>
          {/* Edges */}
          {edges.map((edge, i) => {
            const from = positions.get(edge.from);
            const to = positions.get(edge.to);
            if (!from || !to) return null;
            return (
              <line
                key={i}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="oklch(0.3 0.02 260)"
                strokeWidth={1.5}
                strokeOpacity={0.6}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const pos = positions.get(node.id);
            if (!pos) return null;
            const cfg = getGroupConfig(node.group);
            const r = nodeRadius(node.group);
            const lines = wrapLabel(node.label, node.group === 'core' ? 12 : 10);
            const lineHeight = 12;
            const totalHeight = lines.length * lineHeight;
            const startY = pos.y - totalHeight / 2 + lineHeight / 2;

            return (
              <g
                key={node.id}
                style={{ cursor: 'default' }}
                onMouseEnter={(e) =>
                  setTooltip({
                    x: e.clientX,
                    y: e.clientY,
                    label: node.label,
                  })
                }
                onMouseLeave={() => setTooltip(null)}
              >
                {/* Outer glow ring */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={r + 5}
                  fill={cfg.color}
                  opacity={0.08}
                />
                {/* Main circle */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={r}
                  fill={cfg.bg}
                  stroke={cfg.color}
                  strokeWidth={node.group === 'core' ? 2.5 : 1.5}
                  filter={node.group === 'core' ? 'url(#glow-core)' : undefined}
                />
                {/* Label */}
                <text
                  x={pos.x}
                  y={startY}
                  textAnchor="middle"
                  fontSize={node.group === 'core' ? 10 : 8.5}
                  fontWeight={node.group === 'core' ? 700 : 500}
                  fill={cfg.color}
                  pointerEvents="none"
                >
                  {lines.map((line, li) => (
                    <tspan key={li} x={pos.x} dy={li === 0 ? 0 : lineHeight}>
                      {truncateLabel(line, node.group === 'core' ? 14 : 11)}
                    </tspan>
                  ))}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 rounded-lg border border-border bg-surface-elevated px-3 py-1.5 text-xs text-foreground shadow-lg"
          style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
        >
          {tooltip.label}
        </div>
      )}

      <Legend />

      {/* Drag hint */}
      <div className="absolute right-4 top-4 rounded-md bg-surface/70 px-2.5 py-1 text-[10px] text-muted backdrop-blur-sm">
        Drag to pan
      </div>
    </div>
  );
}
