// Friendly guide: this module (navigation) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import type { Role, SessionUser } from "../types/portal";

export type NavigationSection =
  | "Main"
  | "Documents"
  | "Compliance"
  | "Operations"
  | "Management"
  | "Configuration";

export type NavigationIcon =
  | "dashboard"
  | "packs"
  | "requests"
  | "documents"
  | "messages"
  | "compliance"
  | "notifications"
  | "settings"
  | "portfolio"
  | "review"
  | "followups"
  | "exceptions"
  | "clients"
  | "accountants"
  | "users"
  | "assignments"
  | "templates"
  | "deadlines"
  | "policies"
  | "exceptions";

export interface NavigationItem {
  label: string;
  to: string;
  description: string;
  section: NavigationSection;
  icon: NavigationIcon;
  badge?: string;
}

export const navigationByRole: Record<Role, NavigationItem[]> = {
  client: [
    {
      label: "Dashboard",
      to: "/client/dashboard",
      description: "Track month packs, alerts, and latest records",
      section: "Main",
      icon: "dashboard",
    },
    {
      label: "Monthly Packs",
      to: "/client/packs",
      description: "Work through required monthly checklist slots",
      section: "Main",
      icon: "packs",
    },
    {
      label: "Inbox",
      to: "/client/inbox",
      description: "Track accountant requests, clarifications, and follow-ups",
      section: "Main",
      icon: "requests",
    },
    {
      label: "Documents",
      to: "/client/documents",
      description: "Search documents, invoices, and compliance records",
      section: "Documents",
      icon: "documents",
    },
    {
      label: "Compliance Centre",
      to: "/client/compliance",
      description: "Track expiries, reminders, and retained records",
      section: "Compliance",
      icon: "compliance",
    },
  ],
  accountant: [
    {
      label: "Dashboard",
      to: "/firm/dashboard",
      description: "Monitor portfolio risk and work-in-progress",
      section: "Main",
      icon: "dashboard",
    },
    {
      label: "Clients",
      to: "/firm/clients",
      description: "Open assigned client workspaces",
      section: "Main",
      icon: "clients",
    },
    {
      label: "Work Queue",
      to: "/firm/review",
      description: "Triage cross-client review workload",
      section: "Main",
      icon: "review",
    },
    {
      label: "Inbox",
      to: "/firm/inbox",
      description: "Handle request threads, clarifications, and follow-ups",
      section: "Main",
      icon: "requests",
    },
    {
      label: "Documents",
      to: "/firm/documents",
      description: "Search all records across assigned clients and statuses",
      section: "Documents",
      icon: "documents",
    },
    {
      label: "Filing Register",
      to: "/firm/filing",
      description: "Read-only register of accountant-accepted filed records",
      section: "Documents",
      icon: "documents",
    },
    {
      label: "Compliance Centre",
      to: "/firm/compliance",
      description: "See the broader compliance centre view",
      section: "Compliance",
      icon: "compliance",
    },
    {
      label: "Compliance Calendar",
      to: "/firm/compliance/calendar",
      description: "Track filings and expiring compliance deadlines",
      section: "Compliance",
      icon: "deadlines",
    },
    {
      label: "Exceptions Queue",
      to: "/firm/exceptions",
      description: "Operational inbox for overdue requests and compliance exceptions",
      section: "Operations",
      icon: "exceptions",
    },
    {
      label: "Activity Feed",
      to: "/firm/activity",
      description: "Unified timeline across requests, reviews, and compliance",
      section: "Operations",
      icon: "notifications",
    },
  ],
  admin: [
    {
      label: "Dashboard",
      to: "/admin/dashboard",
      description: "Track firm health, workload, and governance risks",
      section: "Management",
      icon: "dashboard",
    },
    {
      label: "System Settings",
      to: "/admin/system-settings",
      description: "Manage users, clients, rules, and firm controls",
      section: "Management",
      icon: "settings",
    },
    {
      label: "Assignments",
      to: "/admin/assignments",
      description: "Assign accountants to clients",
      section: "Management",
      icon: "assignments",
    },
    {
      label: "Accountants",
      to: "/admin/accountants",
      description: "Review firm worker coverage and capacity",
      section: "Management",
      icon: "accountants",
    },
    {
      label: "Request SLA Rules",
      to: "/admin/request-state-machine",
      description: "Manage request state transitions, reminders, and escalations",
      section: "Configuration",
      icon: "policies",
    },
  ],
};

// Component flow: gather data first, then render a focused UI state.
export function getNavigationForUser(user: SessionUser | null | undefined) {
  if (!user) {
    return [];
  }

  return navigationByRole[user.role];
}
