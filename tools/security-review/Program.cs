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
if (staff.HasPermission("clients.create")) throw new Exception("Removed permission was incorrectly restored.");
var clientId = Guid.NewGuid(); var userId = Guid.NewGuid();
await using var db = new PortalDbContext(new DbContextOptionsBuilder<PortalDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
var clientUser = User.CreateInvited(userId, "Isolated review", "review@example.invalid", UserRole.Client, "unused", "[]", null);
db.Users.Add(clientUser); await db.SaveChangesAsync();
var client = new ClaimsPrincipal(new ClaimsIdentity(new[] {
    new Claim(ClaimTypes.NameIdentifier, userId.ToString()), new Claim("role_scope", "client"), new Claim("client_id", clientId.ToString())
}, "review"));
var currentRole = RoleDefinition.Create("client", "Client", "client", "[]", true);
CurrentAuthorizationClaims.Replace(client, clientUser, currentRole, ["access.client", "clients.read"]);
var allowed = await client.GetAccessibleClientIdsAsync(db);
Console.WriteLine($"Client scope trusts token client_id despite empty current DB membership: {allowed.Contains(clientId)}");
if (allowed.Contains(clientId)) throw new Exception("Old token membership bypassed current database membership.");
Console.WriteLine("Security regression checks passed using isolated in-memory records only.");
