export interface RequiredDocumentTemplate {
  id: string;
  name: string;
  description: string;
  documentCategory: string;
  isRequired: boolean;
  defaultDueDayOfMonth: number | null;
}

export const requiredDocumentsEndpoint = "/api/admin/firm-management/templates/required-documents";
