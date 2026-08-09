import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, Bot, User, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { PipelineResult } from '../lib/pipeline';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SynthesisContent {
  summary: string;
  keyFindings: string[];
  methodology: string;
  limitations: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatTabProps {
  result: PipelineResult;
}

// ---------------------------------------------------------------------------
// Build system prompt from research context
// ---------------------------------------------------------------------------

function buildSystemPrompt(result: PipelineResult): string {
  const synthOutput = result.synthesisOutputs.find((o) => o.tab_type === 'synthesis');
  const synthesis = (synthOutput?.content ?? result.synthesis) as SynthesisContent | null;

  const sourceLines = result.sources
    .map((s, i) => `${i + 1}. ${s.title ?? 'Untitled'} — ${s.authors ?? 'Unknown'}`)
    .join('\n');

  return `You are a research assistant with deep knowledge of the following research synthesis. Answer questions about the research accurately, concisely, and helpfully. If the user asks something outside the scope of the research, politely note that and still try to help.

## Research Query
"${result.query}"

## Summary
${synthesis?.summary ?? 'Not available.'}

## Key Findings
${synthesis?.keyFindings?.map((f, i) => `${i + 1}. ${f}`).join('\n') ?? 'Not available.'}

## Methodology
${synthesis?.methodology ?? 'Not available.'}

## Limitations
${synthesis?.limitations ?? 'Not available.'}

## Source Papers
${sourceLines || 'None.'}

Answer in a clear, informative style. Use markdown for structure when helpful.`;
}

// ---------------------------------------------------------------------------
// Groq chat call (direct from frontend)
// ---------------------------------------------------------------------------


async function sendToGroq(
  messages: Message[],
  systemPrompt: string,
  signal: AbortSignal,
): Promise<string> {
  // Read key fresh each call (not at module load) so hot-reload picks up changes
  const apiKey = (import.meta.env.VITE_GROQ_API_KEY as string | undefined)?.trim();

  console.log('[Chat] API key prefix:', apiKey ? apiKey.slice(0, 10) + '...' : 'MISSING');

  if (!apiKey) {
    throw new Error(
      'VITE_GROQ_API_KEY is not set. Add it to your .env file and restart the dev server.',
    );
  }

  const body = {
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    temperature: 0.4,
    max_tokens: 1024,
  };

  console.log('[Chat] Sending request with model:', body.model);

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    let msg = `Groq API error ${response.status}`;
    try {
      const err = await response.json();
      console.error('[Chat] Full Groq error:', JSON.stringify(err, null, 2));
      msg = err.error?.message ?? err.message ?? msg;
    } catch { /* ignore */ }
    throw new Error(msg);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}

// ---------------------------------------------------------------------------
// Message bubble
// ---------------------------------------------------------------------------

function MessageBubble({ message, index }: { message: Message; index: number }) {
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
      style={{ animation: `fadeSlideIn 0.25s ${index * 0.03}s ease both`, opacity: 0, animationFillMode: 'forwards' }}
    >
      {/* Avatar */}
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${isUser ? 'bg-primary/20' : 'bg-surface-elevated border border-border'
          }`}
      >
        {isUser ? (
          <User className="h-3.5 w-3.5 text-primary" />
        ) : (
          <Bot className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${isUser
            ? 'rounded-tr-sm bg-primary/15 text-foreground'
            : 'rounded-tl-sm bg-surface border border-border text-muted-foreground'
          }`}
      >
        {isUser ? (
          // User messages — plain text
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          // Assistant messages — rendered markdown
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => <h1 className="mb-2 mt-3 text-base font-bold text-foreground first:mt-0">{children}</h1>,
              h2: ({ children }) => <h2 className="mb-1.5 mt-3 text-sm font-bold text-foreground first:mt-0">{children}</h2>,
              h3: ({ children }) => <h3 className="mb-1 mt-2.5 text-sm font-semibold text-foreground first:mt-0">{children}</h3>,
              p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
              ul: ({ children }) => <ul className="mb-2 ml-4 list-disc space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal space-y-1">{children}</ol>,
              li: ({ children }) => <li className="leading-relaxed">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
              em: ({ children }) => <em className="italic">{children}</em>,
              code: ({ children, className }) => {
                const isBlock = className?.includes('language-');
                return isBlock ? (
                  <code className="block rounded-md bg-background px-3 py-2 font-mono text-xs text-primary">{children}</code>
                ) : (
                  <code className="rounded bg-background px-1 py-0.5 font-mono text-xs text-primary">{children}</code>
                );
              },
              pre: ({ children }) => <pre className="mb-2 overflow-x-auto rounded-lg bg-background p-3">{children}</pre>,
              blockquote: ({ children }) => <blockquote className="border-l-2 border-primary/40 pl-3 italic text-muted">{children}</blockquote>,
              hr: () => <hr className="my-2 border-border" />,
            }}
          >
            {message.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Typing indicator
// ---------------------------------------------------------------------------

function TypingIndicator() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-surface-elevated">
        <Bot className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm border border-border bg-surface px-4 py-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-muted"
            style={{
              animation: `pulse 1.2s ${i * 0.2}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export default function ChatTab({ result }: ChatTabProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const systemPrompt = useRef(buildSystemPrompt(result)).current;

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: 'user', content: text };
    const updatedMessages = [...messages, userMsg];

    setMessages(updatedMessages);
    setInput('');
    setLoading(true);
    setError(null);

    // Abort any in-flight
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const reply = await sendToGroq(updatedMessages, systemPrompt, controller.signal);
      setMessages([...updatedMessages, { role: 'assistant', content: reply }]);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, systemPrompt]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const hasNoKey = !(import.meta.env.VITE_GROQ_API_KEY as string | undefined)?.trim();

  return (
    <div className="flex h-[600px] flex-col rounded-xl border border-border bg-surface overflow-hidden">
      {/* No API key banner */}
      {hasNoKey && (
        <div className="flex items-center gap-2.5 border-b border-border bg-destructive/10 px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
          <p className="text-xs text-destructive">
            Chat requires <code className="font-mono">VITE_GROQ_API_KEY</code> in your{' '}
            <code className="font-mono">.env</code> file. Get a free key at{' '}
            <a
              href="https://console.groq.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline"
            >
              console.groq.com
            </a>
            .
          </p>
        </div>
      )}

      {/* Message list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5 space-y-4">
        {/* Welcome */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 pt-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <Bot className="h-6 w-6 text-primary/60" />
            </div>
            <p className="text-sm font-medium text-foreground">Ask about this research</p>
            <p className="max-w-xs text-xs text-muted">
              I have the full synthesis, key findings, and sources loaded. Ask me anything.
            </p>
            {/* Suggested prompts */}
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {[
                'Summarize the main takeaway in one sentence.',
                'What are the biggest open problems?',
                'Which paper had the most novel contribution?',
              ].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setInput(prompt)}
                  disabled={hasNoKey}
                  className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground
                             hover:border-primary/40 hover:text-foreground transition-colors
                             disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} index={i} />
        ))}

        {loading && <TypingIndicator />}

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-2.5 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-border bg-surface-elevated px-4 py-3">
        <div className="flex items-end gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={hasNoKey ? 'Set VITE_GROQ_API_KEY to enable chat…' : 'Ask a follow-up question… (Enter to send)'}
            disabled={loading || hasNoKey}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground
                       placeholder:text-muted
                       focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20
                       disabled:cursor-not-allowed disabled:opacity-50
                       scrollbar-thin"
            style={{ maxHeight: 120, overflowY: 'auto' }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading || hasNoKey}
            id="chat-send-btn"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary
                       text-on-primary transition-all duration-200
                       hover:bg-primary-hover active:scale-95
                       disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="mt-1.5 text-[10px] text-muted">Shift+Enter for newline · Enter to send</p>
      </div>
    </div>
  );
}
