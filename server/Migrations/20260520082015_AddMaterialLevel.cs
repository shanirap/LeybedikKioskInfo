using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LeybedikInfoKiosk.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddMaterialLevel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Level",
                table: "Materials",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Level",
                table: "Materials");
        }
    }
}
