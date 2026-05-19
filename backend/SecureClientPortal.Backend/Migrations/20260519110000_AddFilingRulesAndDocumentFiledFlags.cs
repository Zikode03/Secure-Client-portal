using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SecureClientPortal.Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddFilingRulesAndDocumentFiledFlags : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Filed metadata supports immutable filing-register behavior.
            migrationBuilder.AddColumn<DateTime>(
                name: "FiledAtUtc",
                table: "AppDocuments",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FiledByUserId",
                table: "AppDocuments",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsFiled",
                table: "AppDocuments",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_AppDocuments_ClientId_IsFiled",
                table: "AppDocuments",
                columns: new[] { "ClientId", "IsFiled" });

            // Filing rules table enables controlled allowlisting of auto-filed categories.
            migrationBuilder.CreateTable(
                name: "AppFilingRules",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Category = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    IsEnabled = table.Column<bool>(type: "bit", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(280)", maxLength: 280, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppFilingRules", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AppFilingRules_Category",
                table: "AppFilingRules",
                column: "Category",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AppFilingRules");

            migrationBuilder.DropIndex(
                name: "IX_AppDocuments_ClientId_IsFiled",
                table: "AppDocuments");

            migrationBuilder.DropColumn(
                name: "FiledAtUtc",
                table: "AppDocuments");

            migrationBuilder.DropColumn(
                name: "FiledByUserId",
                table: "AppDocuments");

            migrationBuilder.DropColumn(
                name: "IsFiled",
                table: "AppDocuments");
        }
    }
}

