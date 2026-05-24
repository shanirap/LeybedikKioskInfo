using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LeybedikInfoKiosk.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddMaterialSoftDelete : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAtUtc",
                table: "Materials",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "Materials",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DeletedAtUtc",
                table: "Materials");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "Materials");
        }
    }
}
