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
      label: "Requests",
      to: "/client/requests",
      description: "Reply to follow-ups and workflow tasks",
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
    {
      label: "Notifications",
      to: "/client/notifications",
      description: "See missing, rejected, and expiring alerts",
      section: "System",
      icon: "notifications",
      badge: "3",
    },
    {
      label: "Settings",
      to: "/client/settings",
      description: "Update business and contact details",
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
      label: "Requests",
      to: "/firm/requests",
      description: "Track assigned client follow-ups and questions",
      section: "Operations",
      icon: "requests",
    },
    {
      label: "Compliance Centre",
      to: "/firm/compliance",
      description: "See the broader compliance centre view",
      section: "Compliance",
      icon: "compliance",
    },
    {
      label: "Notifications",
      to: "/firm/notifications",
      description: "See alerts across your assigned client portfolio",
      section: "System",
      icon: "notifications",
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
      label: "Requests",
      to: "/firm/requests",
      description: "See all client and accountant requests",
      section: "Operations",
      icon: "requests",
    },
    {
      label: "Compliance Centre",
      to: "/firm/compliance",
      description: "Review firm-wide compliance status",
      section: "Compliance",
      icon: "compliance",
    },
    {
      label: "Notifications",
      to: "/firm/notifications",
      description: "Monitor operational signals across the firm",
      section: "System",
      icon: "notifications",
    },
    {
      label: "User Management",
      to: "/firm/admin/users",
      description: "Manage users, roles, and access status",
      section: "Management",
      icon: "users",
    },
    {
      label: "Roles",
      to: "/firm/admin/roles",
      description: "Manage role definitions and access levels",
      section: "Management",
      icon: "users",
    },
    {
      label: "Assignments",
      to: "/firm/admin/assignments",
      description: "Assign accountants to clients",
      section: "Operations",
      icon: "assignments",
    },
    {
      label: "Templates",
      to: "/firm/admin/templates",
      description: "Manage required document templates",
      section: "Configuration",
      icon: "templates",
    },
    {
      label: "Deadline Rules",
      to: "/firm/admin/deadline-rules",
      description: "Configure monthly deadline rules",
      section: "Configuration",
      icon: "deadlines",
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

export function getNavigationForUser(user: SessionUser | null | undefined) {
  if (!user) {
    return [];
  }

  return navigationByRole[user.role];
}
