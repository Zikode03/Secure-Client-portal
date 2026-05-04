import type { Role } from "../types/portal";

export interface NavigationItem {
  label: string;
  to: string;
  description: string;
}

export const navigationByRole: Record<Role, NavigationItem[]> = {
  client: [
    {
      label: "Dashboard",
      to: "/client/dashboard",
      description: "Track month packs, alerts, and latest records",
    },
    {
      label: "Monthly Packs",
      to: "/client/packs",
      description: "Work through required monthly checklist slots",
    },
    {
      label: "Requests",
      to: "/client/requests",
      description: "Reply to follow-ups and workflow tasks",
    },
    {
      label: "Documents",
      to: "/client/documents",
      description: "Search documents, invoices, and compliance records",
    },
    {
      label: "Compliance",
      to: "/client/compliance",
      description: "Track expiries, reminders, and retained records",
    },
    {
      label: "Notifications",
      to: "/client/notifications",
      description: "See missing, rejected, and expiring alerts",
    },
    {
      label: "Messages",
      to: "/client/messages",
      description: "Comment on documents and requests only",
    },
    {
      label: "Settings",
      to: "/client/settings",
      description: "Update business and contact details",
    },
  ],
  accountant: [
    {
      label: "Dashboard",
      to: "/accountant/dashboard",
      description: "Monitor portfolio risk and work-in-progress",
    },
    {
      label: "Client Portfolio",
      to: "/accountant/clients",
      description: "Open assigned client workspaces",
    },
    {
      label: "Document Centre",
      to: "/accountant/documents",
      description: "Search across assigned client records",
    },
    {
      label: "Review Queue",
      to: "/accountant/review",
      description: "Accept, reject, or hold records under review",
    },
    {
      label: "Follow-ups",
      to: "/accountant/follow-ups",
      description: "Send and manage client requests",
    },
    {
      label: "Exceptions",
      to: "/accountant/compliance-exceptions",
      description: "Work expiring, missing, and rejected items",
    },
    {
      label: "Compliance",
      to: "/accountant/compliance",
      description: "See the broader compliance centre view",
    },
    {
      label: "Notifications",
      to: "/accountant/notifications",
      description: "Stay ahead of missing packs and due dates",
    },
    {
      label: "Messages",
      to: "/accountant/messages",
      description: "Controlled document and request comments",
    },
    {
      label: "Settings",
      to: "/accountant/settings",
      description: "Adjust workflow preferences",
    },
  ],
  admin: [
    {
      label: "Dashboard",
      to: "/admin/dashboard",
      description: "See firm-wide operational health",
    },
    {
      label: "Clients",
      to: "/admin/clients",
      description: "Manage client coverage and pack ownership",
    },
    {
      label: "Accountants",
      to: "/admin/accountants",
      description: "Review accountant workload and capacity",
    },
    {
      label: "Users",
      to: "/admin/users",
      description: "Track roles and account status",
    },
    {
      label: "Assignments",
      to: "/admin/assignments",
      description: "Assign accountants to clients",
    },
    {
      label: "Templates",
      to: "/admin/templates",
      description: "Manage required document templates",
    },
    {
      label: "Deadlines",
      to: "/admin/deadlines",
      description: "Configure monthly deadline rules",
    },
    {
      label: "Compliance",
      to: "/admin/compliance",
      description: "Review firm-wide compliance status",
    },
    {
      label: "Policies",
      to: "/admin/policies",
      description: "Edit workflow and document rules",
    },
    {
      label: "Settings",
      to: "/admin/settings",
      description: "Control system-level behaviour",
    },
  ],
};
