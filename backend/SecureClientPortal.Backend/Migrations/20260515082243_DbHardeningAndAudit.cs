using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SecureClientPortal.Backend.Migrations
{
    /// <inheritdoc />
    public partial class DbHardeningAndAudit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAtUtc",
                table: "AppUsers",
                type: "datetime2",
                nullable: false,
                defaultValueSql: "SYSUTCDATETIME()");

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAtUtc",
                table: "AppTasks",
                type: "datetime2",
                nullable: false,
                defaultValueSql: "SYSUTCDATETIME()");

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAtUtc",
                table: "AppRequests",
                type: "datetime2",
                nullable: false,
                defaultValueSql: "SYSUTCDATETIME()");

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAtUtc",
                table: "AppDocuments",
                type: "datetime2",
                nullable: false,
                defaultValueSql: "SYSUTCDATETIME()");

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAtUtc",
                table: "AppClients",
                type: "datetime2",
                nullable: false,
                defaultValueSql: "SYSUTCDATETIME()");

            migrationBuilder.AddCheckConstraint(
                name: "CK_AppUsers_Role",
                table: "AppUsers",
                sql: "[Role] IN ('admin','accountant','client')");

            migrationBuilder.CreateIndex(
                name: "IX_AppTasks_DueDateUtc",
                table: "AppTasks",
                column: "DueDateUtc");

            migrationBuilder.AddCheckConstraint(
                name: "CK_AppTasks_Priority",
                table: "AppTasks",
                sql: "[Priority] IN ('low','medium','high','urgent')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_AppTasks_Status",
                table: "AppTasks",
                sql: "[Status] IN ('todo','in_progress','blocked','done')");

            migrationBuilder.CreateIndex(
                name: "IX_AppRequests_DueDateUtc",
                table: "AppRequests",
                column: "DueDateUtc");

            migrationBuilder.AddCheckConstraint(
                name: "CK_AppRequests_Priority",
                table: "AppRequests",
                sql: "[Priority] IN ('low','medium','high','urgent')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_AppRequests_Status",
                table: "AppRequests",
                sql: "[Status] IN ('open','awaiting_client','awaiting_accountant','resolved')");

            migrationBuilder.CreateIndex(
                name: "IX_AppDocuments_UploadedAtUtc",
                table: "AppDocuments",
                column: "UploadedAtUtc");

            migrationBuilder.AddCheckConstraint(
                name: "CK_AppDocuments_Status",
                table: "AppDocuments",
                sql: "[Status] IN ('pending','under_review','accepted','rejected','filed')");

            migrationBuilder.CreateIndex(
                name: "IX_AppClients_AssignedAccountantId",
                table: "AppClients",
                column: "AssignedAccountantId");

            migrationBuilder.CreateIndex(
                name: "IX_AppClients_Status",
                table: "AppClients",
                column: "Status");

            migrationBuilder.AddCheckConstraint(
                name: "CK_AppClients_ComplianceHealth",
                table: "AppClients",
                sql: "[ComplianceHealth] >= 0 AND [ComplianceHealth] <= 100");

            migrationBuilder.AddCheckConstraint(
                name: "CK_AppClients_Status",
                table: "AppClients",
                sql: "[Status] IN ('pending','active','at_risk','archived')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_AppUsers_Role",
                table: "AppUsers");

            migrationBuilder.DropIndex(
                name: "IX_AppTasks_DueDateUtc",
                table: "AppTasks");

            migrationBuilder.DropCheckConstraint(
                name: "CK_AppTasks_Priority",
                table: "AppTasks");

            migrationBuilder.DropCheckConstraint(
                name: "CK_AppTasks_Status",
                table: "AppTasks");

            migrationBuilder.DropIndex(
                name: "IX_AppRequests_DueDateUtc",
                table: "AppRequests");

            migrationBuilder.DropCheckConstraint(
                name: "CK_AppRequests_Priority",
                table: "AppRequests");

            migrationBuilder.DropCheckConstraint(
                name: "CK_AppRequests_Status",
                table: "AppRequests");

            migrationBuilder.DropIndex(
                name: "IX_AppDocuments_UploadedAtUtc",
                table: "AppDocuments");

            migrationBuilder.DropCheckConstraint(
                name: "CK_AppDocuments_Status",
                table: "AppDocuments");

            migrationBuilder.DropIndex(
                name: "IX_AppClients_AssignedAccountantId",
                table: "AppClients");

            migrationBuilder.DropIndex(
                name: "IX_AppClients_Status",
                table: "AppClients");

            migrationBuilder.DropCheckConstraint(
                name: "CK_AppClients_ComplianceHealth",
                table: "AppClients");

            migrationBuilder.DropCheckConstraint(
                name: "CK_AppClients_Status",
                table: "AppClients");

            migrationBuilder.DropColumn(
                name: "UpdatedAtUtc",
                table: "AppUsers");

            migrationBuilder.DropColumn(
                name: "UpdatedAtUtc",
                table: "AppTasks");

            migrationBuilder.DropColumn(
                name: "UpdatedAtUtc",
                table: "AppRequests");

            migrationBuilder.DropColumn(
                name: "UpdatedAtUtc",
                table: "AppDocuments");

            migrationBuilder.DropColumn(
                name: "UpdatedAtUtc",
                table: "AppClients");
        }
    }
}
