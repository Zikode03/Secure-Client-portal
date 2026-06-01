using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SecureClientPortal.Backend.Auth;
using SecureClientPortal.Backend.Data;
using SecureClientPortal.Backend.Models;
using System.Text.Json;

namespace SecureClientPortal.Backend.Controllers;

public record CreateComplianceCategoryRequest(string Name, string Description, bool IsActive = true);
public record CreateComplianceItemRequest(
    string ClientId,
    string CategoryId,
    string Name,
    string Status,
    string? RequiredDocumentCategory,
    DateTime? DueDateUtc,
    DateTime? ExpiryDateUtc);
public record UpdateComplianceItemRequest(
    string Name,
    string Status,
    string? RequiredDocumentCategory,
    string? LinkedDocumentId,
    DateTime? DueDateUtc,
    DateTime? ExpiryDateUtc);
public record CreateComplianceReminderRequest(string ComplianceItemId, string RecipientUserId, string Type, DateTime ScheduledForUtc);

[ApiController]
[Route("api/compliance")]
[Authorize(Policy = "ClientOrAccountant")]
public class ComplianceController : ControllerBase
{
    private static readonly HashSet<string> AllowedItemStatuses =
    ["missing", "pending", "valid", "expiring_soon", "expired", "rejected"];

    private static readonly HashSet<string> AllowedReminderStatuses =
    ["pending", "sent", "dismissed"];

    private readonly PortalDbContext _db;

    public ComplianceController(PortalDbContext db)
    {
        _db = db;
    }

    [HttpGet("categories")]
    public async Task<ActionResult<IEnumerable<ComplianceCategory>>> GetCategories()
    {
        return Ok(await _db.ComplianceCategories.OrderBy(x => x.Name).ToListAsync());
    }

    [HttpPost("categories")]
    [Authorize(Policy = "AccountantOnly")]
    public async Task<ActionResult<ComplianceCategory>> CreateCategory([FromBody] CreateComplianceCategoryRequest request)
    {
        var item = new ComplianceCategory
        {
            Id = $"cc_{Guid.NewGuid():N}",
            Name = request.Name.Trim(),
            Description = request.Description.Trim(),
            IsActive = request.IsActive,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };

        _db.ComplianceCategories.Add(item);
        await _db.SaveChangesAsync();
        await _db.WriteAuditLogAsync(User, "compliance.category_created", "compliance_category", item.Id, null, JsonSerializer.Serialize(new { item.Name }));
        return Ok(item);
    }

    [HttpGet("items")]
    public async Task<ActionResult<IEnumerable<ComplianceItem>>> GetItems([FromQuery] string? clientId = null)
    {
        var allowedClientIds = await User.GetAccessibleClientIdsAsync(_db);
        var query = _db.ComplianceItems.Where(x => allowedClientIds.Contains(x.ClientId));

        if (!string.IsNullOrWhiteSpace(clientId))
        {
            if (!allowedClientIds.Contains(clientId))
            {
                return Forbid();
            }
            query = query.Where(x => x.ClientId == clientId);
        }

        return Ok(await query.OrderBy(x => x.ClientId).ThenBy(x => x.Name).ToListAsync());
    }

    [HttpPost("items")]
    [Authorize(Policy = "AccountantOnly")]
    public async Task<ActionResult<ComplianceItem>> CreateItem([FromBody] CreateComplianceItemRequest request)
    {
        var allowedClientIds = await User.GetAccessibleClientIdsAsync(_db);
        if (!allowedClientIds.Contains(request.ClientId))
        {
            return Forbid();
        }

        var status = request.Status.Trim().ToLowerInvariant();
        if (!AllowedItemStatuses.Contains(status))
        {
            return BadRequest(new { error = "Invalid compliance status." });
        }

        var categoryExists = await _db.ComplianceCategories.AnyAsync(x => x.Id == request.CategoryId && x.IsActive);
        if (!categoryExists)
        {
            return BadRequest(new { error = "Compliance category not found or inactive." });
        }

        var item = new ComplianceItem
        {
            Id = $"ci_{Guid.NewGuid():N}",
            ClientId = request.ClientId,
            CategoryId = request.CategoryId,
            Name = request.Name.Trim(),
            Status = status,
            RequiredDocumentCategory = string.IsNullOrWhiteSpace(request.RequiredDocumentCategory) ? null : request.RequiredDocumentCategory.Trim().ToLowerInvariant(),
            DueDateUtc = request.DueDateUtc,
            ExpiryDateUtc = request.ExpiryDateUtc,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };

        _db.ComplianceItems.Add(item);
        await _db.SaveChangesAsync();
        await _db.WriteAuditLogAsync(User, "compliance.item_created", "compliance_item", item.Id, item.ClientId, JsonSerializer.Serialize(new { item.CategoryId, item.Status }));
        return Ok(item);
    }

    [HttpPut("items/{id}")]
    [Authorize(Policy = "AccountantOnly")]
    public async Task<ActionResult<ComplianceItem>> UpdateItem(string id, [FromBody] UpdateComplianceItemRequest request)
    {
        var item = await _db.ComplianceItems.FindAsync(id);
        if (item is null)
        {
            return NotFound();
        }

        var allowedClientIds = await User.GetAccessibleClientIdsAsync(_db);
        if (!allowedClientIds.Contains(item.ClientId))
        {
            return Forbid();
        }

        var status = request.Status.Trim().ToLowerInvariant();
        if (!AllowedItemStatuses.Contains(status))
        {
            return BadRequest(new { error = "Invalid compliance status." });
        }

        item.Name = request.Name.Trim();
        item.Status = status;
        item.RequiredDocumentCategory = string.IsNullOrWhiteSpace(request.RequiredDocumentCategory) ? null : request.RequiredDocumentCategory.Trim().ToLowerInvariant();
        item.LinkedDocumentId = string.IsNullOrWhiteSpace(request.LinkedDocumentId) ? null : request.LinkedDocumentId.Trim();
        item.DueDateUtc = request.DueDateUtc;
        item.ExpiryDateUtc = request.ExpiryDateUtc;
        item.UpdatedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await _db.WriteAuditLogAsync(User, "compliance.item_updated", "compliance_item", item.Id, item.ClientId, JsonSerializer.Serialize(new { item.Status, item.LinkedDocumentId }));
        return Ok(item);
    }

    [HttpGet("reminders")]
    public async Task<ActionResult<IEnumerable<ComplianceReminder>>> GetReminders([FromQuery] string? clientId = null)
    {
        var allowedClientIds = await User.GetAccessibleClientIdsAsync(_db);
        var query = _db.ComplianceReminders.Where(x => allowedClientIds.Contains(x.ClientId));

        if (!string.IsNullOrWhiteSpace(clientId))
        {
            if (!allowedClientIds.Contains(clientId))
            {
                return Forbid();
            }
            query = query.Where(x => x.ClientId == clientId);
        }

        return Ok(await query.OrderByDescending(x => x.ScheduledForUtc).ToListAsync());
    }

    [HttpPost("reminders")]
    [Authorize(Policy = "AccountantOnly")]
    public async Task<ActionResult<ComplianceReminder>> CreateReminder([FromBody] CreateComplianceReminderRequest request)
    {
        var complianceItem = await _db.ComplianceItems.FindAsync(request.ComplianceItemId);
        if (complianceItem is null)
        {
            return BadRequest(new { error = "Compliance item not found." });
        }

        var allowedClientIds = await User.GetAccessibleClientIdsAsync(_db);
        if (!allowedClientIds.Contains(complianceItem.ClientId))
        {
            return Forbid();
        }

        var reminder = new ComplianceReminder
        {
            Id = $"cr_{Guid.NewGuid():N}",
            ComplianceItemId = request.ComplianceItemId,
            ClientId = complianceItem.ClientId,
            RecipientUserId = request.RecipientUserId,
            Type = request.Type.Trim().ToLowerInvariant(),
            Status = "pending",
            ScheduledForUtc = request.ScheduledForUtc,
            CreatedAtUtc = DateTime.UtcNow
        };

        _db.ComplianceReminders.Add(reminder);
        _db.Notifications.Add(new Notification
        {
            Id = $"ntf_{Guid.NewGuid():N}",
            UserId = reminder.RecipientUserId,
            ClientId = reminder.ClientId,
            Type = "compliance.reminder",
            Title = "Compliance reminder scheduled",
            Message = $"Compliance reminder for {complianceItem.Name} is scheduled.",
            LinkUrl = "/client/compliance",
            IsRead = false,
            CreatedAtUtc = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();
        await _db.WriteAuditLogAsync(User, "compliance.reminder_created", "compliance_reminder", reminder.Id, reminder.ClientId, JsonSerializer.Serialize(new { reminder.Type, reminder.ScheduledForUtc }));
        return Ok(reminder);
    }

    [HttpPut("reminders/{id}/status")]
    [Authorize(Policy = "AccountantOnly")]
    public async Task<ActionResult<ComplianceReminder>> UpdateReminderStatus(string id, [FromBody] string status)
    {
        var item = await _db.ComplianceReminders.FindAsync(id);
        if (item is null)
        {
            return NotFound();
        }

        var allowedClientIds = await User.GetAccessibleClientIdsAsync(_db);
        if (!allowedClientIds.Contains(item.ClientId))
        {
            return Forbid();
        }

        var normalized = status.Trim().ToLowerInvariant();
        if (!AllowedReminderStatuses.Contains(normalized))
        {
            return BadRequest(new { error = "Invalid reminder status." });
        }

        item.Status = normalized;
        item.SentAtUtc = normalized == "sent" ? DateTime.UtcNow : item.SentAtUtc;

        await _db.SaveChangesAsync();
        return Ok(item);
    }

    [HttpGet("reports/summary")]
    public async Task<ActionResult> GetSummaryReport([FromQuery] string? clientId = null)
    {
        var allowedClientIds = await User.GetAccessibleClientIdsAsync(_db);
        var scopedClientIds = allowedClientIds;

        if (!string.IsNullOrWhiteSpace(clientId))
        {
            if (!allowedClientIds.Contains(clientId))
            {
                return Forbid();
            }
            scopedClientIds = [clientId];
        }

        var items = await _db.ComplianceItems.Where(x => scopedClientIds.Contains(x.ClientId)).ToListAsync();

        var report = items
            .GroupBy(x => x.ClientId)
            .Select(group => new
            {
                clientId = group.Key,
                total = group.Count(),
                valid = group.Count(x => x.Status == "valid"),
                expiringSoon = group.Count(x => x.Status == "expiring_soon"),
                expired = group.Count(x => x.Status == "expired"),
                missing = group.Count(x => x.Status == "missing"),
                pending = group.Count(x => x.Status == "pending"),
                rejected = group.Count(x => x.Status == "rejected"),
                complianceScore = group.Count() == 0
                    ? 0
                    : (int)Math.Round((double)group.Count(x => x.Status == "valid") / group.Count() * 100)
            })
            .OrderBy(x => x.clientId)
            .ToList();

        return Ok(new
        {
            generatedAtUtc = DateTime.UtcNow,
            clients = report,
            totals = new
            {
                totalItems = items.Count,
                valid = items.Count(x => x.Status == "valid"),
                expiringSoon = items.Count(x => x.Status == "expiring_soon"),
                expired = items.Count(x => x.Status == "expired"),
                missing = items.Count(x => x.Status == "missing")
            }
        });
    }
}
