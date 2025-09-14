"use client";

import React, { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ChartSpline,
  ChartBarIncreasing,
  ChartPie,
  Percent,
  CircleCheckBig,
  History,
  Milestone,
  CheckCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

type HabitFrequency = "daily" | "weekly" | "custom";

export type Habit = {
  id: string;
  name: string;
  category?: string;
  frequency: HabitFrequency;
  reminder?: string; // "08:30"
  history: string[]; // ISO dates when completed
  color?: string; // optional accent color hex or token
};

export type HabitsSectionProps = {
  className?: string;
  style?: React.CSSProperties;
  isLoading?: boolean;
  habits?: Habit[];
  onChange?: (next: Habit[]) => void;
};

function todayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}
function dateISO(d: Date) {
  const dd = new Date(d);
  dd.setHours(0, 0, 0, 0);
  return dd.toISOString().slice(0, 10);
}
function addDays(date: Date, delta: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + delta);
  return d;
}
function lastNDays(n: number): string[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: n })
    .map((_, i) => addDays(today, -(n - 1 - i)))
    .map(dateISO);
}
function calcStreak(history: string[], frequency: HabitFrequency): number {
  if (!history.length) return 0;
  const set = new Set(history);
  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  const step = frequency === "weekly" ? 7 : 1;
  while (true) {
    const key = dateISO(cursor);
    if (!set.has(key)) break;
    streak += 1;
    cursor = addDays(cursor, -step);
  }
  return streak;
}
function calcBestStreak(history: string[], frequency: HabitFrequency): number {
  if (!history.length) return 0;
  const set = new Set(history);
  const sorted = [...set].sort();
  if (!sorted.length) return 0;

  const step = frequency === "weekly" ? 7 : 1;
  let best = 0;
  let current = 0;
  let prev = new Date(sorted[0]);

  for (let i = 0; i < sorted.length; i++) {
    const d = new Date(sorted[i]);
    if (i === 0) {
      current = 1;
    } else {
      const diff = Math.round((+d - +prev) / (1000 * 60 * 60 * 24));
      if (diff === step) {
        current += 1;
      } else if (diff > 0) {
        best = Math.max(best, current);
        current = 1;
      }
    }
    prev = d;
  }
  best = Math.max(best, current);
  return best;
}
function calcCompletionRate(history: string[], frequency: HabitFrequency): number {
  const daysWindow = 90; // last 90d window
  const today = new Date();
  const start = addDays(today, -(daysWindow - 1));
  const windowKeys: string[] =
    frequency === "weekly"
      ? Array.from({ length: Math.ceil(daysWindow / 7) })
          .map((_, i) => dateISO(addDays(start, i * 7)))
      : lastNDays(daysWindow);
  if (windowKeys.length === 0) return 0;
  const set = new Set(history);
  const completed = windowKeys.filter((k) => set.has(k)).length;
  return Math.round((completed / windowKeys.length) * 100);
}
function ensureUnique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function buildMicroSeries(habit: Habit, days = 14) {
  const keys = lastNDays(days);
  const set = new Set(habit.history);
  return keys.map((k) => ({ date: k, done: set.has(k) }));
}

const defaultDemoHabits: Habit[] = [
  {
    id: "h1",
    name: "Morning Run",
    category: "Health",
    frequency: "daily",
    reminder: "07:00",
    history: lastNDays(21)
      .filter((_, i) => i % 2 === 0 || i > 15)
      .map((k) => k),
    color: "#6f5ae8",
  },
  {
    id: "h2",
    name: "Read 20 pages",
    category: "Learning",
    frequency: "daily",
    reminder: "20:30",
    history: lastNDays(21)
      .filter((_, i) => i % 3 !== 0)
      .map((k) => k),
    color: "#6366f1",
  },
  {
    id: "h3",
    name: "Weekly Planning",
    category: "Work",
    frequency: "weekly",
    history: lastNDays(70)
      .filter((_, i) => i % 7 === 2)
      .map((k) => k),
    color: "#8b5cf6",
  },
];

function MiniCompletionGraph({
  habit,
  className,
}: {
  habit: Habit;
  className?: string;
}) {
  const series = useMemo(() => buildMicroSeries(habit, 14), [habit]);
  return (
    <div
      className={cn(
        "flex items-end gap-1 w-full max-w-full min-w-0",
        className
      )}
      aria-label="Recent completion history"
    >
      {series.map((pt) => (
        <div
          key={pt.date}
          className={cn(
            "h-6 w-2 rounded-sm transition-all",
            pt.done ? "bg-primary" : "bg-muted"
          )}
          title={`${pt.date} • ${pt.done ? "Completed" : "Missed"}`}
          aria-label={`${pt.date} ${pt.done ? "completed" : "missed"}`}
        />
      ))}
    </div>
  );
}

function LineChart({
  data,
  color = "var(--chart-2)",
  height = 160,
  className,
  label,
}: {
  data: { x: number; y: number }[];
  color?: string;
  height?: number;
  className?: string;
  label?: string;
}) {
  const width = 520;
  const padding = 24;
  const xs = data.map((d) => d.x);
  const ys = data.map((d) => d.y);
  const minX = Math.min(...xs, 0);
  const maxX = Math.max(...xs, 1);
  const minY = Math.min(...ys, 0);
  const maxY = Math.max(...ys, 1);
  const scaleX = (x: number) =>
    padding + ((x - minX) / (maxX - minX || 1)) * (width - padding * 2);
  const scaleY = (y: number) =>
    height - padding - ((y - minY) / (maxY - minY || 1)) * (height - padding * 2);

  const path = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${scaleX(d.x)} ${scaleY(d.y)}`)
    .join(" ");

  return (
    <div className={cn("w-full overflow-hidden", className)}>
      <svg
        role="img"
        aria-label={label || "Line chart"}
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="rounded-md bg-secondary"
      >
        <path d={path} fill="none" stroke={color} strokeWidth={3} />
        {data.map((d, i) => (
          <circle
            key={i}
            cx={scaleX(d.x)}
            cy={scaleY(d.y)}
            r={3}
            fill={color}
            className="opacity-90"
          />
        ))}
      </svg>
    </div>
  );
}

function BarChart({
  data,
  color = "var(--chart-1)",
  height = 160,
  className,
  label,
}: {
  data: { x: number; y: number }[];
  color?: string;
  height?: number;
  className?: string;
  label?: string;
}) {
  const width = 520;
  const padding = 24;
  const xs = data.map((d) => d.x);
  const ys = data.map((d) => d.y);
  const minX = Math.min(...xs, 0);
  const maxX = Math.max(...xs, 1);
  const maxY = Math.max(...ys, 1);
  const scaleX = (x: number) =>
    padding + ((x - minX) / (maxX - minX || 1)) * (width - padding * 2);
  const bw = Math.max(6, (width - padding * 2) / (data.length * 1.5));
  const scaleHeight = (y: number) =>
    ((y - 0) / (maxY - 0 || 1)) * (height - padding * 2);

  return (
    <div className={cn("w-full overflow-hidden", className)}>
      <svg
        role="img"
        aria-label={label || "Bar chart"}
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="rounded-md bg-secondary"
      >
        {data.map((d, i) => {
          const x = scaleX(d.x) - bw / 2;
          const h = scaleHeight(d.y);
          return (
            <rect
              key={i}
              x={x}
              y={height - 24 - h}
              width={bw}
              height={h}
              fill={color}
              rx={4}
              ry={4}
            />
          );
        })}
      </svg>
    </div>
  );
}

function HabitDetailDialog({
  habit,
  onUpdate,
  onDelete,
  trigger,
}: {
  habit: Habit;
  onUpdate: (h: Habit) => void;
  onDelete: (id: string) => void;
  trigger: React.ReactNode;
}) {
  const streak = calcStreak(habit.history, habit.frequency);
  const bestStreak = calcBestStreak(habit.history, habit.frequency);
  const completionRate = calcCompletionRate(habit.history, habit.frequency);

  // Build chart data: last 12 intervals
  const lineSeries = useMemo(() => {
    if (habit.frequency === "weekly") {
      const weeks = Array.from({ length: 12 }).map((_, i) => {
        const base = addDays(new Date(), -(11 - i) * 7);
        const key = dateISO(base);
        return {
          x: i,
          y: habit.history.includes(key) ? 1 : 0,
        };
      });
      return weeks;
    } else {
      // daily: completion count per day (0 or 1)
      const days = lastNDays(30);
      return days.map((d, i) => ({
        x: i,
        y: habit.history.includes(d) ? 1 : 0,
      }));
    }
  }, [habit]);

  const barSeries = useMemo(() => {
    // Aggregate by week: count of completions in that week in last 12w
    const weeks = Array.from({ length: 12 }).map((_, i) => {
      const start = addDays(new Date(), -(11 - i) * 7);
      start.setHours(0, 0, 0, 0);
      const startKey = dateISO(start);
      const endKey = dateISO(addDays(start, 6));
      const count = habit.history.filter(
        (h) => h >= startKey && h <= endKey
      ).length;
      return { x: i, y: count };
    });
    return weeks;
  }, [habit]);

  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState<Habit>(habit);

  const saveEdit = () => {
    const next: Habit = {
      ...draft,
      name: draft.name.trim(),
      history: ensureUnique(draft.history).sort(),
    };
    onUpdate(next);
    setEdit(false);
    toast.success("Habit updated");
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">{habit.name}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Detailed analytics and settings
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
              {habit.category || "General"}
            </Badge>
            <Badge className="bg-accent text-accent-foreground">
              {habit.frequency.toUpperCase()}
            </Badge>
            {habit.reminder ? (
              <Badge variant="outline">{habit.reminder}</Badge>
            ) : null}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg bg-secondary p-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CircleCheckBig className="h-4 w-4" />
                Current Streak
              </div>
              <div className="text-2xl font-semibold mt-1">{streak}d</div>
              <Progress className="mt-3" value={Math.min(100, (streak / Math.max(bestStreak, 7)) * 100)} />
            </div>
            <div className="rounded-lg bg-secondary p-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Milestone className="h-4 w-4" />
                Best Streak
              </div>
              <div className="text-2xl font-semibold mt-1">{bestStreak}d</div>
              <div className="text-xs text-muted-foreground mt-1">
                Keep pushing to beat your best!
              </div>
            </div>
            <div className="rounded-lg bg-secondary p-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Percent className="h-4 w-4" />
                Completion Rate
              </div>
              <div className="text-2xl font-semibold mt-1">{completionRate}%</div>
              <div className="text-xs text-muted-foreground mt-1">
                Last 90 days
              </div>
            </div>
          </div>

          <Tabs defaultValue="line" className="w-full">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="line" className="flex items-center gap-2">
                <ChartSpline className="h-4 w-4" />
                Trend
              </TabsTrigger>
              <TabsTrigger value="bars" className="flex items-center gap-2">
                <ChartBarIncreasing className="h-4 w-4" />
                Weekly
              </TabsTrigger>
              <TabsTrigger value="split" className="flex items-center gap-2">
                <ChartPie className="h-4 w-4" />
                Distribution
              </TabsTrigger>
            </TabsList>

            <TabsContent value="line" className="mt-3">
              <LineChart
                data={lineSeries}
                color="var(--chart-2)"
                label="Daily completions trend"
              />
            </TabsContent>
            <TabsContent value="bars" className="mt-3">
              <BarChart
                data={barSeries}
                color="var(--chart-1)"
                label="Completions per week"
              />
            </TabsContent>
            <TabsContent value="split" className="mt-3">
              <div className="rounded-lg bg-secondary p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Last 30 days</div>
                    <div className="text-lg font-semibold">
                      {habit.frequency === "weekly"
                        ? `${habit.history.length} weeks completed`
                        : `${habit.history.filter((d) => d >= dateISO(addDays(new Date(), -29))).length} days completed`}
                    </div>
                  </div>
                  <div className="h-16 w-16 rounded-full bg-card grid place-items-center shadow-sm">
                    <span className="text-sm font-semibold">{completionRate}%</span>
                  </div>
                </div>
                <Separator className="my-4" />
                <MiniCompletionGraph habit={habit} />
              </div>
            </TabsContent>
          </Tabs>

          <Separator />

          {!edit ? (
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <History className="h-4 w-4" />
                History entries: {habit.history.length}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={() => setEdit(true)}>
                  Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">Delete</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-card">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete habit</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the habit and its history.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          onDelete(habit.id);
                          toast.success("Habit deleted");
                        }}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="name">Habit name</Label>
                  <Input
                    id="name"
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    placeholder="e.g., Drink water"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={draft.category || ""}
                    onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                    placeholder="Health, Work, Learning..."
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Frequency</Label>
                  <Select
                    value={draft.frequency}
                    onValueChange={(v: HabitFrequency) =>
                      setDraft({ ...draft, frequency: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="reminder">Reminder (optional)</Label>
                  <Input
                    id="reminder"
                    type="time"
                    value={draft.reminder || ""}
                    onChange={(e) => setDraft({ ...draft, reminder: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button variant="ghost" onClick={() => setEdit(false)}>
                  Cancel
                </Button>
                <Button onClick={saveEdit}>Save changes</Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-2">
          <DialogClose asChild>
            <Button variant="secondary">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HabitRow({
  habit,
  onToggleToday,
  onOpenDetail,
}: {
  habit: Habit;
  onToggleToday: (id: string) => void;
  onOpenDetail: () => void;
}) {
  const streak = calcStreak(habit.history, habit.frequency);
  const today = todayISO();
  const doneToday = habit.history.includes(today);

  const micro = buildMicroSeries(habit, 14);

  return (
    <div
      className="w-full rounded-xl bg-card text-card-foreground border border-border p-4 sm:p-5 hover:shadow-sm transition-shadow"
      role="group"
    >
      <div className="flex items-center gap-3">
        <button
          aria-label={doneToday ? "Mark as not completed" : "Mark as completed"}
          onClick={() => onToggleToday(habit.id)}
          className={cn(
            "h-9 w-9 min-w-9 rounded-full grid place-items-center border transition-colors",
            doneToday
              ? "bg-primary text-primary-foreground border-transparent"
              : "bg-secondary text-secondary-foreground border-border hover:bg-muted"
          )}
        >
          <CheckCheck className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <p className="truncate font-semibold text-base sm:text-lg">{habit.name}</p>
            {habit.category ? (
              <Badge variant="secondary" className="hidden sm:inline-flex">
                {habit.category}
              </Badge>
            ) : null}
          </div>
          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <CircleCheckBig className="h-4 w-4" />
              <span>{streak}d</span>
            </div>
            <div className="flex items-center gap-1.5">
              <History className="h-4 w-4" />
              <span className="truncate">
                {habit.frequency.charAt(0).toUpperCase() + habit.frequency.slice(1)}
                {habit.reminder ? ` • ${habit.reminder}` : ""}
              </span>
            </div>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <MiniCompletionGraph habit={habit} className="w-40" />
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onOpenDetail}
                  className="h-9 px-3 rounded-lg bg-secondary hover:bg-muted transition-colors text-sm border"
                >
                  Details
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-card border text-card-foreground">
                Open detailed analytics
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      <div className="mt-3 sm:hidden">
        <MiniCompletionGraph habit={habit} />
        <div className="mt-2">
          <button
            onClick={onOpenDetail}
            className="text-sm text-primary hover:underline"
          >
            View details
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HabitsSection({
  className,
  style,
  isLoading = false,
  habits: habitsProp,
  onChange,
}: HabitsSectionProps) {
  const [habits, setHabits] = useState<Habit[]>(
    habitsProp && habitsProp.length ? habitsProp : defaultDemoHabits
  );

  const update = useCallback(
    (next: Habit[]) => {
      setHabits(next);
      onChange?.(next);
    },
    [onChange]
  );

  const toggleToday = useCallback(
    (id: string) => {
      const key = todayISO();
      update(
        habits.map((h) => {
          if (h.id !== id) return h;
          const has = h.history.includes(key);
          const nextHistory = has
            ? h.history.filter((d) => d !== key)
            : ensureUnique([...h.history, key]).sort();
          const next = { ...h, history: nextHistory };
          const streak = calcStreak(nextHistory, h.frequency);

          if (!has) {
            if (streak === 1) {
              toast.success(`Nice start on "${h.name}"!`);
            } else if (streak === 7) {
              toast.success("7-day streak! Keep the momentum going!");
            } else if (streak === 30) {
              toast.success("30 days strong! You're building a powerful habit.");
            } else {
              toast.success("Completed for today");
            }
          } else {
            toast.message("Unmarked today's completion");
          }
          return next;
        })
      );
    },
    [habits, update]
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [newHabit, setNewHabit] = useState<Habit>({
    id: "",
    name: "",
    category: "",
    frequency: "daily",
    reminder: "",
    history: [],
  });

  const addHabit = () => {
    const name = newHabit.name.trim();
    if (!name) {
      toast.error("Please enter a habit name");
      return;
    }
    const id = `h_${Math.random().toString(36).slice(2, 9)}`;
    const created: Habit = {
      ...newHabit,
      id,
      history: [],
      color: "#6f5ae8",
    };
    update([created, ...habits]);
    setNewHabit({
      id: "",
      name: "",
      category: "",
      frequency: "daily",
      reminder: "",
      history: [],
    });
    setCreateOpen(false);
    toast.success(`Created "${name}"`);
  };

  const updateHabit = (next: Habit) => {
    update(habits.map((h) => (h.id === next.id ? next : h)));
  };
  const deleteHabit = (id: string) => {
    update(habits.filter((h) => h.id !== id));
  };

  const empty = !isLoading && habits.length === 0;

  return (
    <section className={cn("w-full", className)} style={style} aria-label="Habits">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
            Habits
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track streaks, complete habits, and explore your progress.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                Create habit
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg bg-card text-card-foreground">
              <DialogHeader>
                <DialogTitle>Create a new habit</DialogTitle>
                <DialogDescription>
                  Name your habit and choose how often you want to complete it.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="habit-name">Habit name</Label>
                  <Input
                    id="habit-name"
                    value={newHabit.name}
                    onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
                    placeholder="e.g., Meditate"
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>Frequency</Label>
                    <Select
                      value={newHabit.frequency}
                      onValueChange={(v: HabitFrequency) =>
                        setNewHabit({ ...newHabit, frequency: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="habit-category">Category</Label>
                    <Input
                      id="habit-category"
                      value={newHabit.category || ""}
                      onChange={(e) =>
                        setNewHabit({ ...newHabit, category: e.target.value })
                      }
                      placeholder="Optional"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="habit-reminder">Reminder (optional)</Label>
                  <Input
                    id="habit-reminder"
                    type="time"
                    value={newHabit.reminder || ""}
                    onChange={(e) =>
                      setNewHabit({ ...newHabit, reminder: e.target.value })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={addHabit}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-xl bg-secondary animate-pulse"
              aria-hidden="true"
            />
          ))}
        </div>
      ) : empty ? (
        <div className="rounded-xl border border-dashed p-8 bg-card text-center">
          <div className="mx-auto mb-3 h-10 w-10 rounded-full bg-secondary grid place-items-center">
            <ChartSpline className="h-5 w-5 text-muted-foreground" />
          </div>
          <h3 className="font-semibold">No habits yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Create your first habit to start building momentum.
          </p>
          <div className="mt-4">
            <Button onClick={() => setCreateOpen(true)}>Create a habit</Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          {habits.map((h) => (
            <HabitDetailDialog
              key={h.id}
              habit={h}
              onUpdate={updateHabit}
              onDelete={deleteHabit}
              trigger={
                <HabitRow
                  habit={h}
                  onToggleToday={toggleToday}
                  onOpenDetail={() => {}}
                />
              }
            />
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-3">
        <div className="rounded-xl bg-card border p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ChartBarIncreasing className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Overall completion (last 30 days)
              </span>
            </div>
            <span className="text-sm font-medium">
              {Math.round(
                (habits.reduce(
                  (acc, h) =>
                    acc +
                    h.history.filter((d) => d >= dateISO(addDays(new Date(), -29))).length,
                  0
                ) /
                  Math.max(1, habits.length * 30)) *
                  100
              )}
              %
            </span>
          </div>
          <div className="mt-3">
            <Progress
              value={Math.round(
                (habits.reduce(
                  (acc, h) =>
                    acc +
                    h.history.filter((d) => d >= dateISO(addDays(new Date(), -29))).length,
                  0
                ) /
                  Math.max(1, habits.length * 30)) *
                  100
              )}
            />
          </div>
        </div>
      </div>
    </section>
  );
}