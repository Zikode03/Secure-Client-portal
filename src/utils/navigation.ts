// Friendly guide: this module (navigation) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import type { Role, SessionUser } from "../types/portal";

export type NavigationSection =
  | "Main"
  | "Documents"
  | "Compliance"
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
  | "policies";

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
  ],
  admin: [
    {
      label: "Admin Dashboard",
      to: "/firm/dashboard",
      description: "Control firm health, risk, access, and workload",
      section: "Main",
      icon: "dashboard",
    },
    {
      label: "Users & Access",
      to: "/firm/admin/users",
      description: "Create users, change roles, and control account access",
      section: "Management",
      icon: "users",
    },
    {
      label: "Clients",
      to: "/firm/clients",
      description: "Manage client ownership, status, and risk",
      section: "Management",
      icon: "clients",
    },
    {
      label: "Accountants",
      to: "/firm/admin/accountants",
      description: "Manage accountant capacity and workload",
      section: "Management",
      icon: "accountants",
    },
    {
      label: "Assignments",
      to: "/firm/admin/assignments",
      description: "Assign and rebalance accountants across clients",
      section: "Management",
      icon: "assignments",
    },
    {
      label: "Work Queue",
      to: "/firm/review",
      description: "Oversee the full firm review workload",
      section: "Main",
      icon: "review",
    },
    {
      label: "Documents",
      to: "/firm/documents",
      description: "Search records across the full firm",
      section: "Documents",
      icon: "documents",
    },
    {
      label: "Filing Register",
      to: "/firm/filing",
      description: "Monitor accepted and filed records",
      section: "Documents",
      icon: "documents",
    },
    {
      label: "Compliance Centre",
      to: "/firm/compliance",
      description: "Review firm-wide compliance status",
      section: "Compliance",
      icon: "compliance",
    },
    {
      label: "Compliance Calendar",
      to: "/firm/compliance/calendar",
      description: "Track firm deadlines and expiries",
      section: "Compliance",
      icon: "deadlines",
    },
    {
      label: "Request SLA Rules",
      to: "/firm/admin/request-state-machine",
      description: "Control request transitions, reminders, and escalations",
      section: "Configuration",
      icon: "policies",
    },
    {
      label: "System Settings",
      to: "/firm/admin/system-settings",
      description: "Manage firm rules, templates, and system controls",
      section: "Configuration",
      icon: "settings",
    },
  ],
};

export function getNavigationForUser(user: SessionUser | null | undefined) {
  if (!user) return [];
  return navigationByRole[user.role];
}
