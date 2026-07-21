"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    Desmos?: {
      GraphingCalculator: (el: HTMLElement, opts?: Record<string, unknown>) => DesmosCalc;
    };
  }
}

interface DesmosCalc {
  setState: (state: unknown) => void;
  getState: () => unknown;
  setExpression: (e: Record<string, unknown>) => void;
  destroy: () => void;
}

const API_KEY = process.env.NEXT_PUBLIC_DESMOS_API_KEY;
const SCRIPT_ID = "desmos-api-script";

let scriptPromise: Promise<void> | null = null;

function loadDesmosScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject();
  if (window.Desmos) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (document.getElementById(SCRIPT_ID)) {
      const check = setInterval(() => {
        if (window.Desmos) {
          clearInterval(check);
          resolve();
        }
      }, 100);
      return;
    }
    const key = API_KEY || "dcb31709b452b1cf9dc26972add0fda6"; // public demo key fallback
    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    s.src = `https://www.desmos.com/api/v1.10/calculator.js?apiKey=${key}`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Desmos"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export function DesmosCalculator({
  state,
  height = 420,
  className = "",
}: {
  state?: string | null;
  height?: number;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const calcRef = useRef<DesmosCalc | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    loadDesmosScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.Desmos) return;
        const calc = window.Desmos.GraphingCalculator(containerRef.current, {
          expensesAllowed: true,
          keypad: true,
          settingsMenu: true,
          expressionsTopbar: true,
        } as Record<string, unknown>);
        calcRef.current = calc;
        if (state) {
          try {
            calc.setState(JSON.parse(state));
          } catch {
            /* ignore malformed seed state */
          }
        }
        setStatus("ready");
      })
      .catch(() => !cancelled && setStatus("error"));
    return () => {
      cancelled = true;
      calcRef.current?.destroy();
      calcRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply new seed state if it changes after mount.
  useEffect(() => {
    if (status === "ready" && calcRef.current && state) {
      try {
        calcRef.current.setState(JSON.parse(state));
      } catch {
        /* ignore */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <div className={`overflow-hidden rounded-xl border border-line ${className}`}>
      {status === "error" ? (
        <div className="flex flex-col items-center justify-center bg-surface-muted p-6 text-center" style={{ height }}>
          <p className="text-sm font-medium text-content-muted">Desmos couldn’t load.</p>
          <p className="mt-1 text-xs text-content-muted">
            Add your free key as <code className="rounded bg-surface-muted px-1">NEXT_PUBLIC_DESMOS_API_KEY</code>, or
          </p>
          <a
            href="https://www.desmos.com/calculator"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-sat mt-3"
          >
            Open desmos.com/calculator →
          </a>
        </div>
      ) : (
        <div className="relative" style={{ height }}>
          {status === "loading" && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface-muted text-sm text-content-subtle">
              Loading Desmos…
            </div>
          )}
          <div ref={containerRef} style={{ height }} className="w-full" />
        </div>
      )}
    </div>
  );
}

export function DesmosKeyNotice() {
  if (API_KEY) return null;
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
      No Desmos API key set. Using a shared demo key — add your own free key as{" "}
      <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_DESMOS_API_KEY</code> in{" "}
      <code className="rounded bg-amber-100 px-1">.env.local</code> for reliability.
    </div>
  );
}
