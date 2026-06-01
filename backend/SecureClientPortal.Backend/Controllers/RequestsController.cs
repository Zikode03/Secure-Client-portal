using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SecureClientPortal.Backend.Auth;
using SecureClientPortal.Backend.Data;
using SecureClientPortal.Backend.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Text.Json;

namespace SecureClientPortal.Backend.Controllers;

public record AddRequestCommentRequest(string Message);

[ApiController]
[Route("api/requests")]
[Authorize(Policy = "ClientOrAccountant")]
public class RequestsController : ControllerBase
{
    private readonly PortalDbContext _db;

    public RequestsController(PortalDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<RequestItem>>> GetAll()
    {
        var allowedClientIds = await User.GetAccessibleClientIdsAsync(_db);
        return Ok(await _db.Requests
            .Where(x => allowedClientIds.Contains(x.ClientId))
            .OrderByDescending(x => x.RequestedAtUtc)
            .ToListAsync());
    }

    [HttpPost]
    public async Task<ActionResult<RequestItem>> Create([FromBody] RequestItem request)
    {
        var allowedClientIds = await User.GetAccessibleClientIdsAsync(_db);
        if (!allowedClientIds.Contains(request.ClientId))
        {
            return Forbid();
        }

        if (string.IsNullOrWhiteSpace(request.Id)) request.Id = $"req_{Guid.NewGuid():N}";
        request.RequestedByUserId = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value ?? request.RequestedByUserId;
        request.RequestedAtUtc = DateTime.UtcNow;
        request.UpdatedAtUtc = request.RequestedAtUtc;

        _db.Requests.Add(request);
        await _db.SaveChangesAsync();
        await _db.WriteAuditLogAsync(
            User,
            "request.created",
            "request",
            request.Id,
            request.ClientId,
            JsonSerializer.Serialize(new { request.Title, request.Priority, request.Status }));
        return CreatedAtAction(nameof(GetById), new { id = request.Id }, request);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<RequestItem>> GetById(string id)
    {
        var item = await _db.Requests.FindAsync(id);
        if (item is null) return NotFound();
        var allowedClientIds = await User.GetAccessibleClientIdsAsync(_db);
        if (!allowedClientIds.Contains(item.ClientId))
        {
            return Forbid();
        }
        return Ok(item);
    }

    [HttpPut("{id}")]
    [Authorize(Policy = "AccountantOnly")]
    public async Task<ActionResult<RequestItem>> Update(string id, [FromBody] RequestItem request)
    {
        var item = await _db.Requests.FindAsync(id);
        if (item is null) return NotFound();
        var allowedClientIds = await User.GetAccessibleClientIdsAsync(_db);
        if (!allowedClientIds.Contains(item.ClientId))
        {
            return Forbid();
        }

        item.Title = request.Title;
        item.Description = request.Description;
        item.Priority = request.Priority;
        item.Status = request.Status;
        item.DueDateUtc = request.DueDateUtc;
        item.UpdatedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await _db.WriteAuditLogAsync(
            User,
            "request.updated",
            "request",
            item.Id,
            item.ClientId,
            JsonSerializer.Serialize(new { item.Status, item.Priority }));
        return Ok(item);
    }

    [HttpGet("{id}/comments")]
    public async Task<ActionResult<IEnumerable<RequestComment>>> GetComments(string id)
    {
        var item = await _db.Requests.FindAsync(id);
        if (item is null) return NotFound();

        var allowedClientIds = await User.GetAccessibleClientIdsAsync(_db);
        if (!allowedClientIds.Contains(item.ClientId))
        {
            return Forbid();
        }

        var comments = await _db.RequestComments
            .Where(x => x.RequestId == item.Id)
            .OrderBy(x => x.CreatedAtUtc)
            .ToListAsync();
        return Ok(comments);
    }

    [HttpPost("{id}/comments")]
    public async Task<ActionResult<RequestComment>> AddComment(string id, [FromBody] AddRequestCommentRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Message))
        {
            return BadRequest(new { error = "Comment message is required." });
        }

        var item = await _db.Requests.FindAsync(id);
        if (item is null) return NotFound();
        var allowedClientIds = await User.GetAccessibleClientIdsAsync(_db);
        if (!allowedClientIds.Contains(item.ClientId))
        {
            return Forbid();
        }

        var authorId = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value ?? "unknown";
        var authorRole = User.IsInRole("admin")
            ? "admin"
            : User.IsInRole("accountant")
                ? "accountant"
                : "client";
        var comment = new RequestComment
        {
            Id = $"rc_{Guid.NewGuid():N}",
            RequestId = item.Id,
            ClientId = item.ClientId,
            AuthorUserId = authorId,
            AuthorRole = authorRole,
            Message = request.Message.Trim(),
            CreatedAtUtc = DateTime.UtcNow
        };
        _db.RequestComments.Add(comment);

        var recipientRole = authorRole == "client" ? "accountant" : "client";
        var recipientIds = await ResolveNotificationRecipientsAsync(item.ClientId, recipientRole);
        foreach (var recipientUserId in recipientIds.Where(x => x != authorId))
        {
            _db.Notifications.Add(new Notification
            {
                Id = $"ntf_{Guid.NewGuid():N}",
                UserId = recipientUserId,
                ClientId = item.ClientId,
                Type = "request.comment",
                Title = "New request comment",
                Message = $"New comment on request '{item.Title}'.",
                LinkUrl = $"/requests/{item.Id}",
                IsRead = false,
                CreatedAtUtc = DateTime.UtcNow
            });
        }

        await _db.SaveChangesAsync();
        await _db.WriteAuditLogAsync(
            User,
            "request.comment_added",
            "request",
            item.Id,
            item.ClientId,
            JsonSerializer.Serialize(new { comment.Id, comment.AuthorRole }));
        return Ok(comment);
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = "AccountantOnly")]
    public async Task<IActionResult> Delete(string id)
    {
        var item = await _db.Requests.FindAsync(id);
        if (item is null) return NotFound();
        var allowedClientIds = await User.GetAccessibleClientIdsAsync(_db);
        if (!allowedClientIds.Contains(item.ClientId))
        {
            return Forbid();
        }

        _db.Requests.Remove(item);
        await _db.SaveChangesAsync();
        await _db.WriteAuditLogAsync(User, "request.deleted", "request", item.Id, item.ClientId);
        return NoContent();
    }

    private async Task<List<string>> ResolveNotificationRecipientsAsync(string clientId, string role)
    {
        if (role == "client")
        {
            return await _db.Users
                .Where(x => x.Role == "client" && x.ClientIdsJson.Contains(clientId))
                .Select(x => x.Id)
                .ToListAsync();
        }

        if (role == "accountant")
        {
            return await _db.ClientAssignments
                .Where(x => x.ClientId == clientId)
                .Select(x => x.AccountantUserId)
                .Distinct()
                .ToListAsync();
        }

        return [];
    }
}
