import { Card, SectionHeader } from "@/components/ui";
import { TutorChat } from "@/components/TutorChat";

export const dynamic = "force-dynamic";

export default function TutorPage() {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="AI Tutor"
        subtitle="Ask anything about TMUA or SAT — methods, strategies, and faster Desmos approaches."
      />

      {/* Info card */}
      <Card className="border-l-4 border-tmua bg-tmua/5">
        <div className="flex items-start gap-3">
          <span className="text-xl">🤖</span>
          <div className="text-sm text-ink-700">
            <strong>What this tutor does:</strong> explains mathematical methods, proof techniques,
            logic, and SAT strategies. For SAT Math it highlights faster Desmos workflows. It{" "}
            <strong>never</strong> reproduces copyrighted past-paper questions — it explains{" "}
            <em>how</em> to approach problem types, not the problems themselves.
            <span className="mt-1 block text-ink-500">
              Offline unless an AI key is set in{" "}
              <code className="rounded bg-tmua/10 px-1">.env.local</code>. Free option:{" "}
              <code className="rounded bg-tmua/10 px-1">AI_PROVIDER=gemini</code> +{" "}
              <code className="rounded bg-tmua/10 px-1">GEMINI_API_KEY</code> (free from Google AI Studio).
            </span>
          </div>
        </div>
      </Card>

      {/* Chat */}
      <Card>
        <TutorChat />
      </Card>
    </div>
  );
}
