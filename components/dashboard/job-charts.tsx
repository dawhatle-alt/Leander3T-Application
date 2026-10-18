"use client";

import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Brand palette only (CLAUDE.md: no new colors). Order chosen so neighbors
// contrast; the muted mortar gray is reserved for "Unassigned" / "Other".
const SLICE = [
  "#E4590F", // flame
  "#33638F", // blue
  "#F49F0A", // amber
  "#2F6B45", // green
  "#C42B1F", // chalk
  "#211B17", // charcoal
  "#75685C", // muted
];
const NEUTRAL = "#D8CDB9";
const MAX_SLICES = 7;

const MONO = "var(--font-mono)";
const tooltipStyle = {
  background: "#211B17",
  border: "none",
  borderRadius: 8,
  color: "#F6F1E8",
  fontFamily: MONO,
  fontSize: 12,
};

export type Slice = { name: string; value: number; neutral?: boolean };

/** Keep the biggest slices; fold the rest into "Other". */
function fold(slices: Slice[]): Slice[] {
  if (slices.length <= MAX_SLICES) return slices;
  const keep = slices.slice(0, MAX_SLICES - 1);
  const rest = slices.slice(MAX_SLICES - 1).reduce((n, s) => n + s.value, 0);
  return [...keep, { name: "Other", value: rest, neutral: true }];
}

export function Donut({ data, unit }: { data: Slice[]; unit: string }) {
  const slices = fold(data.filter((d) => d.value > 0));
  const total = slices.reduce((n, s) => n + s.value, 0);
  if (!total)
    return (
      <p className="py-16 text-center text-ink-muted">No jobs in this range.</p>
    );

  let color = 0;
  const colored = slices.map((s) => ({
    ...s,
    fill: s.neutral ? NEUTRAL : SLICE[color++ % SLICE.length],
  }));

  return (
    <div className="grid items-center gap-6 sm:grid-cols-[200px_1fr]">
      <div className="relative mx-auto size-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={colored}
              dataKey="value"
              nameKey="name"
              innerRadius={62}
              outerRadius={96}
              paddingAngle={1.5}
              stroke="#FFFFFF"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {colored.map((s) => (
                <Cell key={s.name} fill={s.fill} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              itemStyle={{ color: "#F6F1E8" }}
              formatter={(v) => [`${v} ${unit}`, ""]}
              separator=""
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="font-display text-[34px] leading-none font-bold">
              {total.toLocaleString()}
            </div>
            <div className="mt-1 font-mono text-[10.5px] tracking-[0.12em] text-ink-muted uppercase">
              {unit}
            </div>
          </div>
        </div>
      </div>
      <ul className="grid gap-2">
        {colored.map((s) => (
          <li
            key={s.name}
            className="grid grid-cols-[12px_1fr_auto_44px] items-center gap-2.5 text-[14px]"
          >
            <span
              className="size-3 rounded-[3px]"
              style={{ background: s.fill }}
              aria-hidden
            />
            <span className="truncate font-semibold">{s.name}</span>
            <span className="font-mono text-[13px]">{s.value}</span>
            <span className="text-right font-mono text-[12px] text-ink-muted">
              {Math.round((s.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export type TrendPoint = { label: string; received: number; completed: number };

export function Trend({ data }: { data: TrendPoint[] }) {
  if (!data.length)
    return (
      <p className="py-16 text-center text-ink-muted">No jobs in this range.</p>
    );
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 16, bottom: 0, left: -12 }}
        >
          <CartesianGrid
            stroke="#E6DCCB"
            strokeDasharray="3 4"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fontFamily: MONO, fontSize: 11, fill: "#75685C" }}
            tickLine={false}
            axisLine={{ stroke: "#E6DCCB" }}
            minTickGap={24}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontFamily: MONO, fontSize: 11, fill: "#75685C" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "#D8CDB9" }} />
          <Legend
            iconType="plainline"
            wrapperStyle={{
              fontFamily: MONO,
              fontSize: 11,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#75685C",
            }}
          />
          <Line
            type="linear"
            dataKey="received"
            name="Received"
            stroke="#E4590F"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
          <Line
            type="linear"
            dataKey="completed"
            name="Completed"
            stroke="#2F6B45"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
