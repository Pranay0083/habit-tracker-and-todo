"use client";

import * as React from "react";
import Navigation from "@/components/Navigation";
import DailyView from "@/components/DailyView";
import TodosSection from "@/components/TodosSection";
import HabitsSection, { type Habit as HabitModel } from "@/components/HabitsSection";
import LoginForm from "@/components/LoginForm";
import { useAuth } from "@/contexts/AuthContext";
import { Sun, Moon, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataService } from "@/lib/data";

type NavValue = "daily" | "todos" | "habits";

type DailyHabit = {
  id: string;
  name: string;
  completed: boolean;
};

type DailyTodo = {
  id: string;
  title: string;
  completed: boolean;
  priority: "high" | "medium" | "low";
};

function todayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}


export default function Page() {
  // ALL HOOKS MUST BE DECLARED AT THE TOP - NEVER CONDITIONALLY
  const { user, isAuthenticated, isLoading, login, signup, logout } = useAuth();
  const [section, setSection] = React.useState<NavValue>("daily");
  
  // Shared app state: habits persist across sections
  const [habits, setHabits] = React.useState<HabitModel[]>([]);

  // Daily-only lightweight todos for the dashboard
  const [todayTodos, setTodayTodos] = React.useState<DailyTodo[]>([]);

  const today = React.useMemo(() => todayISO(), []);

  // Theme state
  const [isDark, setIsDark] = React.useState(false);

  // Theme state initialization
  React.useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
    const prefersDark = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const nextDark = stored ? stored === "dark" : prefersDark;
    setIsDark(nextDark);
    document.documentElement.classList.toggle("dark", nextDark);
  }, []);

  // Initialize user-specific data
  React.useEffect(() => {
    if (user) {
      const initializeData = async () => {
        try {
          // await DataService.initializeSampleData(user.id);
          const userHabits = await DataService.getUserHabits(user.id);
          setHabits(userHabits as HabitModel[]);
          
          // Convert todos to daily todos format
          const userTodos = await DataService.getUserTodos(user.id);
          const dailyTodos: DailyTodo[] = userTodos.map(todo => ({
            id: todo.id,
            title: todo.title,
            completed: todo.completed,
            priority: todo.priority,
          }));
          setTodayTodos(dailyTodos);
        } catch (error) {
          console.error('Error loading user data:', error);
        }
      };
      
      initializeData();
    }
  }, [user]);

  const toggleTheme = React.useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("theme", next ? "dark" : "light");
      return next;
    });
  }, []);

  const dailyHabits: DailyHabit[] = React.useMemo(() => {
    return habits.map((h) => ({
      id: h.id,
      name: h.name,
      completed: h.history.includes(today),
    }));
  }, [habits, today]);

  const handleToggleHabitToday = React.useCallback(async (habitId: string, next: boolean) => {
    if (!user) return;
    
    // Optimistically update the UI
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== habitId) return h;
        const has = h.history.includes(today);
        let updatedHabit = h;
        
        if (next && !has) {
          updatedHabit = { ...h, history: [...h.history, today].sort() };
        }
        if (!next && has) {
          updatedHabit = { ...h, history: h.history.filter((d) => d !== today) };
        }
        
        return updatedHabit;
      })
    );

    try {
      // Find the habit to update
      const habit = habits.find(h => h.id === habitId);
      if (!habit) return;
      
      const has = habit.history.includes(today);
      let newHistory = habit.history;
      
      if (next && !has) {
        newHistory = [...habit.history, today].sort();
      }
      if (!next && has) {
        newHistory = habit.history.filter((d) => d !== today);
      }
      
      // Persist to database
      await DataService.updateHabit(user.id, habitId, { history: newHistory });
    } catch (error) {
      console.error('Error updating habit:', error);
      // Revert the optimistic update on error
      const userHabits = await DataService.getUserHabits(user.id);
      setHabits(userHabits as HabitModel[]);
    }
  }, [today, user, habits]);

  const handleToggleTodoToday = React.useCallback(async (todoId: string, next: boolean) => {
    if (!user) return;
    
    // Optimistically update the UI
    setTodayTodos((prev) => prev.map((t) => {
      if (t.id === todoId) {
        return { ...t, completed: next };
      }
      return t;
    }));

    try {
      // Persist to database
      await DataService.updateTodo(user.id, todoId, { completed: next });
    } catch (error) {
      console.error('Error updating todo:', error);
      // Revert the optimistic update on error
      const userTodos = await DataService.getUserTodos(user.id);
      const dailyTodos: DailyTodo[] = userTodos.map(todo => ({
        id: todo.id,
        title: todo.title,
        completed: todo.completed,
        priority: todo.priority,
      }));
      setTodayTodos(dailyTodos);
    }
  }, [user]);

  const dailyStats = React.useMemo(() => {
    const habitsCompleted = dailyHabits.filter((h) => h.completed).length;
    const habitsTotal = dailyHabits.length;
    const todosCompleted = todayTodos.filter((t) => t.completed).length;
    const todosTotal = todayTodos.length;
    return { habitsCompleted, habitsTotal, todosCompleted, todosTotal };
  }, [dailyHabits, todayTodos]);

  // Handle authentication
  const handleLogin = async (username: string, password: string, rememberMe: boolean) => {
    await login({ username, password, rememberMe });
  };

  const handleSignup = async (username: string, password: string, confirmPassword: string) => {
    await signup({ username, password, confirmPassword });
  };

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return <LoginForm onLogin={handleLogin} onSignup={handleSignup} />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary/10 grid place-items-center text-primary font-bold">
              P
            </div>
            <p className="font-semibold tracking-tight">Productivity</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-muted-foreground hidden sm:block">
              Welcome, {user?.username}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="flex items-center gap-2 text-xs"
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4 sm:gap-6">
          <aside className="md:block">
            <Navigation
              id="primary-nav"
              aria-label="Primary"
              value={section}
              onValueChange={setSection}
              className="md:h-[calc(100vh-6rem)]"
            />
          </aside>

          <main className="min-w-0 pb-24 md:pb-0">
            {section === "daily" && (
              <div className="grid gap-4 sm:gap-6">
                <div className="rounded-lg border border-border bg-card px-4 py-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h1 className="text-lg sm:text-xl font-semibold">Daily Overview</h1>
                      <p className="text-sm text-muted-foreground">Your habits and tasks for today</p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date().toLocaleDateString(undefined, {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                </div>

                <DailyView
                  habits={dailyHabits}
                  todos={todayTodos}
                  stats={dailyStats}
                  onToggleHabit={(id, next) => handleToggleHabitToday(id, next)}
                  onToggleTodo={(id, next) => handleToggleTodoToday(id, next)}
                />
              </div>
            )}

            {section === "todos" && (
              <div className="grid gap-4 sm:gap-6">
                <TodosSection className="w-full" defaultExpanded enableInlineDetail />
              </div>
            )}

            {section === "habits" && (
              <div className="grid gap-4 sm:gap-6">
                <HabitsSection
                  habits={habits}
                  onChange={(next) => setHabits(next)}
                />
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}