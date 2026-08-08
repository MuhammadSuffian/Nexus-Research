import { useState } from 'react';
import Header from './components/Header';
import TabNavigation, { type TabId } from './components/TabNavigation';
import AgentLogPanel from './components/AgentLogPanel';
import { usePipeline } from './hooks/usePipeline';
import { FileText, GitBranch, Table, MessageSquare } from 'lucide-react';

// ---------------------------------------------------------------------------
// Placeholder tab content (to be replaced in subsequent tasks)
// ---------------------------------------------------------------------------

function EmptyTab({ icon: Icon, title, description }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
        <Icon className="h-7 w-7 text-primary/60" />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-sm text-xs text-muted">{description}</p>
    </div>
  );
}

function TabContent({ activeTab, pipelineComplete }: {
  activeTab: TabId;
  pipelineComplete: boolean;
}) {
  if (!pipelineComplete) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-32 text-center">
        <div className="relative">
          <div className="h-12 w-12 animate-pulse rounded-full bg-primary/10" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </div>
        <p className="text-sm text-muted">
          Submit a research question to see results here.
        </p>
      </div>
    );
  }

  switch (activeTab) {
    case 'synthesis':
      return (
        <EmptyTab
          icon={FileText}
          title="Executive Synthesis"
          description="The structured research synthesis will appear here once the pipeline completes."
        />
      );
    case 'mindmap':
      return (
        <EmptyTab
          icon={GitBranch}
          title="Mindmap"
          description="The interactive argument tree will be rendered here."
        />
      );
    case 'matrix':
      return (
        <EmptyTab
          icon={Table}
          title="Matrix Comparison"
          description="The comparison matrix will be displayed here."
        />
      );
    case 'chat':
      return (
        <EmptyTab
          icon={MessageSquare}
          title="Chat Workspace"
          description="Ask follow-up questions about the research here."
        />
      );
  }
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export default function App() {
  const { state, start, reset } = usePipeline();
  const [activeTab, setActiveTab] = useState<TabId>('synthesis');

  const handleSubmit = (query: string) => {
    reset();
    setActiveTab('synthesis');
    start(query);
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header with search */}
      <Header onSubmit={handleSubmit} status={state.status} />

      {/* Tab Navigation */}
      <TabNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pipelineStatus={state.status}
      />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Tab content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="mx-auto max-w-4xl px-6 py-6">
            <TabContent
              activeTab={activeTab}
              pipelineComplete={state.status === 'complete'}
            />
          </div>
        </main>

        {/* Agent Log sidebar */}
        <AgentLogPanel
          agentLogs={state.agentLogs}
          status={state.status}
          error={state.error}
        />
      </div>
    </div>
  );
}
