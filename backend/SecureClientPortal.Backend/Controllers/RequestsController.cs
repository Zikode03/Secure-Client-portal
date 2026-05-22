using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SecureClientPortal.Backend.Data;
using SecureClientPortal.Backend.Models;
using System.Security.Claims;

namespace SecureClientPortal.Backend.Controllers;

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
        var requests = await _db.Requests
            .Where(x => x.ArchivedAtUtc == null)
            .Include(x => x.Comments)
            .OrderByDescending(x => x.RequestedAtUtc)
            .ToListAsync();
        return Ok(requests);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<RequestItem>> GetById(string id)
    {
        var item = await _db.Requests
            .Include(x => x.Comments.OrderBy(c => c.CreatedAtUtc))
            .FirstOrDefaultAsync(x => x.Id == id);
        
        if (item is null) return NotFound(new { error = "Request not found" });
        return Ok(item);
    }

    [HttpPost]
    [Authorize(Policy = "AccountantOnly")]
    public async Task<ActionResult<RequestItem>> Create([FromBody] RequestItem request)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var userName = User.FindFirst(ClaimTypes.Name)?.Value;

        if (string.IsNullOrWhiteSpace(request.Id)) 
            request.Id = $"req_{Guid.NewGuid():N}";

        request.RequestedByUserId = userId ?? string.Empty;
        request.RequestedByName = userName ?? "Unknown";
        request.RequestedByRole = "accountant";
        request.RequestedAtUtc = DateTime.UtcNow;
        request.UpdatedAtUtc = request.RequestedAtUtc;

        _db.Requests.Add(request);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = request.Id }, request);
    }

    [HttpPut("{id}")]
    [Authorize(Policy = "AccountantOnly")]
    public async Task<ActionResult<RequestItem>> Update(string id, [FromBody] RequestItem request)
    {
        var item = await _db.Requests.FindAsync(id);
        if (item is null) return NotFound(new { error = "Request not found" });

        item.Title = request.Title;
        item.Description = request.Description;
        item.Priority = request.Priority;
        item.Status = request.Status;
        item.DueDateUtc = request.DueDateUtc;
        item.UpdatedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(item);
    }

    [HttpPut("{id}/status")]
    public async Task<ActionResult<RequestItem>> UpdateStatus(string id, [FromBody] StatusUpdateRequest statusUpdate)
    {
        var item = await _db.Requests.FindAsync(id);
        if (item is null) return NotFound(new { error = "Request not found" });

        // Only accountant can mark as resolved
        if (statusUpdate.Status == "resolved" && !User.IsInRole("accountant"))
            return Forbid();

        item.Status = statusUpdate.Status;
        item.UpdatedAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(item);
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = "AccountantOnly")]
    public async Task<IActionResult> Archive(string id)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var item = await _db.Requests.FindAsync(id);
        
        if (item is null) return NotFound(new { error = "Request not found" });

        item.ArchivedByUserId = userId ?? string.Empty;
        item.ArchivedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // Comments
    [HttpPost("{requestId}/comments")]
    public async Task<ActionResult<RequestComment>> AddComment(string requestId, [FromBody] AddCommentRequest commentRequest)
    {
        var request = await _db.Requests.FindAsync(requestId);
        if (request is null) return NotFound(new { error = "Request not found" });

        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var userName = User.FindFirst(ClaimTypes.Name)?.Value;
        var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

        var comment = new RequestComment
        {
            Id = $"cmt_{Guid.NewGuid():N}",
            RequestId = requestId,
            AuthorUserId = userId ?? string.Empty,
            AuthorName = userName ?? "Unknown",
            AuthorRole = userRole ?? "client",
            Message = commentRequest.Message,
            CreatedAtUtc = DateTime.UtcNow
        };

        _db.RequestComments.Add(comment);
        request.UpdatedAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetCommentById), new { requestId, commentId = comment.Id }, comment);
    }

    [HttpGet("{requestId}/comments")]
    public async Task<ActionResult<IEnumerable<RequestComment>>> GetComments(string requestId)
    {
        var request = await _db.Requests.FindAsync(requestId);
        if (request is null) return NotFound(new { error = "Request not found" });

        var comments = await _db.RequestComments
            .Where(x => x.RequestId == requestId)
            .OrderBy(x => x.CreatedAtUtc)
            .ToListAsync();

        return Ok(comments);
    }

    [HttpGet("{requestId}/comments/{commentId}")]
    public async Task<ActionResult<RequestComment>> GetCommentById(string requestId, string commentId)
    {
        var comment = await _db.RequestComments
            .FirstOrDefaultAsync(x => x.RequestId == requestId && x.Id == commentId);

        if (comment is null) return NotFound(new { error = "Comment not found" });
        return Ok(comment);
    }

    [HttpDelete("{requestId}/comments/{commentId}")]
    [Authorize(Policy = "AccountantOnly")]
    public async Task<IActionResult> DeleteComment(string requestId, string commentId)
    {
        var comment = await _db.RequestComments
            .FirstOrDefaultAsync(x => x.RequestId == requestId && x.Id == commentId);

        if (comment is null) return NotFound(new { error = "Comment not found" });

        _db.RequestComments.Remove(comment);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}

public record StatusUpdateRequest(string Status);
public record AddCommentRequest(string Message);
