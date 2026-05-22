using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SecureClientPortal.Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddRequestCommentsAndEnhanceRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ClientName",
                table: "AppRequests",
                type: "nvarchar(250)",
                maxLength: 250,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ComplianceCategoryId",
                table: "AppRequests",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ComplianceCategoryName",
                table: "AppRequests",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ComplianceItemId",
                table: "AppRequests",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ComplianceItemName",
                table: "AppRequests",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MonthLabel",
                table: "AppRequests",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RelatedDocumentId",
                table: "AppRequests",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RequestType",
                table: "AppRequests",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "general");

            migrationBuilder.AddColumn<string>(
                name: "RequestedByName",
                table: "AppRequests",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "RequestedByRole",
                table: "AppRequests",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "accountant");

            migrationBuilder.AddColumn<string>(
                name: "ArchivedByUserId",
                table: "AppRequests",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ArchivedAtUtc",
                table: "AppRequests",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "AppRequestComments",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    RequestId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    AuthorUserId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    AuthorName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    AuthorRole = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Message = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppRequestComments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AppRequestComments_AppRequests_RequestId",
                        column: x => x.RequestId,
                        principalTable: "AppRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AppRequests_ClientId_ArchivedAtUtc",
                table: "AppRequests",
                columns: new[] { "ClientId", "ArchivedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_AppRequestComments_RequestId_CreatedAtUtc",
                table: "AppRequestComments",
                columns: new[] { "RequestId", "CreatedAtUtc" });

            migrationBuilder.AddCheckConstraint(
                name: "CK_AppRequestComments_AuthorRole",
                table: "AppRequestComments",
                sql: "[AuthorRole] IN ('admin','accountant','client')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AppRequestComments");

            migrationBuilder.DropIndex(
                name: "IX_AppRequests_ClientId_ArchivedAtUtc",
                table: "AppRequests");

            migrationBuilder.DropColumn(
                name: "ClientName",
                table: "AppRequests");

            migrationBuilder.DropColumn(
                name: "ComplianceCategoryId",
                table: "AppRequests");

            migrationBuilder.DropColumn(
                name: "ComplianceCategoryName",
                table: "AppRequests");

            migrationBuilder.DropColumn(
                name: "ComplianceItemId",
                table: "AppRequests");

            migrationBuilder.DropColumn(
                name: "ComplianceItemName",
                table: "AppRequests");

            migrationBuilder.DropColumn(
                name: "MonthLabel",
                table: "AppRequests");

            migrationBuilder.DropColumn(
                name: "RelatedDocumentId",
                table: "AppRequests");

            migrationBuilder.DropColumn(
                name: "RequestType",
                table: "AppRequests");

            migrationBuilder.DropColumn(
                name: "RequestedByName",
                table: "AppRequests");

            migrationBuilder.DropColumn(
                name: "RequestedByRole",
                table: "AppRequests");

            migrationBuilder.DropColumn(
                name: "ArchivedByUserId",
                table: "AppRequests");

            migrationBuilder.DropColumn(
                name: "ArchivedAtUtc",
                table: "AppRequests");
        }
    }
}
