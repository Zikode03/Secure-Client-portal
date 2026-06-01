using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SecureClientPortal.Backend.Controllers;
using SecureClientPortal.Backend.Data;
using SecureClientPortal.Backend.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace SecureClientPortal.Backend.Tests;

public class AuthorizationScopeTests
{
    [Fact]
    public async Task GetAllEndpoints_AdminSeesAll_AccountantSeesAssigned_ClientSeesOwn()
    {
        await using var db = BuildDb();
        Seed(db);

        var adminUser = BuildUser("u_admin_001", "admin");
        var accountantUser = BuildUser("u_acc_001", "accountant");
        var clientUser = BuildUser("u_client_001", "client", ["c_001"]);

        var adminClients = await GetClientsCount(db, adminUser);
        var accountantClients = await GetClientsCount(db, accountantUser);
        var clientClients = await GetClientsCount(db, clientUser);

        Assert.Equal(2, adminClients);
        Assert.Equal(1, accountantClients);
        Assert.Equal(1, clientClients);

        var adminDocuments = await GetDocumentsCount(db, adminUser);
        var accountantDocuments = await GetDocumentsCount(db, accountantUser);
        var clientDocuments = await GetDocumentsCount(db, clientUser);

        Assert.Equal(2, adminDocuments);
        Assert.Equal(1, accountantDocuments);
        Assert.Equal(1, clientDocuments);

        var adminRequests = await GetRequestsCount(db, adminUser);
        var accountantRequests = await GetRequestsCount(db, accountantUser);
        var clientRequests = await GetRequestsCount(db, clientUser);

        Assert.Equal(2, adminRequests);
        Assert.Equal(1, accountantRequests);
        Assert.Equal(1, clientRequests);
    }

    [Fact]
    public async Task WriteEndpoints_EnforceClientScope()
    {
        await using var db = BuildDb();
        Seed(db);

        var accountantUser = BuildUser("u_acc_001", "accountant");
        var accountantController = new DocumentsController(db)
        {
            ControllerContext = BuildControllerContext(accountantUser)
        };

        var forbiddenDoc = await accountantController.Create(new Document
        {
            Id = "doc_forbidden",
            ClientId = "c_002",
            Name = "Forbidden",
            Category = "invoices",
            Status = "pending",
            SizeBytes = 10,
            UploadedByUserId = "u_acc_001"
        });
        Assert.IsType<ForbidResult>(forbiddenDoc.Result);

        var clientUser = BuildUser("u_client_001", "client", ["c_001"]);
        var requestsController = new RequestsController(db)
        {
            ControllerContext = BuildControllerContext(clientUser)
        };

        var forbiddenRequest = await requestsController.Create(new RequestItem
        {
            Id = "req_forbidden",
            ClientId = "c_002",
            Title = "Bad",
            Description = "Bad",
            Priority = "medium",
            Status = "open",
            RequestedByUserId = "u_client_001"
        });
        Assert.IsType<ForbidResult>(forbiddenRequest.Result);
    }

    private static async Task<int> GetClientsCount(PortalDbContext db, ClaimsPrincipal user)
    {
        var controller = new ClientsController(db)
        {
            ControllerContext = BuildControllerContext(user)
        };

        var result = await controller.GetAll();
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var data = Assert.IsAssignableFrom<IEnumerable<Client>>(ok.Value);
        return data.Count();
    }

    private static async Task<int> GetDocumentsCount(PortalDbContext db, ClaimsPrincipal user)
    {
        var controller = new DocumentsController(db)
        {
            ControllerContext = BuildControllerContext(user)
        };

        var result = await controller.GetAll();
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var data = Assert.IsAssignableFrom<IEnumerable<Document>>(ok.Value);
        return data.Count();
    }

    private static async Task<int> GetRequestsCount(PortalDbContext db, ClaimsPrincipal user)
    {
        var controller = new RequestsController(db)
        {
            ControllerContext = BuildControllerContext(user)
        };

        var result = await controller.GetAll();
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var data = Assert.IsAssignableFrom<IEnumerable<RequestItem>>(ok.Value);
        return data.Count();
    }

    private static ControllerContext BuildControllerContext(ClaimsPrincipal user)
    {
        return new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = user
            }
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
            .UseInMemoryDatabase($"scope-test-{Guid.NewGuid():N}")
            .Options;
        return new PortalDbContext(options);
    }

    private static void Seed(PortalDbContext db)
    {
        db.Clients.AddRange(
            new Client
            {
                Id = "c_001",
                Name = "Alpha",
                EntityType = "Pty Ltd",
                Status = "active",
                ComplianceHealth = 90,
                AssignedAccountantId = "u_acc_001",
                PrimaryContact = "A",
                Email = "a@test.com"
            },
            new Client
            {
                Id = "c_002",
                Name = "Beta",
                EntityType = "Pty Ltd",
                Status = "active",
                ComplianceHealth = 80,
                AssignedAccountantId = "u_acc_002",
                PrimaryContact = "B",
                Email = "b@test.com"
            });

        db.ClientAssignments.Add(new ClientAssignment
        {
            Id = "ca_001",
            AccountantUserId = "u_acc_001",
            ClientId = "c_001"
        });

        db.Documents.AddRange(
            new Document
            {
                Id = "doc_001",
                ClientId = "c_001",
                Name = "Doc 1",
                Category = "invoices",
                Status = "pending",
                SizeBytes = 1,
                UploadedByUserId = "u_client_001"
            },
            new Document
            {
                Id = "doc_002",
                ClientId = "c_002",
                Name = "Doc 2",
                Category = "invoices",
                Status = "pending",
                SizeBytes = 1,
                UploadedByUserId = "u_client_002"
            });

        db.Requests.AddRange(
            new RequestItem
            {
                Id = "req_001",
                ClientId = "c_001",
                Title = "R1",
                Description = "d1",
                Priority = "medium",
                Status = "open",
                RequestedByUserId = "u_acc_001"
            },
            new RequestItem
            {
                Id = "req_002",
                ClientId = "c_002",
                Title = "R2",
                Description = "d2",
                Priority = "medium",
                Status = "open",
                RequestedByUserId = "u_acc_002"
            });

        db.SaveChanges();
    }
}
