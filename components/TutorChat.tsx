"use client";

import { useState, useRef, useEffect } from "react";
import { Markdown } from "@/components/Markdown";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const QUICK_PROMPTS = [
  "Explain necessary vs sufficient conditions",
  "Faster Desmos approach for systems of equations",
  "How do I find stationary points of a curve?",
  "What is the contrapositive of a statement?",
  "Best Desmos technique for SAT quadratics",
  "How to use proof by contradiction?",
];

export function TutorChat({ exam }: { exam?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, exam }),
      });
      const data = (await res.json()) as { ok: boolean; reply: string; offline?: boolean };
      if (data.offline) setOffline(true);
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: err instanceof Error ? err.message : "Something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Offline banner */}
      {offline && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Tutor offline.</strong> For a free tutor, set{" "}
          <code className="rounded bg-amber-100 px-1 py-0.5">AI_PROVIDER=gemini</code> and{" "}
          <code className="rounded bg-amber-100 px-1 py-0.5">GEMINI_API_KEY</code> (free key from
          Google AI Studio) in{" "}
          <code className="rounded bg-amber-100 px-1 py-0.5">.env.local</code>, then restart the dev
          server to enable AI responses.
        </div>
      )}

      {/* Quick-prompt chips (visible before first message) */}
      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => send(p)}
              disabled={loading}
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-content-muted transition-colors hover:border-tmua hover:text-tmua disabled:opacity-50"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Message list */}
      <div className="flex min-h-[200px] flex-col gap-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.role === "user"
                  ? "rounded-br-sm bg-tmua text-white"
                  : "rounded-bl-sm border border-line bg-surface text-content shadow-sm"
              }`}
            >
              {msg.role === "assistant" ? (
                <Markdown>{msg.content}</Markdown>
              ) : (
                <span className="whitespace-pre-wrap">{msg.content}</span>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm border border-line bg-surface px-4 py-2.5 text-sm text-content-subtle shadow-sm">
              <span className="animate-pulse">Thinking…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="flex gap-2 rounded-xl border border-line bg-surface p-2 transition-colors focus-within:border-tmua">
        <textarea
          className="flex-1 resize-none border-0 bg-transparent px-1 text-sm outline-none placeholder:text-content-subtle"
          rows={2}
          placeholder="Ask anything about TMUA or SAT… (Enter to send, Shift+Enter for new line)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button
          onClick={() => send(input)}
          disabled={loading || !input.trim()}
          className="btn-tmua self-end px-4 py-1.5 text-sm disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  );
}
