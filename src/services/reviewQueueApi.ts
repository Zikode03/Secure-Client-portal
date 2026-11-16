import { apiData, portalApiClient } from "./portalApiClient";
import type { components } from "./generated/portal-api";
type Review = components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.AddReviewDecisionRequest"];
type Reupload = components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.RequestReuploadRequest"];
type Comment = components["schemas"]["SecureClientPortal.Backend.Application.Contracts.Modules.Documents.AddDocumentCommentRequest"];
export const reviewQueueApi = {
  review: (documentId: string, body: Review) => apiData(portalApiClient.POST("/api/review-queue/{documentId}/review", { params: { path: { documentId } }, body })),
  requestReupload: (documentId: string, body: Reupload) => apiData(portalApiClient.POST("/api/review-queue/{documentId}/request-reupload", { params: { path: { documentId } }, body })),
  comment: (documentId: string, body: Comment) => apiData(portalApiClient.POST("/api/review-queue/{documentId}/comments", { params: { path: { documentId } }, body })),
};
