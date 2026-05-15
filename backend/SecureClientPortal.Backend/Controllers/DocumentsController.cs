using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SecureClientPortal.Backend.Data;
using SecureClientPortal.Backend.Models;

namespace SecureClientPortal.Backend.Controllers;

[ApiController]
[Route("api/documents")]
[Authorize(Policy = "ClientOrAccountant")]
public class DocumentsController : ControllerBase
{
    private readonly PortalDbContext _db;

    public DocumentsController(PortalDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Document>>> GetAll()
    {
        return Ok(await _db.Documents.OrderByDescending(x => x.UploadedAtUtc).ToListAsync());
    }

    [HttpPost]
    public async Task<ActionResult<Document>> Create([FromBody] Document request)
    {
        if (string.IsNullOrWhiteSpace(request.Id)) request.Id = $"doc_{Guid.NewGuid():N}";
        request.UploadedAtUtc = DateTime.UtcNow;

        _db.Documents.Add(request);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = request.Id }, request);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Document>> GetById(string id)
    {
        var item = await _db.Documents.FindAsync(id);
        if (item is null) return NotFound();
        return Ok(item);
    }

    [HttpPut("{id}")]
    [Authorize(Policy = "AccountantOnly")]
    public async Task<ActionResult<Document>> Update(string id, [FromBody] Document request)
    {
        var item = await _db.Documents.FindAsync(id);
        if (item is null) return NotFound();

        item.Name = request.Name;
        item.Category = request.Category;
        item.Status = request.Status;
        item.SizeBytes = request.SizeBytes;
        item.StorageKey = request.StorageKey;

        await _db.SaveChangesAsync();
        return Ok(item);
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = "AccountantOnly")]
    public async Task<IActionResult> Delete(string id)
    {
        var item = await _db.Documents.FindAsync(id);
        if (item is null) return NotFound();
        _db.Documents.Remove(item);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
