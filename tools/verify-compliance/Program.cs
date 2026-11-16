using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SecureClientPortal.Backend.Data;

if (args.Length != 1) throw new ArgumentException("Pass the backend checkout path.");
var root = Path.GetFullPath(args[0]);
using var configuration = JsonDocument.Parse(await File.ReadAllTextAsync(Path.Combine(root, "src/SecureClientPortal.Api/appsettings.Development.json")));
var connection = configuration.RootElement.GetProperty("ConnectionStrings").GetProperty("DefaultConnection").GetString()!;
await using var db = new PortalDbContext(new DbContextOptionsBuilder<PortalDbContext>().UseSqlServer(connection).Options);
var rows = await db.ComplianceObligations.AsNoTracking().Select(x => new {x.ClientId, x.Code, x.PeriodStartUtc, x.StateJson}).ToListAsync();
var duplicateKeys = rows.GroupBy(x => new {x.ClientId, x.Code, x.PeriodStartUtc}).Count(x => x.Count() > 1);
Console.WriteLine($"Obligations: {rows.Count}; duplicate client/code/period keys: {duplicateKeys}.");
var businessNumber = 0;
foreach (var business in rows.GroupBy(x => x.ClientId))
{
    businessNumber++;
    foreach (var group in business.GroupBy(x => x.Code).Where(x => x.Count() > 1))
    {
        Console.WriteLine($"Business {businessNumber}, {group.Key}: {group.Count()} records.");
        foreach (var row in group.OrderBy(x => x.PeriodStartUtc))
        {
            using var state = JsonDocument.Parse(row.StateJson);
            var json = state.RootElement;
            var end = json.TryGetProperty("periodEndUtc", out var until) ? until.GetString() : null;
            var due = json.TryGetProperty("dueDateUtc", out var deadline) && deadline.ValueKind == JsonValueKind.String ? deadline.GetString() : null;
            Console.WriteLine($"  Period {row.PeriodStartUtc:yyyy-MM-dd} to {end}; due {due ?? "unconfigured"}.");
        }
    }
}
if (db.ChangeTracker.Entries().Any(entry => entry.State is EntityState.Added or EntityState.Modified or EntityState.Deleted))
    throw new InvalidOperationException("Compliance diagnostic must remain read-only.");
Console.WriteLine("Read-only verification completed. No compliance records changed.");
