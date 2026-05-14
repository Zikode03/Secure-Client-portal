// Friendly guide: this module (navigation) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import type { Role, SessionUser } from "../types/portal";

export type NavigationSection =
  | "Main"
  | "Documents"
  | "Compliance"
  | "Operations"
  | "Management"
  | "Configuration"
  | "System";

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
    {
      label: "Settings",
      to: "/client/settings",
      description: "Update business and contact details",
      section: "System",
      icon: "settings",
    },
    {
      label: "Notification Preferences",
      to: "/client/notifications/preferences",
      description: "Control reminders, alerts, and quiet hours",
      section: "System",
      icon: "settings",
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
      label: "Review Queue",
      to: "/firm/review",
      description: "Accept, reject, or hold records under review",
      section: "Main",
      icon: "review",
    },
    {
      label: "Documents",
      to: "/firm/documents",
      description: "Search across assigned client records",
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
    {
      label: "Notification Preferences",
      to: "/firm/notifications/preferences",
      description: "Set reminders, escalation channels, and quiet hours",
      section: "System",
      icon: "settings",
    },
    {
      label: "Settings",
      to: "/firm/settings",
      description: "Adjust workflow preferences",
      section: "System",
      icon: "settings",
    },
  ],
  admin: [
    {
      label: "Dashboard",
      to: "/firm/dashboard",
      description: "See firm-wide operational health",
      section: "Main",
      icon: "dashboard",
    },
    {
      label: "Clients",
      to: "/firm/clients",
      description: "Manage client coverage and pack ownership",
      section: "Management",
      icon: "clients",
    },
    {
      label: "Review Queue",
      to: "/firm/review",
      description: "See the full firm review queue",
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
      label: "Compliance Centre",
      to: "/firm/compliance",
      description: "Review firm-wide compliance status",
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
    {
      label: "Assignments",
      to: "/firm/admin/assignments",
      description: "Assign accountants to clients",
      section: "Operations",
      icon: "assignments",
    },
    {
      label: "Request SLA Rules",
      to: "/firm/admin/request-state-machine",
      description: "Manage request state transitions, reminders, and escalations",
      section: "Configuration",
      icon: "policies",
    },
    {
      label: "Notification Preferences",
      to: "/firm/notifications/preferences",
      description: "Set reminders, escalation channels, and quiet hours",
      section: "System",
      icon: "settings",
    },
    {
      label: "System Settings",
      to: "/firm/admin/system-settings",
      description: "Control system-level behaviour",
      section: "System",
      icon: "settings",
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