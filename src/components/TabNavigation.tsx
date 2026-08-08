import {
  FileText,
  GitBranch,
  Table,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';
import type { PipelineStatus } from '../lib/pipeline';

export type TabId = 'synthesis' | 'mindmap' | 'matrix' | 'chat';

interface Tab {
  id: TabId;
  label: string;
  icon: LucideIcon;
}

const TABS: Tab[] = [
  { id: 'synthesis', label: 'Executive Synthesis', icon: FileText },
  { id: 'mindmap', label: 'Mindmap', icon: GitBranch },
  { id: 'matrix', label: 'Matrix Comparison', icon: Table },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
];

interface TabNavigationProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  pipelineStatus: PipelineStatus;
}

export default function TabNavigation({
  activeTab,
  onTabChange,
  pipelineStatus,
}: TabNavigationProps) {
  const isDisabled = pipelineStatus !== 'complete';

  return (
    <nav
      className="border-b border-border bg-surface/40"
      role="tablist"
      aria-label="Research results"
    >
      <div className="mx-auto flex max-w-7xl px-6">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-disabled={isDisabled}
              disabled={isDisabled}
              onClick={() => onTabChange(tab.id)}
              className={`
                group relative flex items-center gap-2 px-5 py-3 text-sm font-medium
                transition-all duration-200 ease-out
                focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/30
                ${
                  isActive
                    ? 'text-primary'
                    : 'text-muted hover:text-muted-foreground'
                }
                ${isDisabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}
              `}
            >
              <Icon
                className={`h-4 w-4 transition-colors duration-200 ${
                  isActive ? 'text-primary' : 'text-muted group-hover:text-muted-foreground'
                }`}
              />
              <span className="hidden sm:inline">{tab.label}</span>
              {/* Active indicator */}
              {isActive && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-t-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
