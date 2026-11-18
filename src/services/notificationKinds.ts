import type {NotificationKind} from "../types/portal";
export function notificationKind(type: string): NotificationKind {
 const value=type.trim().toLowerCase();
 if(value === "documents.imported")return "document_update";
 if(["document.rejected","document.reupload_requested","document.rejected.reminder","document.reupload_required"].includes(value))return "rejected_documents";
 if(["document.missing.reminder","document.overdue.reminder"].includes(value))return "missing_documents";
 if(["deadline.approaching","monthly_pack.deadline_approaching","monthly_pack.reminder","request.deadline_approaching"].includes(value))return "deadline_reminder";
 if(["compliance.expiring","compliance.expiring_soon","compliance.expired"].includes(value))return "expiring_documents";
 return "general_update";
}
