using Microsoft.EntityFrameworkCore;
using SecureClientPortal.Backend.Models;

namespace SecureClientPortal.Backend.Data;

public class PortalDbContext : DbContext
{
    public PortalDbContext(DbContextOptions<PortalDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Client> Clients => Set<Client>();
    public DbSet<Document> Documents => Set<Document>();
    public DbSet<DocumentComment> DocumentComments => Set<DocumentComment>();
    public DbSet<FilingRule> FilingRules => Set<FilingRule>();
    public DbSet<TaskItem> Tasks => Set<TaskItem>();
    public DbSet<RequestItem> Requests => Set<RequestItem>();
    public DbSet<SystemSetting> SystemSettings => Set<SystemSetting>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("AppUsers");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasMaxLength(100);
            entity.Property(x => x.Email).HasMaxLength(320).IsRequired();
            entity.HasIndex(x => x.Email).IsUnique();
            entity.Property(x => x.FullName).HasMaxLength(200).IsRequired();
            entity.Property(x => x.Role).HasMaxLength(50).IsRequired();
            entity.Property(x => x.PasswordHash).HasMaxLength(500).IsRequired();
            entity.Property(x => x.ClientIdsJson).HasColumnType("nvarchar(max)").IsRequired();
            entity.Property(x => x.ProfileJson).HasColumnType("nvarchar(max)");
            entity.Property(x => x.SecurityJson).HasColumnType("nvarchar(max)");
            entity.Property(x => x.CreatedAtUtc).HasDefaultValueSql("SYSUTCDATETIME()");
            entity.Property(x => x.UpdatedAtUtc).HasDefaultValueSql("SYSUTCDATETIME()");
            entity.ToTable(table =>
            {
                table.HasCheckConstraint("CK_AppUsers_Role", "[Role] IN ('admin','accountant','client')");
            });
        });

        modelBuilder.Entity<Client>(entity =>
        {
            entity.ToTable("AppClients");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasMaxLength(100);
            entity.Property(x => x.Name).HasMaxLength(250).IsRequired();
            entity.Property(x => x.EntityType).HasMaxLength(50).IsRequired();
            entity.Property(x => x.Status).HasMaxLength(30).IsRequired();
            entity.Property(x => x.AssignedAccountantId).HasMaxLength(100).IsRequired();
            entity.Property(x => x.PrimaryContact).HasMaxLength(200).IsRequired();
            entity.Property(x => x.Email).HasMaxLength(320).IsRequired();
            entity.Property(x => x.CreatedAtUtc).HasDefaultValueSql("SYSUTCDATETIME()");
            entity.Property(x => x.UpdatedAtUtc).HasDefaultValueSql("SYSUTCDATETIME()");
            entity.HasIndex(x => x.AssignedAccountantId);
            entity.HasIndex(x => x.Status);
            entity.ToTable(table =>
            {
                table.HasCheckConstraint("CK_AppClients_Status", "[Status] IN ('pending','active','at_risk','archived')");
                table.HasCheckConstraint("CK_AppClients_ComplianceHealth", "[ComplianceHealth] >= 0 AND [ComplianceHealth] <= 100");
            });
        });

        modelBuilder.Entity<Document>(entity =>
        {
            entity.ToTable("AppDocuments");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasMaxLength(100);
            entity.Property(x => x.ClientId).HasMaxLength(100).IsRequired();
            entity.Property(x => x.Name).HasMaxLength(260).IsRequired();
            entity.Property(x => x.Category).HasMaxLength(80).IsRequired();
            entity.Property(x => x.Status).HasMaxLength(30).IsRequired();
            entity.Property(x => x.StorageKey).HasMaxLength(500);
            entity.Property(x => x.UploadedByUserId).HasMaxLength(100).IsRequired();
            entity.Property(x => x.FiledByUserId).HasMaxLength(100);
            entity.Property(x => x.UploadedAtUtc).HasDefaultValueSql("SYSUTCDATETIME()");
            entity.Property(x => x.UpdatedAtUtc).HasDefaultValueSql("SYSUTCDATETIME()");
            entity.HasIndex(x => new { x.ClientId, x.IsFiled });
            entity.HasIndex(x => new { x.ClientId, x.Status });
            entity.HasIndex(x => x.UploadedAtUtc);
            entity.ToTable(table =>
            {
                table.HasCheckConstraint("CK_AppDocuments_Status", "[Status] IN ('draft','pending','under_review','accepted','rejected','filed')");
            });
        });

        modelBuilder.Entity<DocumentComment>(entity =>
        {
            entity.ToTable("AppDocumentComments");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasMaxLength(100);
            entity.Property(x => x.DocumentId).HasMaxLength(100).IsRequired();
            entity.Property(x => x.AuthorUserId).HasMaxLength(100).IsRequired();
            entity.Property(x => x.AuthorRole).HasMaxLength(30).IsRequired();
            entity.Property(x => x.Message).HasMaxLength(2000).IsRequired();
            entity.Property(x => x.CreatedAtUtc).HasDefaultValueSql("SYSUTCDATETIME()");
            entity.HasIndex(x => new { x.DocumentId, x.CreatedAtUtc });
            entity.ToTable(table =>
            {
                table.HasCheckConstraint("CK_AppDocumentComments_AuthorRole", "[AuthorRole] IN ('admin','accountant','client')");
            });
        });

        modelBuilder.Entity<FilingRule>(entity =>
        {
            entity.ToTable("AppFilingRules");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasMaxLength(100);
            entity.Property(x => x.Category).HasMaxLength(80).IsRequired();
            entity.Property(x => x.Description).HasMaxLength(280).IsRequired();
            entity.Property(x => x.CreatedAtUtc).HasDefaultValueSql("SYSUTCDATETIME()");
            entity.Property(x => x.UpdatedAtUtc).HasDefaultValueSql("SYSUTCDATETIME()");
            entity.HasIndex(x => x.Category).IsUnique();
        });

        modelBuilder.Entity<TaskItem>(entity =>
        {
            entity.ToTable("AppTasks");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasMaxLength(100);
            entity.Property(x => x.ClientId).HasMaxLength(100).IsRequired();
            entity.Property(x => x.Title).HasMaxLength(200).IsRequired();
            entity.Property(x => x.Status).HasMaxLength(30).IsRequired();
            entity.Property(x => x.Priority).HasMaxLength(20).IsRequired();
            entity.Property(x => x.CreatedByUserId).HasMaxLength(100).IsRequired();
            entity.Property(x => x.CreatedAtUtc).HasDefaultValueSql("SYSUTCDATETIME()");
            entity.Property(x => x.UpdatedAtUtc).HasDefaultValueSql("SYSUTCDATETIME()");
            entity.HasIndex(x => new { x.ClientId, x.Status });
            entity.HasIndex(x => x.DueDateUtc);
            entity.ToTable(table =>
            {
                table.HasCheckConstraint("CK_AppTasks_Status", "[Status] IN ('todo','in_progress','blocked','done')");
                table.HasCheckConstraint("CK_AppTasks_Priority", "[Priority] IN ('low','medium','high','urgent')");
            });
        });

        modelBuilder.Entity<RequestItem>(entity =>
        {
            entity.ToTable("AppRequests");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasMaxLength(100);
            entity.Property(x => x.ClientId).HasMaxLength(100).IsRequired();
            entity.Property(x => x.Title).HasMaxLength(200).IsRequired();
            entity.Property(x => x.Description).HasColumnType("nvarchar(max)").IsRequired();
            entity.Property(x => x.Priority).HasMaxLength(20).IsRequired();
            entity.Property(x => x.Status).HasMaxLength(30).IsRequired();
            entity.Property(x => x.RequestedByUserId).HasMaxLength(100).IsRequired();
            entity.Property(x => x.RequestedAtUtc).HasDefaultValueSql("SYSUTCDATETIME()");
            entity.Property(x => x.UpdatedAtUtc).HasDefaultValueSql("SYSUTCDATETIME()");
            entity.HasIndex(x => new { x.ClientId, x.Status });
            entity.HasIndex(x => x.DueDateUtc);
            entity.ToTable(table =>
            {
                table.HasCheckConstraint("CK_AppRequests_Status", "[Status] IN ('open','awaiting_client','awaiting_accountant','resolved')");
                table.HasCheckConstraint("CK_AppRequests_Priority", "[Priority] IN ('low','medium','high','urgent')");
            });
        });

        modelBuilder.Entity<SystemSetting>(entity =>
        {
            entity.ToTable("AppSystemSettings");
            entity.HasKey(x => x.Key);
            entity.Property(x => x.Key).HasMaxLength(120);
            entity.Property(x => x.ValueJson).HasColumnType("nvarchar(max)").IsRequired();
            entity.Property(x => x.UpdatedAtUtc).HasDefaultValueSql("SYSUTCDATETIME()");
        });
    }
}
