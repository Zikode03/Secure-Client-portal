using Microsoft.EntityFrameworkCore;
using SecureClientPortal.Backend.Auth;
using SecureClientPortal.Backend.Models;

namespace SecureClientPortal.Backend.Data;

public static class SeedData
{
    public static async Task InitializeAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<PortalDbContext>();

        await db.Database.MigrateAsync();

        await UpsertUser(db, new User
        {
            Id = "u_admin_001",
            FullName = "System Admin",
            Email = "admin@secureportal.local",
            PasswordHash = PasswordHasher.Hash("Password123!"),
            Role = "admin",
            ClientIdsJson = "[]"
        });

        await UpsertUser(db, new User
        {
            Id = "u_acc_001",
            FullName = "Default Accountant",
            Email = "accountant@secureportal.local",
            PasswordHash = PasswordHasher.Hash("Password123!"),
            Role = "accountant",
            ClientIdsJson = "[]"
        });

        await UpsertUser(db, new User
        {
            Id = "u_client_001",
            FullName = "Default Client",
            Email = "client@secureportal.local",
            PasswordHash = PasswordHasher.Hash("Password123!"),
            Role = "client",
            ClientIdsJson = "[\"c_001\"]"
        });

        var client = await db.Clients.FirstOrDefaultAsync(x => x.Id == "c_001");
        if (client is null)
        {
            db.Clients.Add(new Client
            {
                Id = "c_001",
                Name = "Acme Holdings",
                EntityType = "Pty Ltd",
                Status = "active",
                ComplianceHealth = 92,
                AssignedAccountantId = "u_acc_001",
                PrimaryContact = "Jane Doe",
                Email = "jane.doe@acme.test"
            });
        }

        await db.SaveChangesAsync();
    }

    private static async Task UpsertUser(PortalDbContext db, User expected)
    {
        var byId = await db.Users.FirstOrDefaultAsync(x => x.Id == expected.Id);
        if (byId is null)
        {
            db.Users.Add(expected);
            return;
        }

        byId.FullName = expected.FullName;
        byId.Email = expected.Email;
        byId.PasswordHash = expected.PasswordHash;
        byId.Role = expected.Role;
        byId.ClientIdsJson = expected.ClientIdsJson;
    }
}
