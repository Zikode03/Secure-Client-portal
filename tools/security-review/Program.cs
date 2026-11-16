using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using SecureClientPortal.Backend.Auth;
using SecureClientPortal.Backend.Data;
using SecureClientPortal.Backend.Models;

// Isolated reproductions: in-memory database only; no real users, sessions or files changed.
var staff = new ClaimsPrincipal(new ClaimsIdentity(new[] {
    new Claim("role_scope", "accountant"), new Claim("permission", "clients.read")
}, "review"));
Console.WriteLine($"Explicit read-only permission list still grants clients.create: {staff.HasPermission("clients.create")}");
if (!staff.HasPermission("clients.create")) throw new Exception("Permission fallback finding no longer reproduces.");
var clientId = Guid.NewGuid(); var userId = Guid.NewGuid();
await using var db = new PortalDbContext(new DbContextOptionsBuilder<PortalDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
var clientUser = User.CreateInvited(userId, "Isolated review", "review@example.invalid", UserRole.Client, "unused", "[]", null);
db.Users.Add(clientUser); await db.SaveChangesAsync();
var client = new ClaimsPrincipal(new ClaimsIdentity(new[] {
    new Claim(ClaimTypes.NameIdentifier, userId.ToString()), new Claim("role_scope", "client"), new Claim("client_id", clientId.ToString())
}, "review"));
var allowed = await client.GetAccessibleClientIdsAsync(db);
Console.WriteLine($"Client scope trusts token client_id despite empty current DB membership: {allowed.Contains(clientId)}");
if (!allowed.Contains(clientId)) throw new Exception("Stale client claim finding no longer reproduces.");
Console.WriteLine("Reproductions completed using isolated in-memory records only.");
