export type Status = "done" | "on-track" | "at-risk" | "behind" | "draft";

export type Cycle = {
  id: string;
  name: string;
  start: string;
  end: string;
};

export type Objective = {
  id: string;
  cycleId: string;
  title: string;
  description: string;
  owner: string;
};

export type ObjectiveView = Objective & {
  progress: number;
  status: Status;
};

export type KeyResult = {
  id: string;
  objectiveId: string;
  title: string;
  unit: string;
  startValue: number;
  targetValue: number;
  currentValue: number;
};

export type CheckIn = {
  id: string;
  keyResultId: string;
  value: number;
  note: string;
  at: string;
};

export type Workspace = {
  cycles: Cycle[];
  objectives: Objective[];
  keyResults: KeyResult[];
  checkIns: CheckIn[];
  activeCycleId: string;
};

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function parseDay(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1).getTime();
}

export function formatDay(iso: string) {
  return new Date(parseDay(iso)).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

export function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

export function formatMeasure(value: number, unit: string) {
  const rounded = Math.round(value * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  if (!unit) return text;
  if (unit === "%") return `${text}%`;
  const label = Math.abs(rounded) === 1 && unit.endsWith("s") ? unit.slice(0, -1) : unit;
  return `${text} ${label}`;
}

export function krProgress(kr: KeyResult) {
  const span = kr.targetValue - kr.startValue;
  if (span === 0) return kr.currentValue === kr.targetValue ? 1 : 0;
  const raw =
    span > 0
      ? (kr.currentValue - kr.startValue) / span
      : (kr.startValue - kr.currentValue) / -span;
  return clamp(raw, 0, 1);
}

export function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function cycleTiming(cycle: Cycle, now = new Date()) {
  const start = parseDay(cycle.start);
  const end = parseDay(cycle.end);
  const span = Math.max(end - start, 1);
  const dayMs = 86_400_000;
  const totalDays = Math.max(1, Math.round((end - start) / dayMs));
  const elapsedDays = clamp(Math.floor((now.getTime() - start) / dayMs), 0, totalDays);
  const pace = clamp((now.getTime() - start) / span, 0, 1);
  return { totalDays, elapsedDays, pace };
}

export function statusFor(progress: number, pace: number, krCount: number): Status {
  if (krCount === 0) return "draft";
  if (progress >= 0.999) return "done";
  if (progress + 0.05 >= pace) return "on-track";
  if (progress + 0.2 >= pace) return "at-risk";
  return "behind";
}

export const statusLabel: Record<Status, string> = {
  done: "Done",
  "on-track": "On track",
  "at-risk": "At risk",
  behind: "Behind",
  draft: "Draft",
};

export function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function uid() {
  return crypto.randomUUID();
}
