using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SecureClientPortal.Backend.Auth;
using SecureClientPortal.Backend.Data;
using SecureClientPortal.Backend.Models;

namespace SecureClientPortal.Backend.Controllers;

public record CreateMonthlyPackRequest(string ClientId, int Year, int Month);

[ApiController]
[Route("api/monthly-packs")]
[Authorize(Policy = "ClientOrAccountant")]
public class MonthlyPacksController : ControllerBase
{
    private readonly PortalDbContext _db;

    public MonthlyPacksController(PortalDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<MonthlyPack>>> GetAll([FromQuery] string? clientId = null)
    {
        var allowedClientIds = await User.GetAccessibleClientIdsAsync(_db);
        var query = _db.MonthlyPacks.Where(x => allowedClientIds.Contains(x.ClientId));
        if (!string.IsNullOrWhiteSpace(clientId))
        {
            if (!allowedClientIds.Contains(clientId))
            {
                return Forbid();
            }
            query = query.Where(x => x.ClientId == clientId);
        }

        return Ok(await query.OrderByDescending(x => x.Year).ThenByDescending(x => x.Month).ToListAsync());
    }

    [HttpPost]
    [Authorize(Policy = "AccountantOnly")]
    public async Task<ActionResult<MonthlyPack>> Create([FromBody] CreateMonthlyPackRequest request)
    {
        var allowedClientIds = await User.GetAccessibleClientIdsAsync(_db);
        if (!allowedClientIds.Contains(request.ClientId) && !User.IsAdmin())
        {
            return Forbid();
        }

        var existing = await _db.MonthlyPacks.FirstOrDefaultAsync(x =>
            x.ClientId == request.ClientId && x.Year == request.Year && x.Month == request.Month);
        if (existing is not null)
        {
            return Ok(existing);
        }

        var pack = new MonthlyPack
        {
            Id = $"mp_{Guid.NewGuid():N}",
            ClientId = request.ClientId,
            Year = request.Year,
            Month = request.Month,
            Status = "open",
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };
        _db.MonthlyPacks.Add(pack);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), new { clientId = pack.ClientId }, pack);
    }

    [HttpGet("{packId}/slots")]
    public async Task<ActionResult<IEnumerable<DocumentSlot>>> GetSlots(string packId)
    {
        var pack = await _db.MonthlyPacks.FirstOrDefaultAsync(x => x.Id == packId);
        if (pack is null)
        {
            return NotFound();
        }

        var allowedClientIds = await User.GetAccessibleClientIdsAsync(_db);
        if (!allowedClientIds.Contains(pack.ClientId))
        {
            return Forbid();
        }

        var slots = await _db.DocumentSlots
            .Where(x => x.MonthlyPackId == packId)
            .OrderBy(x => x.Category)
            .ToListAsync();
        return Ok(slots);
    }
}
