using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SecureClientPortal.Backend.Controllers;
using SecureClientPortal.Backend.Data;
using SecureClientPortal.Backend.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace SecureClientPortal.Backend.Tests;

public class Phase4ComplianceTests
{
    [Fact]
    public async Task ComplianceItems_AreScopedByAssignedClient()
    {
        await using var db = BuildDb();
        Seed(db);

        var accountant = BuildUser("u_acc_001", "accountant");
        var controller = new ComplianceController(db)
        {
            ControllerContext = BuildControllerContext(accountant)
        };

        var result = await controller.GetItems();
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var items = Assert.IsAssignableFrom<IEnumerable<ComplianceItem>>(ok.Value);

        Assert.Single(items);
        Assert.All(items, x => Assert.Equal("c_001", x.ClientId));
    }

    [Fact]
    public async Task ComplianceSummary_ReturnsExpectedCounts()
    {
        await using var db = BuildDb();
        Seed(db);

        var admin = BuildUser("u_admin_001", "admin");
        var controller = new ComplianceController(db)
        {
            ControllerContext = BuildControllerContext(admin)
        };

        var result = await controller.GetSummaryReport();
        var ok = Assert.IsType<OkObjectResult>(result);

        var json = System.Text.Json.JsonSerializer.Serialize(ok.Value);
        Assert.Contains("\"totalItems\":2", json);
        Assert.Contains("\"valid\":1", json);
        Assert.Contains("\"expired\":1", json);
    }

    private static ControllerContext BuildControllerContext(ClaimsPrincipal user)
    {
        return new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };
    }

    private static ClaimsPrincipal BuildUser(string userId, string role, IEnumerable<string>? clientIds = null)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, userId),
            new(ClaimTypes.NameIdentifier, userId),
            new(ClaimTypes.Role, role)
        };

        if (clientIds is not null)
        {
            claims.AddRange(clientIds.Select(x => new Claim("client_id", x)));
        }

        return new ClaimsPrincipal(new ClaimsIdentity(claims, "test"));
    }

    private static PortalDbContext BuildDb()
    {
        var options = new DbContextOptionsBuilder<PortalDbContext>()
            .UseInMemoryDatabase($"phase4-test-{Guid.NewGuid():N}")
            .Options;
        return new PortalDbContext(options);
    }

    private static void Seed(PortalDbContext db)
    {
        db.Clients.AddRange(
            new Client { Id = "c_001", Name = "Alpha", EntityType = "Pty Ltd", Status = "active", ComplianceHealth = 90, AssignedAccountantId = "u_acc_001", PrimaryContact = "A", Email = "a@test.com" },
            new Client { Id = "c_002", Name = "Beta", EntityType = "Pty Ltd", Status = "active", ComplianceHealth = 80, AssignedAccountantId = "u_acc_002", PrimaryContact = "B", Email = "b@test.com" });

        db.ClientAssignments.Add(new ClientAssignment { Id = "ca_001", AccountantUserId = "u_acc_001", ClientId = "c_001" });

        db.ComplianceCategories.Add(new ComplianceCategory
        {
            Id = "cc_tax",
            Name = "Tax Compliance",
            Description = "Tax filings and proofs",
            IsActive = true
        });

        db.ComplianceItems.AddRange(
            new ComplianceItem { Id = "ci_001", ClientId = "c_001", CategoryId = "cc_tax", Name = "Tax PIN", Status = "valid" },
            new ComplianceItem { Id = "ci_002", ClientId = "c_002", CategoryId = "cc_tax", Name = "VAT Return", Status = "expired" });

        db.SaveChanges();
    }
}
