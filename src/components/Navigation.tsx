"use client";

import * as React from "react";
import { LayoutPanelLeft, PanelTop, PanelBottomOpen } from "lucide-react";

type NavValue = "daily" | "todos" | "habits";

export interface NavigationProps {
  value: NavValue;
  onValueChange?: (value: NavValue) => void;
  className?: string;
  id?: string;
  "aria-label"?: string;
}

const NAV_ITEMS: { value: NavValue; label: string; icon: React.ElementType }[] = [
  { value: "daily", label: "Daily View", icon: LayoutPanelLeft },
  { value: "todos", label: "To-Dos", icon: PanelTop },
  { value: "habits", label: "Habits", icon: PanelBottomOpen },
];

export default function Navigation(props: NavigationProps) {
  const { value, onValueChange, className, id, "aria-label": ariaLabel } = props;

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
        <div className="sticky top-4 z-40">
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
                            : "text-foreground hover:bg-muted"
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "inline-flex h-8 w-8 items-center justify-center rounded-md",
                            isActive ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground/80 group-hover:text-foreground"
                          ].join(" ")}
                          aria-hidden="true"
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
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
      </div>

      {/* Mobile bottom tab bar */}
      <div className="md:hidden">
        <div className="sticky bottom-0 z-50 w-full border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <ul role="tablist" aria-label="Sections" className="grid grid-cols-3">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = value === item.value;
              return (
                <li key={item.value} className="min-w-0">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => handleSelect(item.value)}
                    className={[
                      "flex w-full flex-col items-center justify-center gap-1 px-3 py-2",
                      "text-xs font-medium transition-colors outline-none",
                      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    ].join(" ")}
                  >
                    <div className="relative inline-flex h-9 w-9 items-center justify-center rounded-full">
                      <Icon
                        className={[
                          "h-5 w-5 transition-transform",
                          isActive ? "scale-110" : "scale-100"
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
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
}