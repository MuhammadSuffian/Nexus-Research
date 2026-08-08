import { useState } from 'react';
import Header from './components/Header';
import TabNavigation, { type TabId } from './components/TabNavigation';
import AgentLogPanel from './components/AgentLogPanel';
import SynthesisTab from './components/SynthesisTab';
import MindmapTab, { type MindmapContent } from './components/MindmapTab';
import MatrixTab, { type MatrixContent } from './components/MatrixTab';
import ChatTab from './components/ChatTab';
import { usePipeline } from './hooks/usePipeline';
import type { PipelineResult } from './lib/pipeline';

// ---------------------------------------------------------------------------
// Idle / Loading placeholder
// ---------------------------------------------------------------------------

function IdlePlaceholder() {
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

// ---------------------------------------------------------------------------
// Tab content router
// ---------------------------------------------------------------------------

function TabContent({
  activeTab,
  result,
}: {
  activeTab: TabId;
  result: PipelineResult | null;
}) {
  if (!result) return <IdlePlaceholder />;

  switch (activeTab) {
    case 'synthesis':
      return <SynthesisTab result={result} />;

    case 'mindmap': {
      const mindmapOutput = result.synthesisOutputs.find((o) => o.tab_type === 'mindmap');
      const mindmapContent = mindmapOutput?.content as MindmapContent | undefined;
      if (!mindmapContent || !mindmapContent.nodes?.length) {
        return (
          <div className="flex items-center justify-center py-20 text-sm text-muted">
            No mindmap data available.
          </div>
        );
      }
      return <MindmapTab content={mindmapContent} />;
    }

    case 'matrix': {
      const matrixOutput = result.synthesisOutputs.find((o) => o.tab_type === 'matrix');
      const matrixContent = matrixOutput?.content as MatrixContent | undefined;
      if (!matrixContent || !matrixContent.rows?.length) {
        return (
          <div className="flex items-center justify-center py-20 text-sm text-muted">
            No matrix data available.
          </div>
        );
      }
      return <MatrixTab content={matrixContent} />;
    }

    case 'chat':
      return <ChatTab result={result} />;
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
              result={state.result}
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
