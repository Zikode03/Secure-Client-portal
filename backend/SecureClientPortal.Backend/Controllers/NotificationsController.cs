using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SecureClientPortal.Backend.Auth;
using SecureClientPortal.Backend.Data;
using SecureClientPortal.Backend.Models;

namespace SecureClientPortal.Backend.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize(Policy = "ClientOrAccountant")]
public class NotificationsController : ControllerBase
{
    private readonly PortalDbContext _db;

    public NotificationsController(PortalDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Notification>>> GetMine()
    {
        var userId = User.GetUserId();
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized();
        }

        var allowedClientIds = await User.GetAccessibleClientIdsAsync(_db);
        var data = await _db.Notifications
            .Where(x => x.UserId == userId && (x.ClientId == null || allowedClientIds.Contains(x.ClientId)))
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync();

        return Ok(data);
    }

    [HttpPut("{id}/read")]
    public async Task<ActionResult<Notification>> MarkAsRead(string id)
    {
        var userId = User.GetUserId();
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized();
        }

        var item = await _db.Notifications.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId);
        if (item is null)
        {
            return NotFound();
        }

        var allowedClientIds = await User.GetAccessibleClientIdsAsync(_db);
        if (item.ClientId is not null && !allowedClientIds.Contains(item.ClientId))
        {
            return Forbid();
        }

        item.IsRead = true;
        item.ReadAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(item);
    }
}
