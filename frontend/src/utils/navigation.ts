import type { Role } from "../types/portal";

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
      label: "Messages",
      to: "/client/messages",
      description: "Comment on documents and requests only",
      section: "Documents",
      icon: "messages",
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
      to: "/accountant/dashboard",
      description: "Monitor portfolio risk and work-in-progress",
      section: "Main",
      icon: "dashboard",
    },
    {
      label: "Client Portfolio",
      to: "/accountant/clients",
      description: "Open assigned client workspaces",
      section: "Main",
      icon: "portfolio",
    },
    {
      label: "Review Queue",
      to: "/accountant/review",
      description: "Accept, reject, or hold records under review",
      section: "Main",
      icon: "review",
    },
    {
      label: "Document Centre",
      to: "/accountant/documents",
      description: "Search across assigned client records",
      section: "Documents",
      icon: "documents",
    },
    {
      label: "Messages",
      to: "/accountant/messages",
      description: "Controlled document and request comments",
      section: "Documents",
      icon: "messages",
    },
    {
      label: "Follow-ups",
      to: "/accountant/follow-ups",
      description: "Send and manage client requests",
      section: "Operations",
      icon: "followups",
    },
    {
      label: "Exceptions",
      to: "/accountant/compliance-exceptions",
      description: "Work expiring, missing, and rejected items",
      section: "Compliance",
      icon: "exceptions",
    },
    {
      label: "Compliance Centre",
      to: "/accountant/compliance",
      description: "See the broader compliance centre view",
      section: "Compliance",
      icon: "compliance",
    },
    {
      label: "Notifications",
      to: "/accountant/notifications",
      description: "Stay ahead of missing packs and due dates",
      section: "System",
      icon: "notifications",
      badge: "5",
    },
    {
      label: "Settings",
      to: "/accountant/settings",
      description: "Adjust workflow preferences",
      section: "System",
      icon: "settings",
    },
  ],
  admin: [
    {
      label: "Dashboard",
      to: "/admin/dashboard",
      description: "See firm-wide operational health",
      section: "Main",
      icon: "dashboard",
    },
    {
      label: "Clients",
      to: "/admin/clients",
      description: "Manage client coverage and pack ownership",
      section: "Management",
      icon: "clients",
    },
    {
      label: "Accountants",
      to: "/admin/accountants",
      description: "Review accountant workload and capacity",
      section: "Management",
      icon: "accountants",
    },
    {
      label: "Users",
      to: "/admin/users",
      description: "Track roles and account status",
      section: "Management",
      icon: "users",
    },
    {
      label: "Assignments",
      to: "/admin/assignments",
      description: "Assign accountants to clients",
      section: "Operations",
      icon: "assignments",
    },
    {
      label: "Templates",
      to: "/admin/templates",
      description: "Manage required document templates",
      section: "Configuration",
      icon: "templates",
    },
    {
      label: "Deadlines",
      to: "/admin/deadlines",
      description: "Configure monthly deadline rules",
      section: "Configuration",
      icon: "deadlines",
    },
    {
      label: "Compliance",
      to: "/admin/compliance",
      description: "Review firm-wide compliance status",
      section: "Compliance",
      icon: "compliance",
    },
    {
      label: "Policies",
      to: "/admin/policies",
      description: "Edit workflow and document rules",
      section: "Configuration",
      icon: "policies",
    },
    {
      label: "Settings",
      to: "/admin/settings",
      description: "Control system-level behaviour",
      section: "System",
      icon: "settings",
    },
  ],
};
