"use client"

import * as React from "react"
import { ListTodo, SquareCheckBig, ChartNoAxesGantt, Check } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"

type Habit = {
  id: string
  name: string
  completed: boolean
}

type TodoPriority = "high" | "medium" | "low"

type Todo = {
  id: string
  title: string
  completed: boolean
  priority: TodoPriority
}

type ProgressStats = {
  habitsCompleted: number
  habitsTotal: number
  todosCompleted: number
  todosTotal: number
}

export interface DailyViewProps {
  className?: string
  style?: React.CSSProperties
  habits?: Habit[]
  todos?: Todo[]
  stats?: ProgressStats
  isLoading?: boolean
  onToggleHabit?: (habitId: string, next: boolean) => Promise<void> | void
  onToggleTodo?: (todoId: string, next: boolean) => Promise<void> | void
  emptyHabitsHint?: string
  emptyTodosHint?: string
  headerNote?: string
  readOnly?: boolean
  habitTrendSeries?: number[]
  todoTrendSeries?: number[]
}

function clsx(...args: Array<string | false | null | undefined>) {
  return args.filter(Boolean).join(" ")
}

export default function DailyView({
  className,
  style,
  habits = [],
  todos = [],
  stats,
  isLoading = false,
  onToggleHabit,
  onToggleTodo,
  emptyHabitsHint = "No habits scheduled for today. Create one in the Habits section.",
  emptyTodosHint = "No to-dos for today. Add tasks in the To-Dos section.",
  headerNote,
  readOnly = false,
  habitTrendSeries,
  todoTrendSeries,
}: DailyViewProps) {
  const [localHabits, setLocalHabits] = React.useState<Habit[]>(habits)
  const [localTodos, setLocalTodos] = React.useState<Todo[]>(todos)
  const [isToggling, setIsToggling] = React.useState<Record<string, boolean>>({})

  React.useEffect(() => {
    setLocalHabits(habits)
  }, [habits])

  React.useEffect(() => {
    setLocalTodos(todos)
  }, [todos])

  const handleToggleHabit = async (id: string, next: boolean) => {
    setIsToggling((s) => ({ ...s, [id]: true }))
    setLocalHabits((prev) => prev.map((h) => (h.id === id ? { ...h, completed: next } : h)))
    try {
      await onToggleHabit?.(id, next)
    } catch {
      // rollback
      setLocalHabits((prev) => prev.map((h) => (h.id === id ? { ...h, completed: !next } : h)))
      toast.error("Couldn't update habit. Please try again.")
    } finally {
      setIsToggling((s) => ({ ...s, [id]: false }))
    }
  }

  const handleToggleTodo = async (id: string, next: boolean) => {
    setIsToggling((s) => ({ ...s, [id]: true }))
    setLocalTodos((prev) => prev.map((t) => (t.id === id ? { ...t, completed: next } : t)))
    try {
      await onToggleTodo?.(id, next)
    } catch {
      // rollback
      setLocalTodos((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !next } : t)))
      toast.error("Couldn't update task. Please try again.")
    } finally {
      setIsToggling((s) => ({ ...s, [id]: false }))
    }
  }

  // Derive stats if not provided
  const derivedStats: ProgressStats = React.useMemo(() => {
    const hc = localHabits.filter((h) => h.completed).length
    const tc = localTodos.filter((t) => t.completed).length
    return {
      habitsCompleted: stats?.habitsCompleted ?? hc,
      habitsTotal: stats?.habitsTotal ?? localHabits.length,
      todosCompleted: stats?.todosCompleted ?? tc,
      todosTotal: stats?.todosTotal ?? localTodos.length,
    }
  }, [localHabits, localTodos, stats])

  const habitPct = React.useMemo(() => {
    const { habitsCompleted, habitsTotal } = derivedStats
    return habitsTotal > 0 ? Math.round((habitsCompleted / habitsTotal) * 100) : 0
  }, [derivedStats])

  const todoPct = React.useMemo(() => {
    const { todosCompleted, todosTotal } = derivedStats
    return todosTotal > 0 ? Math.round((todosCompleted / todosTotal) * 100) : 0
  }, [derivedStats])

  const totalRemaining =
    (derivedStats.habitsTotal - derivedStats.habitsCompleted) +
    (derivedStats.todosTotal - derivedStats.todosCompleted)

  // Trends are provided by parent (last 7 days including today)
  const habitTrend = habitTrendSeries ?? []
  const todoTrend = todoTrendSeries ?? []

  return (
    <section
      className={clsx(
        "w-full max-w-full space-y-4 sm:space-y-6",
        className
      )}
      style={style}
      aria-label="Today's overview"
    >
      {/* Top row: Habits and Todos side by side */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
      {headerNote && (
        <div className="md:col-span-2 -mt-2">
          <div className="rounded-md border border-dashed border-input bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {headerNote}
          </div>
        </div>
      )}
      {/* Habits Card */}
      <Card className="bg-card shadow-sm">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-accent text-accent-foreground">
                <SquareCheckBig className="h-4 w-4" aria-hidden="true" />
              </div>
              <CardTitle className="text-base sm:text-lg">Today&apos;s Habits</CardTitle>
            </div>
            <Badge variant="secondary" className="bg-secondary text-foreground">
              {derivedStats.habitsCompleted}/{derivedStats.habitsTotal}
            </Badge>
          </div>
          <CardDescription className="text-muted-foreground">
            Quick check-ins for your daily routines
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-3/4 rounded-md" />
            </div>
          ) : localHabits.length === 0 ? (
            <EmptyState
              icon={<SquareCheckBig className="h-5 w-5" aria-hidden="true" />}
              title="No habits today"
              description={emptyHabitsHint}
            />
          ) : (
            <ul className="space-y-2">
              {localHabits.map((habit) => (
                <li key={habit.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (readOnly) return;
                      handleToggleHabit(habit.id, !habit.completed);
                    }}
                    className={clsx(
                      "w-full",
                      "group inline-flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2 text-left transition-colors",
                      "hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    )}
                    aria-pressed={habit.completed}
                    aria-label={`Mark habit "${habit.name}" as ${habit.completed ? "incomplete" : "complete"}`}
                    disabled={readOnly || isToggling[habit.id]}
                  >
                    <Checkbox
                      checked={habit.completed}
                      onCheckedChange={(checked) => {
                        if (readOnly) return;
                        handleToggleHabit(habit.id, Boolean(checked));
                      }}
                      aria-label={habit.completed ? "Completed" : "Not completed"}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      disabled={readOnly || isToggling[habit.id]}
                    />
                    <span className={clsx("min-w-0 flex-1 truncate", habit.completed && "text-muted-foreground line-through")}>
                      {habit.name}
                    </span>
                    <span
                      aria-hidden="true"
                      className={clsx(
                        "inline-flex h-6 w-6 items-center justify-center rounded-full transition-colors",
                        habit.completed ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                        "group-hover:opacity-100"
                      )}
                    >
                      {habit.completed ? <Check className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Todos Card */}
      <Card className="bg-card shadow-sm">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-accent text-accent-foreground">
                <ListTodo className="h-4 w-4" aria-hidden="true" />
              </div>
              <CardTitle className="text-base sm:text-lg">Today&apos;s To-Dos</CardTitle>
            </div>
            <Badge variant="secondary" className="bg-secondary text-foreground">
              {derivedStats.todosCompleted}/{derivedStats.todosTotal}
            </Badge>
          </div>
          <CardDescription className="text-muted-foreground">
            Focus on your most important tasks
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full rounded-md" />
              <Skeleton className="h-12 w-full rounded-md" />
              <Skeleton className="h-12 w-2/3 rounded-md" />
            </div>
          ) : localTodos.length === 0 ? (
            <EmptyState
              icon={<ListTodo className="h-5 w-5" aria-hidden="true" />}
              title="No to-dos today"
              description={emptyTodosHint}
            />
          ) : (
            <ul className="space-y-2">
              {localTodos.map((todo) => (
                <li key={todo.id} className="min-w-0">
                  <div
                    className={clsx(
                      "group flex items-center gap-3 rounded-md border border-border bg-card px-3 py-3 transition-colors",
                      "hover:bg-secondary focus-within:ring-2 focus-within:ring-ring"
                    )}
                  >
                    <Checkbox
                      checked={todo.completed}
                      onCheckedChange={(checked) => {
                        if (readOnly) return;
                        handleToggleTodo(todo.id, Boolean(checked));
                      }}
                      aria-label={todo.completed ? "Completed" : "Not completed"}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      disabled={readOnly || isToggling[todo.id]}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={clsx(
                            "truncate text-sm sm:text-base",
                            todo.completed && "text-muted-foreground line-through"
                          )}
                          title={todo.title}
                        >
                          {todo.title}
                        </p>
                        <PriorityBadge priority={todo.priority} />
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      </div>

      {/* Bottom row: Full-width Progress Chart */}
      <Card className="bg-card shadow-sm">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <ChartNoAxesGantt className="h-4 w-4" aria-hidden="true" />
            </div>
            <CardTitle className="text-base sm:text-lg">Progress Overview</CardTitle>
          </div>
          <CardDescription className="text-muted-foreground">
            Completion trends and daily progress summary
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-36 w-full rounded" />
              <Separator className="my-2" />
              <Skeleton className="h-8 w-1/2 rounded" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Inline SVG Line Chart */}
              <div className="relative w-full">
                <MiniLineChart
                  series={[
                    { label: "Habits", color: "var(--chart-1)", data: habitTrend },
                    { label: "To-Dos", color: "var(--chart-2)", data: todoTrend },
                  ].filter((s) => s.data && s.data.length > 0)}
                  height={160}
                />
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                  <Legend dotClass="bg-[var(--chart-1)]" label="Habits" value={`${habitPct}%`} detail={`${derivedStats.habitsCompleted}/${derivedStats.habitsTotal}`} />
                  {todoTrend.length > 0 && (
                    <Legend dotClass="bg-[var(--chart-2)]" label="To-Dos" value={`${todoPct}%`} detail={`${derivedStats.todosCompleted}/${derivedStats.todosTotal}`} />
                  )}
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">Remaining today</div>
                  <div className="text-xs text-muted-foreground">
                    Keep the streak going — you&apos;re almost there
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 rounded-md bg-secondary px-3 py-1.5">
                  <span className="text-sm font-semibold">{totalRemaining}</span>
                  <span className="text-xs text-muted-foreground">items</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-input bg-muted/40 px-6 py-10 text-center">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        {icon}
      </div>
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  )
}

function PriorityBadge({ priority }: { priority: TodoPriority }) {
  const label =
    priority === "high" ? "High" : priority === "medium" ? "Medium" : "Low"
  const dotClass =
    priority === "high"
      ? "bg-[var(--chart-1)]"
      : priority === "medium"
        ? "bg-[var(--chart-2)]"
        : "bg-[var(--chart-3)]"

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-foreground">
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
      {label}
    </span>
  )
}

// Lightweight SVG line chart (no deps)
function MiniLineChart({
  series,
  height = 160,
}: {
  series: { label: string; color: string; data: number[] }[]
  height?: number
}) {
  const padding = { top: 12, right: 8, bottom: 16, left: 8 }
  const width = 600 // will scale to 100%
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom
  const maxX = Math.max(0, ...(series[0]?.data?.map((_, i) => i) ?? []), 6)
  const xStep = innerW / (Math.max(maxX, 1))
  const yScale = (v: number) => padding.top + (100 - v) / 100 * innerH

  const gridY = [0, 25, 50, 75, 100]

  const pathFor = (data: number[]) =>
    data
      .map((v, i) => `${i === 0 ? "M" : "L"}${padding.left + i * xStep},${yScale(v)}`)
      .join(" ")

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full" role="img" aria-label="Completion trends over the last 7 days">
      {/* Grid */}
      {gridY.map((gy) => (
        <line
          key={gy}
          x1={padding.left}
          x2={width - padding.right}
          y1={yScale(gy)}
          y2={yScale(gy)}
          stroke="var(--border)"
          strokeOpacity="0.5"
          strokeWidth={1}
        />
      ))}
      {/* Series */}
      {series.map((s, idx) => (
        <g key={s.label}>
          <path d={pathFor(s.data)} fill="none" stroke={s.color} strokeWidth={2} />
          {s.data.map((v, i) => (
            <circle
              key={`${idx}-${i}`}
              cx={padding.left + i * xStep}
              cy={yScale(v)}
              r={2.5}
              fill={s.color}
            />
          ))}
        </g>
      ))}
    </svg>
  )
}

function Legend({ dotClass, label, value, detail }: { dotClass: string; label: string; value: string; detail?: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5">
      <span className={`h-2 w-2 rounded-full ${dotClass}`} aria-hidden="true" />
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
      {detail ? <span className="text-xs text-muted-foreground">({detail})</span> : null}
    </div>
  )
}