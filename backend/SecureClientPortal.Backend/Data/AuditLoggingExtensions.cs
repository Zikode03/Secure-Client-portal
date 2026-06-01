using SecureClientPortal.Backend.Auth;
using SecureClientPortal.Backend.Models;

namespace SecureClientPortal.Backend.Data;

public static class AuditLoggingExtensions
{
    public static async Task WriteAuditLogAsync(
        this PortalDbContext db,
        System.Security.Claims.ClaimsPrincipal user,
        string action,
        string entityType,
        string entityId,
        string? clientId = null,
        string? metadataJson = null,
        CancellationToken ct = default)
    {
        var actorRole = user.IsAdmin() ? "admin" : user.IsAccountant() ? "accountant" : user.IsClient() ? "client" : "unknown";
        db.AuditLogs.Add(new AuditLog
        {
            Id = $"al_{Guid.NewGuid():N}",
            ActorUserId = user.GetUserId(),
            ActorRole = actorRole,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            ClientId = clientId,
            MetadataJson = metadataJson,
            CreatedAtUtc = DateTime.UtcNow
        });

        await db.SaveChangesAsync(ct);
    }
}
