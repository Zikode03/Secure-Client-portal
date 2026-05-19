using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SecureClientPortal.Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddDraftGuardAndDocumentComments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_AppDocuments_Status",
                table: "AppDocuments");

            migrationBuilder.AddCheckConstraint(
                name: "CK_AppDocuments_Status",
                table: "AppDocuments",
                sql: "[Status] IN ('draft','pending','under_review','accepted','rejected','filed')");

            migrationBuilder.CreateTable(
                name: "AppDocumentComments",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    DocumentId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    AuthorUserId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    AuthorRole = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Message = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppDocumentComments", x => x.Id);
                    table.CheckConstraint("CK_AppDocumentComments_AuthorRole", "[AuthorRole] IN ('admin','accountant','client')");
                });

            migrationBuilder.CreateIndex(
                name: "IX_AppDocumentComments_DocumentId_CreatedAtUtc",
                table: "AppDocumentComments",
                columns: new[] { "DocumentId", "CreatedAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AppDocumentComments");

            migrationBuilder.DropCheckConstraint(
                name: "CK_AppDocuments_Status",
                table: "AppDocuments");

            migrationBuilder.AddCheckConstraint(
                name: "CK_AppDocuments_Status",
                table: "AppDocuments",
                sql: "[Status] IN ('pending','under_review','accepted','rejected','filed')");
        }
    }
}

