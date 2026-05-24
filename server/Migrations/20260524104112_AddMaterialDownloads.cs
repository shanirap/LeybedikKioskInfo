using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LeybedikInfoKiosk.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddMaterialDownloads : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MaterialDownloads",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MaterialId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    DownloadedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MaterialDownloads", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MaterialDownloads_Materials_MaterialId",
                        column: x => x.MaterialId,
                        principalTable: "Materials",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MaterialDownloads_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MaterialDownloads_MaterialId_UserId",
                table: "MaterialDownloads",
                columns: new[] { "MaterialId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MaterialDownloads_UserId",
                table: "MaterialDownloads",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MaterialDownloads");
        }
    }
}
