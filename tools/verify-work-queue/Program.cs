using System.Security.Claims;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SecureClientPortal.Backend.Data;
using SecureClientPortal.Backend.Infrastructure.Modules.ReviewQueue;

if (args.Length != 1) throw new ArgumentException("Pass the backend checkout path.");
var path = Path.GetFullPath(args[0]);
using var settings = JsonDocument.Parse(await File.ReadAllTextAsync(Path.Combine(path, "src/SecureClientPortal.Api/appsettings.Development.json")));
var connection = settings.RootElement.GetProperty("ConnectionStrings").GetProperty("DefaultConnection").GetString()!;
await using var db = new PortalDbContext(new DbContextOptionsBuilder<PortalDbContext>().UseSqlServer(connection).Options);
var staff = await db.Users.AsNoTracking().Where(user => user.Role == "accountant" || user.Role == "admin").Select(user => new { user.Id, user.Role }).ToListAsync();
foreach (var member in staff)
{
    var principal = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, member.Id.ToString()), new Claim("sub", member.Id.ToString()), new Claim(ClaimTypes.Role, member.Role) }, "read-only-diagnostic"));
    var result = await new ReviewQueueService(db).GetPendingAsync(principal);
    if (result.forbidden) throw new InvalidOperationException("Existing staff scope was denied.");
    foreach (var item in result.items)
        if (item.DocumentId == Guid.Empty || item.Month is < 1 or > 12 || item.Year < 2000 || string.IsNullOrWhiteSpace(item.DocumentStatus)) throw new InvalidOperationException("Invalid queue response row.");
    Console.WriteLine($"Existing {member.Role} SQL queue query passed: {result.items.Count} pending document(s).");
}
if (db.ChangeTracker.Entries().Any(entry => entry.State is EntityState.Added or EntityState.Modified or EntityState.Deleted)) throw new InvalidOperationException("Diagnostic must not change stored records.");
Console.WriteLine("Read-only SQL verification completed. No users, documents, credentials or permissions changed.");
