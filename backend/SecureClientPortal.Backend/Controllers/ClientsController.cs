using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SecureClientPortal.Backend.Data;
using SecureClientPortal.Backend.Models;

namespace SecureClientPortal.Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ClientsController : ControllerBase
{
    private readonly PortalDbContext _db;

    public ClientsController(PortalDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Client>>> GetAll()
    {
        return Ok(await _db.Clients.OrderBy(x => x.Name).ToListAsync());
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Client>> GetById(string id)
    {
        var client = await _db.Clients.FindAsync(id);
        if (client is null) return NotFound();
        return Ok(client);
    }

    [HttpPost]
    public async Task<ActionResult<Client>> Create([FromBody] Client request)
    {
        if (string.IsNullOrWhiteSpace(request.Id)) request.Id = $"c_{Guid.NewGuid():N}";
        request.CreatedAtUtc = DateTime.UtcNow;

        _db.Clients.Add(request);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = request.Id }, request);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<Client>> Update(string id, [FromBody] Client request)
    {
        var existing = await _db.Clients.FindAsync(id);
        if (existing is null) return NotFound();

        existing.Name = request.Name;
        existing.EntityType = request.EntityType;
        existing.Status = request.Status;
        existing.ComplianceHealth = request.ComplianceHealth;
        existing.AssignedAccountantId = request.AssignedAccountantId;
        existing.PrimaryContact = request.PrimaryContact;
        existing.Email = request.Email;

        await _db.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var existing = await _db.Clients.FindAsync(id);
        if (existing is null) return NotFound();

        _db.Clients.Remove(existing);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
