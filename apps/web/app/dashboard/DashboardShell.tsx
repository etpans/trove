"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import LogoMark from "../components/brand/LogoMark";
import "./dashboard.css";

export type DashboardSection =
  | "overview"
  | "search"
  | "classes"
  | "courses"
  | "students"
  | "notes";

type DashboardShellProps = {
  section: DashboardSection;
  onNavigate: (section: DashboardSection) => void;
  onCreateClass: () => void;
  onCreateStudent: () => void;
  onCreateNote: () => void;
  children: ReactNode;
  header: ReactNode;
  classCount: number;
  studentCount: number;
  noteCount: number;
};

const navigation: { id: DashboardSection; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "search", label: "Search" },
  { id: "classes", label: "Classes" },
  { id: "courses", label: "Courses" },
  { id: "students", label: "Students" },
  { id: "notes", label: "Notes" },
];

function NavigationIcon({ section }: { section: DashboardSection }) {
  const paths: Record<DashboardSection, ReactNode> = {
    overview: <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" />,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
    classes: <><rect x="3" y="4" width="18" height="14" rx="2" /><path d="M8 22h8M12 18v4M7 9h10M7 13h6" /></>,
    courses: <><path d="M12 6C9 3 5 3 2 4v15c4-1 7 0 10 2 3-2 6-3 10-2V4c-3-1-7-1-10 2ZM12 6v15" /></>,
    students: <><circle cx="9" cy="8" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M17 15a5 5 0 0 1 4 5" /></>,
    notes: <><path d="M14 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V10ZM14 3v7h7M7 14h10M7 17h6" /></>,
  };

  return <svg aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">{paths[section]}</svg>;
}

export default function DashboardShell({
  section,
  onNavigate,
  onCreateClass,
  onCreateStudent,
  onCreateNote,
  children,
  header,
  classCount,
  studentCount,
  noteCount,
}: DashboardShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const counts: Partial<Record<DashboardSection, number>> = {
    classes: classCount,
    students: studentCount,
    notes: noteCount,
  };

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    const menuButton = menuButtonRef.current;
    document.body.style.overflow = "hidden";
    sidebarRef.current?.querySelector<HTMLButtonElement>("button")?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuOpen(false);
      }
      if (event.key !== "Tab") return;
      const buttons = sidebarRef.current?.querySelectorAll<HTMLButtonElement>("button:not([disabled])");
      if (!buttons?.length) return;
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const handleResize = () => {
      if (desktopQuery.matches) setMenuOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    desktopQuery.addEventListener("change", handleResize);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      desktopQuery.removeEventListener("change", handleResize);
      menuButton?.focus();
    };
  }, [menuOpen]);

  function performAction(action: () => void) {
    setMenuOpen(false);
    action();
  }

  return (
    <div className={`dashboard-shell${menuOpen ? " dashboard-menu-open" : ""}`}>
      <a className="dashboard-skip-link" href="#dashboard-main">Skip to content</a>
      {menuOpen ? <button aria-label="Close navigation" className="dashboard-sidebar-backdrop" onClick={() => setMenuOpen(false)} type="button" tabIndex={-1} /> : null}
      <aside aria-label="Workspace navigation" aria-modal={menuOpen ? true : undefined} className="dashboard-sidebar" id="dashboard-sidebar" ref={sidebarRef} role={menuOpen ? "dialog" : undefined}>
        <div className="dashboard-brand-row">
          <button className="dashboard-brand" onClick={() => performAction(() => onNavigate("overview"))} type="button" aria-label="Trove overview">
            <LogoMark />
            <span>Trove<span className="dashboard-brand-dot">.</span></span>
          </button>
          <button aria-label="Close navigation" className="dashboard-mobile-close" onClick={() => setMenuOpen(false)} type="button">×</button>
        </div>
        <div className="dashboard-workspace-label"><span className="dashboard-workspace-avatar">T</span><div><strong>My workspace</strong><span>Your teaching companion</span></div></div>
        <div className="dashboard-nav-label">WORKSPACE</div>
        <nav aria-label="Dashboard">
          {navigation.map((item) => (
            <button aria-current={section === item.id ? "page" : undefined} className="dashboard-nav-item" key={item.id} onClick={() => performAction(() => onNavigate(item.id))} type="button">
              <NavigationIcon section={item.id} />
              <span>{item.label}</span>
              {counts[item.id] !== undefined ? <span className="dashboard-nav-count">{counts[item.id]}</span> : null}
            </button>
          ))}
        </nav>
        <div className="dashboard-sidebar-divider" />
        <div className="dashboard-nav-label">QUICK ADD</div>
        <div className="dashboard-create-actions">
          <button className="dashboard-create-primary" onClick={() => performAction(onCreateClass)} type="button"><span aria-hidden="true">+</span> Add Class</button>
          <button onClick={() => performAction(onCreateStudent)} type="button"><span aria-hidden="true">+</span> Add Student</button>
          <button onClick={() => performAction(onCreateNote)} type="button"><span aria-hidden="true">+</span> Add Note</button>
        </div>
        <div className="dashboard-sidebar-footer"><span className="dashboard-status-dot" /><span>A little more organized.<br /><strong>A lot more present.</strong></span></div>
      </aside>
      <div className="dashboard-main-column" inert={menuOpen}>
        <div className="dashboard-topbar">
          <button aria-controls="dashboard-sidebar" aria-expanded={menuOpen} aria-label="Open navigation" className="dashboard-menu-button" onClick={() => setMenuOpen(true)} ref={menuButtonRef} type="button"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 6h16M4 12h16M4 18h16" /></svg></button>
          <div className="dashboard-header-slot">{header}</div>
        </div>
        <main className="dashboard-content" id="dashboard-main" tabIndex={-1}>{children}</main>
      </div>
    </div>
  );
}
