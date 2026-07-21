"use client";

import { Markdown } from "@/components/Markdown";

/**
 * The reference sheet shown on every digital SAT Math question.
 *
 * Content mirrors the formulas and facts the real on-screen sheet provides.
 * Knowing what is NOT here matters as much as what is — the sheet gives no
 * quadratic formula, no slope formula, no trig identities beyond the special
 * triangles, and no exponent rules.
 */

const FORMULA_GROUPS: { title: string; items: string[] }[] = [
  {
    title: "Circle",
    items: ["A = \\pi r^2", "C = 2\\pi r"],
  },
  {
    title: "Rectangle & triangle",
    items: ["A = \\ell w", "A = \\tfrac{1}{2} b h"],
  },
  {
    title: "Right triangle",
    items: ["c^2 = a^2 + b^2"],
  },
  {
    title: "Special right triangles",
    items: ["30^\\circ\\!-\\!60^\\circ\\!-\\!90^\\circ:\\ x,\\ x\\sqrt{3},\\ 2x", "45^\\circ\\!-\\!45^\\circ\\!-\\!90^\\circ:\\ s,\\ s,\\ s\\sqrt{2}"],
  },
  {
    title: "Volume",
    items: [
      "V = \\ell w h",
      "V = \\pi r^2 h",
      "V = \\tfrac{4}{3}\\pi r^3",
      "V = \\tfrac{1}{3}\\pi r^2 h",
      "V = \\tfrac{1}{3} \\ell w h",
    ],
  },
];

const FACTS = [
  "The number of degrees of arc in a circle is $360$.",
  "The number of radians of arc in a circle is $2\\pi$.",
  "The sum of the measures in degrees of the angles of a triangle is $180$.",
];

export function ReferenceSheet({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Reference sheet"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-lift"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-ink-900">Reference</h2>
          <button
            onClick={onClose}
            className="btn-ghost text-sm"
            aria-label="Close reference sheet"
          >
            Close ✕
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {FORMULA_GROUPS.map((g) => (
            <div key={g.title} className="rounded-xl border border-ink-100 bg-ink-50/40 p-3">
              <div className="mb-2 text-[11px] font-extrabold uppercase tracking-widest text-ink-400">
                {g.title}
              </div>
              <div className="space-y-1.5">
                {g.items.map((f, i) => (
                  <Markdown key={i} className="text-sm">{`$${f}$`}</Markdown>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-1.5 rounded-xl border border-ink-100 p-3">
          {FACTS.map((f, i) => (
            <Markdown key={i} className="text-sm text-ink-600">
              {f}
            </Markdown>
          ))}
        </div>

        <p className="mt-4 text-xs leading-relaxed text-ink-400">
          Note what the real sheet does <strong>not</strong> give you: no quadratic formula, no
          slope formula, no exponent rules, no trigonometric identities beyond the special
          triangles. Those have to be known.
        </p>
      </div>
    </div>
  );
}
