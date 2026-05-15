using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SecureClientPortal.Backend.Data;
using SecureClientPortal.Backend.Models;

namespace SecureClientPortal.Backend.Controllers;

[ApiController]
[Route("api/tasks")]
[Authorize(Policy = "ClientOrAccountant")]
public class TasksController : ControllerBase
{
    private readonly PortalDbContext _db;

    public TasksController(PortalDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TaskItem>>> GetAll()
    {
        return Ok(await _db.Tasks.OrderByDescending(x => x.CreatedAtUtc).ToListAsync());
    }

    [HttpPost]
    [Authorize(Policy = "AccountantOnly")]
    public async Task<ActionResult<TaskItem>> Create([FromBody] TaskItem request)
    {
        if (string.IsNullOrWhiteSpace(request.Id)) request.Id = $"task_{Guid.NewGuid():N}";
        request.CreatedAtUtc = DateTime.UtcNow;
        request.UpdatedAtUtc = request.CreatedAtUtc;

        _db.Tasks.Add(request);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = request.Id }, request);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<TaskItem>> GetById(string id)
    {
        var item = await _db.Tasks.FindAsync(id);
        if (item is null) return NotFound();
        return Ok(item);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<TaskItem>> Update(string id, [FromBody] TaskItem request)
    {
        var item = await _db.Tasks.FindAsync(id);
        if (item is null) return NotFound();

        item.Title = request.Title;
        item.Status = request.Status;
        item.Priority = request.Priority;
        item.DueDateUtc = request.DueDateUtc;
        item.UpdatedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(item);
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = "AccountantOnly")]
    public async Task<IActionResult> Delete(string id)
    {
        var item = await _db.Tasks.FindAsync(id);
        if (item is null) return NotFound();
        _db.Tasks.Remove(item);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
