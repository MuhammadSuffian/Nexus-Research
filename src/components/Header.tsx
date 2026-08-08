import { useState, type FormEvent } from 'react';
import { Search, Loader2, Beaker } from 'lucide-react';
import type { PipelineStatus } from '../lib/pipeline';

interface HeaderProps {
  onSubmit: (query: string) => void;
  status: PipelineStatus;
}

export default function Header({ onSubmit, status }: HeaderProps) {
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const isRunning = status === 'running';

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();

    if (!trimmed) {
      setError('Please enter a research question.');
      return;
    }

    if (trimmed.length < 10) {
      setError('Please enter a more detailed research question (at least 10 characters).');
      return;
    }

    setError('');
    onSubmit(trimmed);
  };

  const handleChange = (value: string) => {
    setQuery(value);
    if (error) setError('');
  };

  return (
    <header className="w-full border-b border-border bg-surface/60 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-4">
        {/* Logo */}
        <div className="flex shrink-0 items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15">
            <Beaker className="h-5 w-5 text-primary" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-foreground">
            NexusResearch
          </span>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSubmit} className="flex flex-1 items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="Enter a research question..."
              disabled={isRunning}
              className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm
                         text-foreground placeholder:text-muted
                         transition-colors duration-200
                         focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20
                         disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={isRunning}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm
                       font-medium text-on-primary
                       transition-all duration-200 ease-out
                       hover:bg-primary-hover
                       active:scale-[0.97]
                       disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Researching…
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Research
              </>
            )}
          </button>
        </form>
      </div>

      {/* Inline error */}
      {error && (
        <div className="mx-auto max-w-7xl px-6 pb-3">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}
    </header>
  );
}
