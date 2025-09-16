"use client";

import * as React from "react";
import {
  LayoutPanelLeft,
  PanelTop,
  PanelBottomOpen,
  CalendarDays,
  RotateCcw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type NavValue = "daily" | "todos" | "habits";

export interface NavigationProps {
  value: NavValue;
  onValueChange?: (value: NavValue) => void;
  className?: string;
  id?: string;
  "aria-label"?: string;
  selectedDate?: string;
  onDateChange?: (iso: string) => void;
}

const NAV_ITEMS: { value: NavValue; label: string; icon: React.ElementType }[] =
  [
    { value: "daily", label: "Daily View", icon: LayoutPanelLeft },
    { value: "todos", label: "To-Dos", icon: PanelTop },
    { value: "habits", label: "Habits", icon: PanelBottomOpen },
  ];

function toLocalISODate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseISODateLocal(iso: string) {
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  return new Date(y, (m || 1) - 1, d || 1);
}

function todayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return toLocalISODate(d);
}

function formatReadable(iso: string) {
  try {
    const d = parseISODateLocal(iso);
    return d.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function Navigation(props: NavigationProps) {
  const [internalDate, setInternalDate] = React.useState(() => todayISO());
  const {
    value,
    onValueChange,
    className,
    id,
    "aria-label": ariaLabel,
    selectedDate: controlledDate,
    onDateChange,
  } = props;

  const selectedDate = controlledDate ?? internalDate;

  const setSelectedDate = React.useCallback(
    (next: string) => {
      // Clamp to today max
      const max = todayISO();
      const safe = next && next > max ? max : next;
      if (controlledDate !== undefined) {
        onDateChange?.(safe);
      } else {
        setInternalDate(safe);
        onDateChange?.(safe);
      }
    },
    [controlledDate, onDateChange]
  );

  const handleSelect = React.useCallback(
    (next: NavValue) => {
      if (next !== value) {
        onValueChange?.(next);
      }
    },
    [onValueChange, value]
  );

  return (
    <nav
      id={id}
      aria-label={ariaLabel || "Primary"}
      className={["w-full", className].filter(Boolean).join(" ")}
    >
      {/* Desktop / Tablet sidebar */}
      <div className="hidden md:block">
        <Card className="mb-3">
          <CardContent>
            <div className="flex items-center justify-between gap-3">
              <div className="relative w-full max-w-[240px]">
                <CalendarDays className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  aria-label="Select date"
                  className="pl-8"
                  max={todayISO()}
                />
              </div>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {formatReadable(selectedDate)}
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="hidden md:block sticky top-4 z-40">
        <div className="rounded-lg border border-border bg-card shadow-sm">
          <div className="px-3 py-2">
            <p className="px-2 py-1 text-xs font-semibold tracking-wide text-muted-foreground">
              Navigate
            </p>
            <ul className="mt-1 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = value === item.value;
                return (
                  <li key={item.value}>
                    <button
                      type="button"
                      onClick={() => handleSelect(item.value)}
                      aria-current={isActive ? "page" : undefined}
                      className={[
                        "group flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                        "transition-colors outline-none",
                        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "text-foreground hover:bg-muted",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "inline-flex h-8 w-8 items-center justify-center rounded-md",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-foreground/80 group-hover:text-foreground",
                        ].join(" ")}
                        aria-hidden="true"
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-left">
                        {item.label}
                      </span>
                      {isActive && (
                        <span
                          aria-hidden="true"
                          className="ml-auto h-2 w-2 rounded-full bg-primary"
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
      {/* </div> */}

      {/* Mobile: date card and bottom tab bar */}
      <div className="md:hidden">
        {/* Mobile date card */}
        <Card className="mb-3 overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
              <div className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                      <CalendarDays className="h-4 w-4" />
                    </span>
                    <p className="text-xs font-semibold tracking-wide text-muted-foreground">
                      Selected date
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDate(todayISO())}
                    aria-label="Jump to today"
                    className="h-7 px-2"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Today
                  </Button>
                </div>
                <div className="mt-2">
                  <div className="text-base font-medium leading-tight">
                    {formatReadable(selectedDate)}
                  </div>
                </div>
                <div className="mt-3">
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      aria-label="Select date"
                      className="pl-9 h-9"
                      max={todayISO()}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mobile bottom tab bar */}
        <div
          className="rounded-lg border sticky bottom-0 z-50 w-full border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80"
          role="navigation"
          aria-label="Sections"
        >
          <div className="grid grid-cols-3">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = value === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => handleSelect(item.value)}
                  className={[
                    "flex w-full flex-col items-center justify-center gap-1 px-3 py-2",
                    "text-xs font-medium transition-colors outline-none",
                    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  <div className="relative inline-flex h-9 w-9 items-center justify-center rounded-full">
                    <Icon
                      className={[
                        "h-5 w-5 transition-transform",
                        isActive ? "scale-110" : "scale-100",
                      ].join(" ")}
                      aria-hidden="true"
                    />
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className="absolute -top-1 h-1.5 w-6 rounded-full bg-primary"
                      />
                    )}
                  </div>
                  <span className="min-w-0 truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
