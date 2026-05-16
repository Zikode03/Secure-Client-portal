using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SecureClientPortal.Backend.Data;
using SecureClientPortal.Backend.Models;

namespace SecureClientPortal.Backend.Controllers;

public record AdminCreateUserRequest(string FullName, string Email, string Role, string? Company);
public record AdminUpdateRoleRequest(string Role);
public record AdminUpdateStatusRequest(string Status);
public record AdminResetAccessRequest(string Reason);
public record AdminSettingRequest(string ValueJson);

[ApiController]
[Route("api/admin")]
[Authorize(Policy = "AdminOnly")]
public class AdminController : ControllerBase
{
    private readonly PortalDbContext _db;

    public AdminController(PortalDbContext db)
    {
        _db = db;
    }

    [HttpGet("users")]
    public async Task<ActionResult<IEnumerable<object>>> GetUsers()
    {
        var users = await _db.Users
            .OrderBy(x => x.FullName)
            .Select(x => new { x.Id, x.FullName, x.Email, x.Role, x.ProfileJson, x.SecurityJson })
            .ToListAsync();
        return Ok(users);
    }

    [HttpPost("users")]
    public async Task<IActionResult> CreateUser([FromBody] AdminCreateUserRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        if (await _db.Users.AnyAsync(x => x.Email == email))
        {
            return Conflict(new { error = "A user with this email already exists." });
        }

        var user = new User
        {
            Id = $"u_{Guid.NewGuid():N}",
            FullName = request.FullName.Trim(),
            Email = email,
            Role = request.Role.Trim().ToLowerInvariant(),
            PasswordHash = Auth.PasswordHasher.Hash("ChangeMe123!"),
            ClientIdsJson = "[]",
            ProfileJson = string.IsNullOrWhiteSpace(request.Company) ? null : $"{{\"company\":\"{request.Company}\"}}",
            SecurityJson = "{\"status\":\"invited\"}",
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        return Ok(new { user.Id, user.FullName, user.Email, user.Role });
    }

    [HttpPut("users/{id}/role")]
    public async Task<IActionResult> UpdateUserRole(string id, [FromBody] AdminUpdateRoleRequest request)
    {
        var user = await _db.Users.FindAsync(id);
        if (user is null) return NotFound();
        user.Role = request.Role.Trim().ToLowerInvariant();
        user.UpdatedAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { user.Id, user.Role });
    }

    [HttpPut("users/{id}/status")]
    public async Task<IActionResult> UpdateUserStatus(string id, [FromBody] AdminUpdateStatusRequest request)
    {
        var user = await _db.Users.FindAsync(id);
        if (user is null) return NotFound();
        user.SecurityJson = $"{{\"status\":\"{request.Status}\"}}";
        user.UpdatedAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { user.Id, status = request.Status });
    }

    [HttpPost("users/{id}/reset-access")]
    public async Task<IActionResult> ResetUserAccess(string id, [FromBody] AdminResetAccessRequest request)
    {
        var user = await _db.Users.FindAsync(id);
        if (user is null) return NotFound();
        user.SecurityJson = $"{{\"status\":\"reset_pending\",\"reason\":\"{request.Reason}\"}}";
        user.UpdatedAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { user.Id, reset = true });
    }

    [HttpGet("settings/{key}")]
    public async Task<IActionResult> GetSetting(string key)
    {
        var item = await _db.SystemSettings.FindAsync(key);
        if (item is null) return Ok(new { key, valueJson = "{}" });
        return Ok(new { key = item.Key, valueJson = item.ValueJson });
    }

    [HttpPut("settings/{key}")]
    public async Task<IActionResult> PutSetting(string key, [FromBody] AdminSettingRequest request)
    {
        var item = await _db.SystemSettings.FindAsync(key);
        if (item is null)
        {
            item = new SystemSetting { Key = key, ValueJson = request.ValueJson, UpdatedAtUtc = DateTime.UtcNow };
            _db.SystemSettings.Add(item);
        }
        else
        {
            item.ValueJson = request.ValueJson;
            item.UpdatedAtUtc = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        return Ok(new { key = item.Key, valueJson = item.ValueJson });
    }
}

