using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LeybedikInfoKiosk.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddFileSizeAndHash : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Materials_Users_DeletedByUserId",
                table: "Materials");

            migrationBuilder.DropForeignKey(
                name: "FK_Materials_Users_RejectedByUserId",
                table: "Materials");

            migrationBuilder.DropForeignKey(
                name: "FK_Materials_Users_RestoredByUserId",
                table: "Materials");

            migrationBuilder.AddColumn<string>(
                name: "FileHashSha256",
                table: "Materials",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "FileSizeBytes",
                table: "Materials",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Materials_Users_DeletedByUserId",
                table: "Materials",
                column: "DeletedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Materials_Users_RejectedByUserId",
                table: "Materials",
                column: "RejectedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Materials_Users_RestoredByUserId",
                table: "Materials",
                column: "RestoredByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Materials_Users_DeletedByUserId",
                table: "Materials");

            migrationBuilder.DropForeignKey(
                name: "FK_Materials_Users_RejectedByUserId",
                table: "Materials");

            migrationBuilder.DropForeignKey(
                name: "FK_Materials_Users_RestoredByUserId",
                table: "Materials");

            migrationBuilder.DropColumn(
                name: "FileHashSha256",
                table: "Materials");

            migrationBuilder.DropColumn(
                name: "FileSizeBytes",
                table: "Materials");

            migrationBuilder.AddForeignKey(
                name: "FK_Materials_Users_DeletedByUserId",
                table: "Materials",
                column: "DeletedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Materials_Users_RejectedByUserId",
                table: "Materials",
                column: "RejectedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Materials_Users_RestoredByUserId",
                table: "Materials",
                column: "RestoredByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
