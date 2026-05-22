namespace SecureClientPortal.Backend.Models;

public class RequestItem
{
    public string Id { get; set; } = string.Empty;
    public string ClientId { get; set; } = string.Empty;
    public string ClientName { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Priority { get; set; } = "medium";
    public string Status { get; set; } = "open";
    public string RequestType { get; set; } = "general";
    public DateTime? DueDateUtc { get; set; }
    public string RequestedByUserId { get; set; } = string.Empty;
    public string RequestedByName { get; set; } = string.Empty;
    public string RequestedByRole { get; set; } = "accountant";
    public string? RelatedDocumentId { get; set; }
    public string? MonthLabel { get; set; }
    public string? ComplianceCategoryId { get; set; }
    public string? ComplianceCategoryName { get; set; }
    public string? ComplianceItemId { get; set; }
    public string? ComplianceItemName { get; set; }
    public DateTime RequestedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
    public string ArchivedByUserId { get; set; } = string.Empty;
    public DateTime? ArchivedAtUtc { get; set; }

    // Navigation property
    public virtual ICollection<RequestComment> Comments { get; set; } = new List<RequestComment>();
}
