namespace SecureClientPortal.Backend.Models;

public class Document
{
    public string Id { get; set; } = string.Empty;
    public string ClientId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = "general";
    public string Status { get; set; } = "pending";
    public long SizeBytes { get; set; }
    public string? StorageKey { get; set; }
    public string UploadedByUserId { get; set; } = string.Empty;
    public DateTime UploadedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
