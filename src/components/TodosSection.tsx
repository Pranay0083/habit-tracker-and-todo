"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ListTodo, TableOfContents } from "lucide-react";
import { toast } from "sonner";
import { DataService } from "@/lib/data";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

type Priority = "low" | "medium" | "high";

export type Task = {
  id: string;
  title: string;
  notes?: string;
  dueDate?: string; // ISO date
  priority: Priority;
  completed: boolean;
  children?: Task[];
};

type Filter = {
  priority: "all" | Priority;
  status: "all" | "open" | "done";
};

type SortBy = "dueAsc" | "dueDesc" | "priority" | "title";

export interface TodosSectionProps {
  className?: string;
  initialTasks?: Task[];
  defaultExpanded?: boolean;
  enableInlineDetail?: boolean; // if true, clicking a task shows inline detail panel
}

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

function formatDate(iso?: string) {
  if (!iso) return "No due date";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString();
  } catch {
    return "Invalid date";
  }
}

function priorityBadge(priority: Priority) {
  // Use design tokens subtly: color text with tokens and soft bg for contrast
  switch (priority) {
    case "high":
      return (
        <Badge className="bg-destructive/10 text-destructive border border-destructive/20">
          High
        </Badge>
      );
    case "medium":
      return (
        <Badge className="bg-chart-2/10 text-chart-2 border border-chart-2/20">
          Medium
        </Badge>
      );
    case "low":
      return (
        <Badge className="bg-accent text-accent-foreground border border-accent/50">
          Low
        </Badge>
      );
  }
}

function countDescendants(task: Task): { total: number; completed: number } {
  if (!task.children || task.children.length === 0) {
    return { total: 0, completed: 0 };
  }
  let total = 0;
  let completed = 0;
  const stack = [...(task.children || [])];
  while (stack.length) {
    const t = stack.pop()!;
    total += 1;
    if (t.completed) completed += 1;
    if (t.children && t.children.length) stack.push(...t.children);
  }
  return { total, completed };
}

function computeProgress(task: Task): number {
  const { total, completed } = countDescendants(task);
  if (total === 0) return task.completed ? 100 : 0;
  return Math.round((completed / total) * 100);
}

function cloneTasks(tasks: Task[]): Task[] {
  return tasks.map((t) => ({
    ...t,
    children: t.children ? cloneTasks(t.children) : [],
  }));
}

function updateTaskById(tasks: Task[], id: string, updater: (t: Task) => Task): Task[] {
  return tasks.map((t) => {
    if (t.id === id) {
      return updater({ ...t, children: t.children ? [...t.children] : [] });
    }
    if (t.children && t.children.length) {
      return { ...t, children: updateTaskById(t.children, id, updater) };
    }
    return t;
  });
}

function deleteTaskById(tasks: Task[], id: string): Task[] {
  const result: Task[] = [];
  for (const t of tasks) {
    if (t.id === id) continue;
    const children = t.children ? deleteTaskById(t.children, id) : [];
    result.push({ ...t, children });
  }
  return result;
}

function findParentAndIndex(tasks: Task[], id: string, parentId: string | null = null): { parentId: string | null; index: number } | null {
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    if (t.id === id) {
      return { parentId, index: i };
    }
    if (t.children && t.children.length) {
      const res = findParentAndIndex(t.children, id, t.id);
      if (res) return res;
    }
  }
  return null;
}

function getChildrenByParentId(tasks: Task[], parentId: string | null): Task[] | null {
  if (parentId === null) return tasks;
  const stack: Task[] = [...tasks];
  while (stack.length) {
    const t = stack.pop()!;
    if (t.id === parentId) return t.children || [];
    if (t.children && t.children.length) stack.push(...t.children);
  }
  return null;
}

function reorderWithinSameLevel(tasks: Task[], parentId: string | null, fromIndex: number, toIndex: number): Task[] {
  const clone = cloneTasks(tasks);
  const siblings = getChildrenByParentId(clone, parentId);
  if (!siblings) return tasks;
  const [moved] = siblings.splice(fromIndex, 1);
  siblings.splice(toIndex, 0, moved);
  return clone;
}

function filterTree(tasks: Task[], search: string, filter: Filter): Task[] {
  const q = search.trim().toLowerCase();
  function matches(t: Task) {
    const text = (t.title + " " + (t.notes || "")).toLowerCase();
    const matchesQuery = q.length === 0 || text.includes(q);
    const matchesPriority = filter.priority === "all" || t.priority === filter.priority;
    const matchesStatus =
      filter.status === "all" ||
      (filter.status === "done" ? t.completed : !t.completed);
    return matchesQuery && matchesPriority && matchesStatus;
  }
  function recur(list: Task[]): Task[] {
    const res: Task[] = [];
    for (const t of list) {
      const childRes = t.children && t.children.length ? recur(t.children) : [];
      if (matches(t) || childRes.length > 0) {
        res.push({ ...t, children: childRes });
      }
    }
    return res;
  }
  return recur(tasks);
}

function sortTasks(tasks: Task[], sortBy: SortBy): Task[] {
  function priorityWeight(p: Priority) {
    return p === "high" ? 0 : p === "medium" ? 1 : 2;
  }
  function recur(list: Task[]): Task[] {
    const arr = list.map((t) => ({
      ...t,
      children: t.children ? recur(t.children) : [],
    }));
    arr.sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "priority") return priorityWeight(a.priority) - priorityWeight(b.priority);
      if (sortBy === "dueAsc") {
        const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return ad - bd;
      }
      if (sortBy === "dueDesc") {
        const ad = a.dueDate ? new Date(a.dueDate).getTime() : -Infinity;
        const bd = b.dueDate ? new Date(b.dueDate).getTime() : -Infinity;
        return bd - ad;
      }
      return 0;
    });
    return arr;
  }
  return recur(tasks);
}

export default function TodosSection({
  className,
  initialTasks,
  defaultExpanded = true,
  enableInlineDetail = false,
}: TodosSectionProps) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>(
    initialTasks && initialTasks.length
      ? cloneTasks(initialTasks)
      : []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Filter>({ priority: "all", status: "all" });
  const [sortBy, setSortBy] = useState<SortBy>("dueAsc");
  const [search, setSearch] = useState("");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);

  // Load todos from backend
  useEffect(() => {
    const loadTodos = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        const userTodos = await DataService.getUserTodos(user.id);
        
        // Convert backend todos to the component's Task format
        const convertedTasks: Task[] = userTodos.map(todo => ({
          id: todo.id,
          title: todo.title,
          notes: '', // Backend doesn't have notes field yet
          priority: todo.priority,
          completed: todo.completed,
          children: []
        }));
        
        setTasks(convertedTasks);
      } catch (error) {
        console.error('Error loading todos:', error);
        toast.error('Failed to load todos');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTodos();
  }, [user]);

  // Initialize expanded state
  useEffect(() => {
    if (defaultExpanded) {
      const s = new Set<string>();
      const stack = [...tasks];
      while (stack.length) {
        const t = stack.pop()!;
        s.add(t.id);
        if (t.children && t.children.length) stack.push(...t.children);
      }
      setExpanded(s);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Derived view based on filters and sorting
  const viewTasks = useMemo(() => {
    const filtered = filterTree(tasks, search, filter);
    const sorted = sortTasks(filtered, sortBy);
    return sorted;
  }, [tasks, search, filter, sortBy]);

  const anyTasks = tasks.length > 0;

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const onToggleComplete = useCallback(async (id: string, checked: boolean) => {
    if (!user) return;
    
    try {
      // Update backend
      await DataService.updateTodo(user.id, id, { completed: checked });
      
      // Update local state
      setTasks((prev) =>
        updateTaskById(prev, id, (t) => {
          return { ...t, completed: checked };
        })
      );
    } catch (error) {
      console.error('Error updating todo:', error);
      toast.error('Failed to update task');
    }
  }, [user]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id?: string }>({ open: false });

  const [formState, setFormState] = useState<{
    id?: string;
    title: string;
    dueDate?: string;
    priority: Priority;
    notes?: string;
    parentId: string | null;
  }>({
    title: "",
    priority: "medium",
    notes: "",
    parentId: null,
  });

  const resetForm = () =>
    setFormState({
      title: "",
      priority: "medium",
      notes: "",
      parentId: null,
    });

  const openCreate = (parentId: string | null = null) => {
    resetForm();
    setFormState((s) => ({ ...s, parentId }));
    setCreateOpen(true);
  };

  const openEdit = (t: Task) => {
    setFormState({
      id: t.id,
      title: t.title,
      dueDate: t.dueDate,
      priority: t.priority,
      notes: t.notes,
      parentId: null,
    });
    setEditOpen(true);
  };

  const handleCreate = async () => {
    if (!formState.title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    
    if (!user) {
      toast.error("User not authenticated");
      return;
    }

    try {
      setLoadingAction("create");
      
      let newTask: Task;
      
      if (formState.parentId === null) {
        // Create top-level todo in backend
        const createdTodo = await DataService.createTodo({
          title: formState.title.trim(),
          priority: formState.priority
        });
        
        // Convert to Task format
        newTask = {
          id: createdTodo.id,
          title: createdTodo.title,
          notes: "",
          priority: createdTodo.priority,
          completed: createdTodo.completed,
          children: [],
        };
        
        setTasks((prev) => [...prev, newTask]);
      } else {
        // Create subtask locally (not persisted to backend yet)
        newTask = {
          id: `subtask_${Math.random().toString(36).slice(2, 9)}`,
          title: formState.title.trim(),
          notes: formState.notes?.trim() || "",
          priority: formState.priority,
          completed: false,
          children: [],
        };
        
        // Insert into parent children
        setTasks((prev) => {
          return updateTaskById(prev, formState.parentId!, (t) => ({
            ...t,
            children: [...(t.children || []), newTask],
          }));
        });
      }
      setCreateOpen(false);
      resetForm();
      toast.success("Task created");
    } catch (error) {
      console.error('Error creating todo:', error);
      toast.error("Failed to create task");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleEdit = async () => {
    if (!formState.id) return;
    if (!formState.title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    setLoadingAction("edit");
    await new Promise((r) => setTimeout(r, 400));
    setTasks((prev) =>
      updateTaskById(prev, formState.id!, (t) => ({
        ...t,
        title: formState.title.trim(),
        notes: formState.notes || "",
        dueDate: formState.dueDate || undefined,
        priority: formState.priority,
      }))
    );
    setLoadingAction(null);
    setEditOpen(false);
    toast.success("Task updated");
  };

  const requestDelete = (id: string) => setDeleteConfirm({ open: true, id });

  const handleDelete = async () => {
    if (!deleteConfirm.id || !user) return;
    
    try {
      setLoadingAction("delete");
      
      // Delete from backend
      await DataService.deleteTodo(deleteConfirm.id);
      
      // Update local state
      setTasks((prev) => deleteTaskById(prev, deleteConfirm.id!));
      
      setDeleteConfirm({ open: false, id: undefined });
      toast.success("Task deleted");
    } catch (error) {
      console.error('Error deleting todo:', error);
      toast.error("Failed to delete task");
    } finally {
      setLoadingAction(null);
    }
  };

  const [dragState, setDragState] = useState<{ dragId?: string; parentId: string | null; index: number } | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string, parentId: string | null, index: number) => {
    setDragState({ dragId: id, parentId, index });
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetParentId: string | null, targetIndex: number) => {
    e.preventDefault();
    if (!dragState || dragState.dragId == null) return;
    // Only allow within same level
    if (dragState.parentId !== targetParentId) return;
    if (dragState.index === targetIndex) return;
    setTasks((prev) => reorderWithinSameLevel(prev, targetParentId, dragState.index, targetIndex));
    setDragState(null);
  };

  // Inline detail for current selected
  const selectedTask = useMemo(() => {
    if (!detailTaskId) return null;
    const stack = [...tasks];
    while (stack.length) {
      const t = stack.pop()!;
      if (t.id === detailTaskId) return t;
      if (t.children && t.children.length) stack.push(...t.children);
    }
    return null;
  }, [detailTaskId, tasks]);

  const Header = (
    <div className="w-full max-w-full">
      <div className="flex w-full items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ListTodo className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg md:text-xl font-semibold tracking-tight text-foreground truncate">
              To-Dos
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">Organize tasks with nested subtasks, progress, and filters</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" className="bg-secondary text-foreground hover:bg-secondary/80" onClick={() => openCreate(null)}>
            New task
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-input">
                <TableOfContents className="mr-2 h-4 w-4" aria-hidden="true" />
                Options
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[220px]">
              <DropdownMenuLabel>Quick actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setExpanded(new Set())}>
                Collapse all
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                const s = new Set<string>();
                const stack = [...tasks];
                while (stack.length) {
                  const t = stack.pop()!;
                  s.add(t.id);
                  if (t.children && t.children.length) stack.push(...t.children);
                }
                setExpanded(s);
              }}>
                Expand all
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {
                setFilter({ priority: "all", status: "all" });
                setSortBy("dueAsc");
                setSearch("");
                toast.message("Filters reset");
              }}>
                Reset filters
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="h-9 bg-background"
            aria-label="Search tasks"
          />
        </div>
        <div className="rounded-md border border-border bg-card px-3 py-2">
          <Label htmlFor="filter-priority" className="sr-only">Priority</Label>
          <Select
            onValueChange={(v: Priority | "all") => setFilter((f) => ({ ...f, priority: v }))}
            value={filter.priority}
          >
            <SelectTrigger id="filter-priority" className="h-9">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Priority</SelectLabel>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="rounded-md border border-border bg-card px-3 py-2">
          <Label htmlFor="filter-status" className="sr-only">Status</Label>
          <Select
            onValueChange={(v: "all" | "open" | "done") => setFilter((f) => ({ ...f, status: v }))}
            value={filter.status}
          >
            <SelectTrigger id="filter-status" className="h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Status</SelectLabel>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="rounded-md border border-border bg-card px-3 py-2">
          <Label htmlFor="sort-by" className="sr-only">Sort by</Label>
          <Select
            onValueChange={(v: SortBy) => setSortBy(v)}
            value={sortBy}
          >
            <SelectTrigger id="sort-by" className="h-9">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Sort by</SelectLabel>
                <SelectItem value="dueAsc">Due date ↑</SelectItem>
                <SelectItem value="dueDesc">Due date ↓</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="title">Title</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  function TaskRow({
    task,
    depth,
    parentId,
    index,
  }: {
    task: Task;
    depth: number;
    parentId: string | null;
    index: number;
  }) {
    const hasChildren = !!(task.children && task.children.length);
    const isExpanded = expanded.has(task.id);
    const progress = computeProgress(task);

    return (
      <div
        className="group relative w-full max-w-full"
        draggable
        onDragStart={(e) => handleDragStart(e, task.id, parentId, index)}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, parentId, index)}
        aria-roledescription="Draggable task"
      >
        <div
          className="flex w-full items-start gap-2 rounded-md border border-transparent px-2 py-1.5 hover:border-border hover:bg-secondary transition-colors"
          style={{ paddingLeft: Math.min(depth * 16, 64) + 8 }}
        >
          <button
            type="button"
            aria-label={isExpanded ? "Collapse task" : "Expand task"}
            onClick={() => hasChildren && toggleExpand(task.id)}
            className={`mt-1 inline-flex h-6 w-6 items-center justify-center rounded-md ${hasChildren ? "text-muted-foreground hover:text-foreground" : "opacity-0 pointer-events-none"} transition-colors`}
          >
            <TableOfContents className={`h-4 w-4 ${isExpanded ? "rotate-90 transition-transform" : "transition-transform"}`} />
          </button>

          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="mt-0.5">
              <Checkbox
                checked={task.completed}
                onCheckedChange={(v) => onToggleComplete(task.id, Boolean(v))}
                aria-label={task.completed ? "Mark as incomplete" : "Mark as complete"}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`truncate break-words text-sm sm:text-base font-medium ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {task.title}
                    </p>
                    {priorityBadge(task.priority)}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">Due: {formatDate(task.dueDate)}</span>
                    {hasChildren && (
                      <span className="text-xs text-muted-foreground">• {task.children!.length} subtasks</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {hasChildren && (
                    <div className="hidden sm:block w-24">
                      <Progress value={progress} className="h-2" aria-label="Subtask progress" />
                    </div>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-foreground">
                        •••
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[180px]">
                      <DropdownMenuLabel>Task</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => openCreate(task.id)}>Add subtask</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEdit(task)}>Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        enableInlineDetail ? setDetailTaskId(task.id) : setEditOpen(true);
                        if (!enableInlineDetail) openEdit(task);
                      }}>
                        View details
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => requestDelete(task.id)}>
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {hasChildren && (
                <div className={`${isExpanded ? "mt-2" : "hidden"}`}>
                  {task.children!.map((child, i) => (
                    <TaskRow
                      key={child.id}
                      task={child}
                      depth={depth + 1}
                      parentId={task.id}
                      index={i}
                    />
                  ))}
                </div>
              )}

              {!hasChildren && task.notes && (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground break-words">
                  {task.notes}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className={`w-full max-w-full rounded-lg border border-border bg-card p-4 sm:p-6 ${className || ""}`}>
      {Header}

      {!anyTasks && (
        <div className="mt-6 rounded-lg border border-dashed border-input bg-secondary p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ListTodo className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="text-base sm:text-lg font-semibold">Start your first task</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Create tasks and nest subtasks to break down work. Track progress automatically as you complete items.
          </p>
          <div className="mt-4 flex justify-center">
            <Button onClick={() => openCreate(null)} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Create task
            </Button>
          </div>
        </div>
      )}

      {anyTasks && (
        <div className="mt-4">
          <div role="tree" aria-label="Tasks" className="w-full max-w-full">
            {viewTasks.map((t, i) => (
              <TaskRow key={t.id} task={t} depth={0} parentId={null} index={i} />
            ))}
          </div>
        </div>
      )}

      {enableInlineDetail && selectedTask && (
        <div className="mt-6 rounded-lg border border-border bg-popover p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-semibold">Task details</h4>
            <Button variant="ghost" onClick={() => setDetailTaskId(null)} className="h-8">
              Close
            </Button>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-border bg-card p-3">
              <Label className="text-xs text-muted-foreground">Title</Label>
              <p className="mt-1 break-words">{selectedTask.title}</p>
            </div>
            <div className="rounded-md border border-border bg-card p-3">
              <Label className="text-xs text-muted-foreground">Due date</Label>
              <p className="mt-1">{formatDate(selectedTask.dueDate)}</p>
            </div>
            <div className="rounded-md border border-border bg-card p-3">
              <Label className="text-xs text-muted-foreground">Priority</Label>
              <div className="mt-1">{priorityBadge(selectedTask.priority)}</div>
            </div>
            <div className="rounded-md border border-border bg-card p-3">
              <Label className="text-xs text-muted-foreground">Progress</Label>
              <div className="mt-2 w-full">
                <Progress value={computeProgress(selectedTask)} className="h-2" />
              </div>
            </div>
            <div className="sm:col-span-2 rounded-md border border-border bg-card p-3">
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <p className="mt-1 whitespace-pre-wrap break-words">{selectedTask.notes || "—"}</p>
            </div>
          </div>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={(o) => { if (!loadingAction) setCreateOpen(o); }}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Create task</DialogTitle>
            <DialogDescription>Add a new task with optional due date, priority, and notes.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g., Design onboarding flow"
                value={formState.title}
                onChange={(e) => setFormState((s) => ({ ...s, title: e.target.value }))}
                className="bg-background"
              />
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2 sm:items-center sm:gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="due">Due date</Label>
                <Input
                  id="due"
                  type="date"
                  value={formState.dueDate || ""}
                  onChange={(e) => setFormState((s) => ({ ...s, dueDate: e.target.value }))}
                  className="bg-background"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formState.priority}
                  onValueChange={(v: Priority) => setFormState((s) => ({ ...s, priority: v }))}
                >
                  <SelectTrigger id="priority">
                    <SelectValue placeholder="Select a priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Priority</SelectLabel>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional context..."
                value={formState.notes}
                onChange={(e) => setFormState((s) => ({ ...s, notes: e.target.value }))}
                className="min-h-[96px] bg-background"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={loadingAction === "create"}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={loadingAction === "create"}>
              {loadingAction === "create" ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={(o) => { if (!loadingAction) setEditOpen(o); }}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Edit task</DialogTitle>
            <DialogDescription>Update task details and save your changes.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={formState.title}
                onChange={(e) => setFormState((s) => ({ ...s, title: e.target.value }))}
                className="bg-background"
              />
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2 sm:items-center sm:gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="edit-due">Due date</Label>
                <Input
                  id="edit-due"
                  type="date"
                  value={formState.dueDate || ""}
                  onChange={(e) => setFormState((s) => ({ ...s, dueDate: e.target.value }))}
                  className="bg-background"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="edit-priority">Priority</Label>
                <Select
                  value={formState.priority}
                  onValueChange={(v: Priority) => setFormState((s) => ({ ...s, priority: v }))}
                >
                  <SelectTrigger id="edit-priority">
                    <SelectValue placeholder="Select a priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Priority</SelectLabel>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={formState.notes}
                onChange={(e) => setFormState((s) => ({ ...s, notes: e.target.value }))}
                className="min-h-[96px] bg-background"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={loadingAction === "edit"}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={loadingAction === "edit"}>
              {loadingAction === "edit" ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirm.open} onOpenChange={(o) => setDeleteConfirm((s) => ({ ...s, open: o }))}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete task</DialogTitle>
            <DialogDescription>This action cannot be undone. This will permanently delete the task and all of its subtasks.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm({ open: false })} disabled={loadingAction === "delete"}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loadingAction === "delete"}>
              {loadingAction === "delete" ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}