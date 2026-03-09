import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AppShellProps = {
  children: ReactNode;
};

const workspaceItems = [
  { label: "Inbox", count: "22", active: true },
  { label: "My issues" },
  { label: "Projects" },
] as const;

const personalItems = ["Active", "Backlog", "Done"] as const;

function IconButton({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}): React.ReactElement {
  return (
    <button
      type="button"
      aria-label={label}
      className="focus-ring inline-flex h-7 w-7 items-center justify-center rounded-md border border-border/40 bg-card/40 text-muted transition-colors hover:bg-card/70 hover:text-foreground"
    >
      {children}
    </button>
  );
}

function DotIcon(): React.ReactElement {
  return <span className="inline-flex h-2 w-2 rounded-full bg-primary" />;
}

export default function AppShell({ children }: AppShellProps): React.ReactElement {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="flex items-center gap-2 px-1">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-primary/20">
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-primary" aria-hidden="true">
                <circle cx="8" cy="8" r="6" fill="currentColor" />
              </svg>
            </span>
            <span className="text-sm font-medium text-sidebar-foreground">Linear Clone</span>
          </div>

          <div className="flex items-center gap-1">
            <IconButton label="Create item">
              <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </IconButton>
            <IconButton label="Toggle panel">
              <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
                <path d="M3 4h10M3 8h10M3 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </IconButton>
          </div>
        </div>

        <div>
          <p className="nav-section-title">Workspace</p>
          <div className="space-y-1">
            {workspaceItems.map((item) => (
              <button
                key={item.label}
                type="button"
                className={cn("focus-ring nav-item w-full", item.active && "nav-item-active")}
              >
                <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-muted" aria-hidden="true">
                  <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.25" fill="none" />
                </svg>
                <span className="flex-1 text-left">{item.label}</span>
                {item.count ? <span className="pill">{item.count}</span> : null}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="nav-section-title">Personal</p>
          <div className="space-y-1">
            {personalItems.map((item) => (
              <button key={item} type="button" className="focus-ring nav-item w-full">
                <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-muted" aria-hidden="true">
                  <rect x="3" y="3" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.25" fill="none" />
                </svg>
                <span className="flex-1 text-left">{item}</span>
              </button>
            ))}
          </div>
        </div>

        <button type="button" className="focus-ring nav-item mt-auto w-full">
          <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-muted" aria-hidden="true">
            <path
              d="M8 2.75a5.25 5.25 0 1 1 0 10.5a5.25 5.25 0 0 1 0-10.5zm0 2v1.2m0 4.1v1.2m2.35-3.25h1.2m-7.1 0h1.2"
              stroke="currentColor"
              strokeWidth="1.2"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
          <span className="flex-1 text-left">Settings</span>
        </button>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-col overflow-hidden">
        <header className="header">
          <div className="flex items-center gap-2">
            <DotIcon />
            <h1 className="text-sm font-medium text-foreground">Personal</h1>
          </div>

          <div className="header-actions">
            <IconButton label="Search">
              <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
                <circle cx="7" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" fill="none" />
                <path d="M10.5 10.5L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </IconButton>
            <IconButton label="Notifications">
              <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
                <path
                  d="M8 2.5a3 3 0 0 0-3 3V7l-1 2.2h8L11 7V5.5a3 3 0 0 0-3-3z"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  fill="none"
                  strokeLinejoin="round"
                />
                <path d="M6.5 12.3c.2.7.8 1.2 1.5 1.2s1.3-.5 1.5-1.2" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
              </svg>
            </IconButton>

            <div className="inline-flex items-center rounded-md border border-border/40 bg-card/40 p-0.5">
              <button type="button" className="focus-ring rounded px-2 py-1 text-xs font-medium text-muted transition-colors hover:text-foreground">
                Dark
              </button>
              <button type="button" className="focus-ring rounded bg-card/60 px-2 py-1 text-xs font-medium text-foreground">
                Light
              </button>
              <button type="button" className="focus-ring rounded px-2 py-1 text-xs font-medium text-muted transition-colors hover:text-foreground">
                Blue
              </button>
            </div>
          </div>
        </header>

        <main className="main overflow-auto">{children}</main>
      </div>
    </div>
  );
}
