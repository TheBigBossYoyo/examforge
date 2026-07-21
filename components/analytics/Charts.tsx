"use client";

/**
 * Recharts wrappers for the analytics dashboard.
 * All charts are wrapped in ResponsiveContainer with fixed heights.
 * Brand colours: TMUA #6d5dfc, SAT #0ea5a4.
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
  ReferenceLine,
} from "recharts";
import type {
  AccuracyByTopic,
  AccuracyByDifficulty,
  ImprovementPoint,
  ConfidenceBucket,
  ErrorTypeCount,
  TimeVsPace,
} from "@/lib/analytics";

/* ------------------------------------------------------------------ */
/* Colour palette                                                        */
/* ------------------------------------------------------------------ */

const TMUA_COLOR = "#6d5dfc";
const SAT_COLOR = "#0ea5a4";
const OVER_COLOR = "#f87171"; // red-400
const UNDER_COLOR = "#34d399"; // emerald-400
const DIFF_COLORS: Record<string, string> = {
  easy: "#34d399",
  med: "#fbbf24",
  hard: "#f87171",
  "1600level": "#a78bfa",
  real: "#60a5fa",
  unknown: "#94a3b8",
};
const CONF_COLORS: Record<string, string> = {
  guessed: "#f87171",
  unsure: "#fbbf24",
  confident: "#34d399",
};
const PIE_PALETTE = [
  "#6d5dfc",
  "#0ea5a4",
  "#f87171",
  "#fbbf24",
  "#34d399",
  "#a78bfa",
  "#60a5fa",
  "#fb923c",
];

/* ------------------------------------------------------------------ */
/* Shared tooltip style                                                  */
/* ------------------------------------------------------------------ */

const tooltipStyle = {
  contentStyle: {
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    fontSize: "12px",
    padding: "8px 12px",
  },
};

/* ------------------------------------------------------------------ */
/* 1. Accuracy by Topic — horizontal BarChart                           */
/* ------------------------------------------------------------------ */

export function AccuracyByTopicChart({
  data,
  color = TMUA_COLOR,
}: {
  data: AccuracyByTopic[];
  color?: string;
}) {
  if (data.length === 0) return null;

  const chartData = data.map((d) => ({
    label: d.subtopic.length > 22 ? d.subtopic.slice(0, 20) + "…" : d.subtopic,
    accuracy: Math.round(d.accuracy * 100),
    fullLabel: `${d.area} — ${d.subtopic}`,
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 32)}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
        <XAxis
          type="number"
          domain={[0, 100]}
          tickFormatter={(v: number) => `${v}%`}
          tick={{ fontSize: 11, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={140}
          tick={{ fontSize: 11, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value: number) => [`${value}%`, "Accuracy"]}
          labelFormatter={(label: string, payload) =>
            payload?.[0]
              ? (payload[0].payload as { fullLabel: string }).fullLabel
              : label
          }
          {...tooltipStyle}
        />
        <ReferenceLine x={80} stroke="#e2e8f0" strokeDasharray="4 2" label={{ value: "Target 80%", fontSize: 10, fill: "#94a3b8" }} />
        <Bar dataKey="accuracy" fill={color} radius={[0, 4, 4, 0]} maxBarSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Accuracy by Difficulty — BarChart                                 */
/* ------------------------------------------------------------------ */

export function AccuracyByDifficultyChart({ data }: { data: AccuracyByDifficulty[] }) {
  if (data.length === 0) return null;

  const chartData = data.map((d) => ({
    difficulty: d.difficulty,
    accuracy: Math.round(d.accuracy * 100),
    total: d.total,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis
          dataKey="difficulty"
          tick={{ fontSize: 11, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: string) => v.charAt(0).toUpperCase() + v.slice(1)}
        />
        <YAxis
          domain={[0, 100]}
          tickFormatter={(v: number) => `${v}%`}
          tick={{ fontSize: 11, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value: number, name: string) => [`${value}%`, name === "accuracy" ? "Accuracy" : name]}
          {...tooltipStyle}
        />
        <ReferenceLine y={80} stroke="#e2e8f0" strokeDasharray="4 2" />
        <Bar dataKey="accuracy" radius={[4, 4, 0, 0]} maxBarSize={48}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={DIFF_COLORS[entry.difficulty] ?? "#94a3b8"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Improvement over time — LineChart                                  */
/* ------------------------------------------------------------------ */

export function ImprovementChart({
  data,
  color = TMUA_COLOR,
  yLabel = "Score",
  yDomain,
}: {
  data: ImprovementPoint[];
  color?: string;
  yLabel?: string;
  yDomain?: [number, number];
}) {
  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={yDomain}
          tick={{ fontSize: 11, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
          label={{ value: yLabel, angle: -90, position: "insideLeft", fontSize: 10, fill: "#94a3b8" }}
        />
        <Tooltip {...tooltipStyle} />
        <Line
          type="monotone"
          dataKey="scaled_score"
          stroke={color}
          strokeWidth={2.5}
          dot={{ fill: color, r: 4 }}
          activeDot={{ r: 6 }}
          name="Score"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Confidence calibration — BarChart                                 */
/* ------------------------------------------------------------------ */

export function ConfidenceCalibrationChart({ data }: { data: ConfidenceBucket[] }) {
  if (data.length === 0) return null;

  const chartData = data.map((d) => ({
    confidence: d.confidence.charAt(0).toUpperCase() + d.confidence.slice(1),
    accuracy: Math.round(d.accuracy * 100),
    count: d.count,
    key: d.confidence,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis
          dataKey="confidence"
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tickFormatter={(v: number) => `${v}%`}
          tick={{ fontSize: 11, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value: number) => [`${value}%`, "Accuracy"]}
          {...tooltipStyle}
        />
        <ReferenceLine y={80} stroke="#e2e8f0" strokeDasharray="4 2" />
        <Bar dataKey="accuracy" radius={[4, 4, 0, 0]} maxBarSize={64}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={CONF_COLORS[entry.key] ?? "#94a3b8"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ------------------------------------------------------------------ */
/* 5. Error type breakdown — PieChart                                   */
/* ------------------------------------------------------------------ */

export function ErrorTypeChart({ data }: { data: ErrorTypeCount[] }) {
  if (data.length === 0) return null;

  const chartData = data.map((d) => ({
    name: d.error_type.replace(/_/g, " "),
    value: d.count,
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="45%"
          outerRadius={80}
          dataKey="value"
          nameKey="name"
          label={({ name, percent }: { name: string; percent: number }) =>
            percent > 0.07 ? `${Math.round(percent * 100)}%` : ""
          }
          labelLine={false}
        >
          {chartData.map((_, i) => (
            <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number, name: string) => [value, name]} {...tooltipStyle} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

/* ------------------------------------------------------------------ */
/* 6. Time vs Pace — BarChart (over/under)                              */
/* ------------------------------------------------------------------ */

export function TimeVsPaceChart({ data }: { data: TimeVsPace[] }) {
  if (data.length === 0) return null;

  const chartData = data.map((d) => ({
    area: d.area.length > 16 ? d.area.slice(0, 14) + "…" : d.area,
    fullArea: d.area,
    avgSeconds: d.avgSeconds,
    paceTarget: d.paceTarget,
    delta: d.delta,
    overPace: d.overPace,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis
          dataKey="area"
          tick={{ fontSize: 10, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${v}s`}
        />
        <Tooltip
          formatter={(value: number, name: string) => [
            `${value}s`,
            name === "avgSeconds" ? "Avg time/Q" : "Pace target",
          ]}
          labelFormatter={(label: string, payload) =>
            payload?.[0] ? (payload[0].payload as { fullArea: string }).fullArea : label
          }
          {...tooltipStyle}
        />
        <Bar dataKey="paceTarget" fill="#e2e8f0" radius={[4, 4, 0, 0]} maxBarSize={32} name="Pace target" />
        <Bar dataKey="avgSeconds" radius={[4, 4, 0, 0]} maxBarSize={32} name="Avg time/Q">
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.overPace ? OVER_COLOR : UNDER_COLOR} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ------------------------------------------------------------------ */
/* Combined SAT section bar                                              */
/* ------------------------------------------------------------------ */

export function SatSectionBarsChart({
  math,
  rw,
}: {
  math: number;
  rw: number;
}) {
  const data = [
    { section: "Math", score: math, fill: SAT_COLOR },
    { section: "R&W", score: rw, fill: "#0891b2" },
  ];

  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="section" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
        <YAxis domain={[200, 800]} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
        <Tooltip formatter={(v: number) => [v, "Score (ESTIMATE)"]} {...tooltipStyle} />
        <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={64}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
