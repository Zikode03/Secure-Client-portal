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

        await UpsertFilingRule(db, new FilingRule
        {
            Id = "filing_bank_statement",
            Category = "bank_statement",
            Description = "Business account bank statements eligible for auto-filing.",
            IsEnabled = true,
        });
        await UpsertFilingRule(db, new FilingRule
        {
            Id = "filing_invoices",
            Category = "invoices",
            Description = "Sales and supplier invoice evidence eligible for auto-filing.",
            IsEnabled = true,
        });
        await UpsertFilingRule(db, new FilingRule
        {
            Id = "filing_signed_documents",
            Category = "signed_documents",
            Description = "Signed approvals and authorisations eligible for auto-filing.",
            IsEnabled = true,
        });
        await UpsertFilingRule(db, new FilingRule
        {
            Id = "filing_compliance_record",
            Category = "compliance_record",
            Description = "Compliance support records eligible for auto-filing.",
            IsEnabled = true,
        });
        await UpsertFilingRule(db, new FilingRule
        {
            Id = "filing_payroll_summary",
            Category = "payroll_summary",
            Description = "Payroll summaries and payroll support eligible for auto-filing.",
            IsEnabled = true,
        });
        await UpsertFilingRule(db, new FilingRule
        {
            Id = "filing_tax_working_papers",
            Category = "tax_working_papers",
            Description = "Tax working papers and VAT support eligible for auto-filing.",
            IsEnabled = true,
        });
        await UpsertFilingRule(db, new FilingRule
        {
            Id = "filing_proof_of_payment",
            Category = "proof_of_payment",
            Description = "Payment confirmations and remittance evidence eligible for auto-filing.",
            IsEnabled = true,
        });
        await UpsertFilingRule(db, new FilingRule
        {
            Id = "filing_credit_notes",
            Category = "credit_notes",
            Description = "Credit note support eligible for auto-filing.",
            IsEnabled = true,
        });
        await UpsertFilingRule(db, new FilingRule
        {
            Id = "filing_debit_notes",
            Category = "debit_notes",
            Description = "Debit note support eligible for auto-filing.",
            IsEnabled = true,
        });

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
        byId.UpdatedAtUtc = DateTime.UtcNow;
    }

    private static async Task UpsertFilingRule(PortalDbContext db, FilingRule expected)
    {
        var byId = await db.FilingRules.FirstOrDefaultAsync(x => x.Id == expected.Id);
        if (byId is null)
        {
            db.FilingRules.Add(expected);
            return;
        }

        byId.Category = expected.Category;
        byId.Description = expected.Description;
        byId.IsEnabled = expected.IsEnabled;
        byId.UpdatedAtUtc = DateTime.UtcNow;
    }
}
