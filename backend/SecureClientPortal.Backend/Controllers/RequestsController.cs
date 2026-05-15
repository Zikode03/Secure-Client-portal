using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SecureClientPortal.Backend.Data;
using SecureClientPortal.Backend.Models;

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
        return Ok(await _db.Requests.OrderByDescending(x => x.RequestedAtUtc).ToListAsync());
    }

    [HttpPost]
    public async Task<ActionResult<RequestItem>> Create([FromBody] RequestItem request)
    {
        if (string.IsNullOrWhiteSpace(request.Id)) request.Id = $"req_{Guid.NewGuid():N}";
        request.RequestedAtUtc = DateTime.UtcNow;

        _db.Requests.Add(request);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = request.Id }, request);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<RequestItem>> GetById(string id)
    {
        var item = await _db.Requests.FindAsync(id);
        if (item is null) return NotFound();
        return Ok(item);
    }

    [HttpPut("{id}")]
    [Authorize(Policy = "AccountantOnly")]
    public async Task<ActionResult<RequestItem>> Update(string id, [FromBody] RequestItem request)
    {
        var item = await _db.Requests.FindAsync(id);
        if (item is null) return NotFound();

        item.Title = request.Title;
        item.Description = request.Description;
        item.Priority = request.Priority;
        item.Status = request.Status;
        item.DueDateUtc = request.DueDateUtc;

        await _db.SaveChangesAsync();
        return Ok(item);
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = "AccountantOnly")]
    public async Task<IActionResult> Delete(string id)
    {
        var item = await _db.Requests.FindAsync(id);
        if (item is null) return NotFound();
        _db.Requests.Remove(item);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
