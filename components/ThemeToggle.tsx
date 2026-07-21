"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "examforge-theme";

/**
 * Applied before paint by the inline script in app/layout.tsx, and again here
 * whenever the choice changes. Keeping the logic identical in both places is
 * what stops the toggle disagreeing with the pre-paint pass.
 */
function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored === "light" || stored === "dark" || stored === "system") setTheme(stored);
    setMounted(true);
  }, []);

  const choose = (next: Theme) => {
    setTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
    apply(next);
  };

  const options: { value: Theme; label: string; icon: string }[] = [
    { value: "light", label: "Light", icon: "☀" },
    { value: "system", label: "System", icon: "◐" },
    { value: "dark", label: "Dark", icon: "☾" },
  ];

  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-lg border p-0.5"
      style={{ borderColor: "rgb(var(--line))" }}
      role="radiogroup"
      aria-label="Colour theme"
    >
      {options.map((o) => {
        // Before mount we cannot know the stored choice, so nothing is marked
        // selected — rendering a guess causes a hydration mismatch.
        const active = mounted && theme === o.value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={active}
            aria-label={o.label}
            title={o.label}
            onClick={() => choose(o.value)}
            className="rounded px-2 py-1 text-xs transition-colors"
            style={
              active
                ? { backgroundColor: "rgb(var(--content))", color: "rgb(var(--surface))" }
                : { color: "rgb(var(--content-subtle))" }
            }
          >
            <span aria-hidden>{o.icon}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Runs before first paint to avoid a flash of the wrong theme. Inlined in the
 * document head, so it must not reference anything outside itself.
 */
export const THEME_INIT_SCRIPT = `
(function(){
  try {
    var t = localStorage.getItem('${STORAGE_KEY}');
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
  } catch (e) {}
})();
`;
