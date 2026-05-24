using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LeybedikInfoKiosk.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddMaterialArchiveRestoreAndRejection : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Materials_InstrumentId",
                table: "Materials");

            migrationBuilder.DropIndex(
                name: "IX_Materials_UploadedByUserId",
                table: "Materials");

            migrationBuilder.AddColumn<int>(
                name: "DeletedByUserId",
                table: "Materials",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "RejectedAtUtc",
                table: "Materials",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RejectedByUserId",
                table: "Materials",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RejectionReason",
                table: "Materials",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "RestoredAtUtc",
                table: "Materials",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RestoredByUserId",
                table: "Materials",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Materials_CreatedAtUtc",
                table: "Materials",
                column: "CreatedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_Materials_DeletedAtUtc",
                table: "Materials",
                column: "DeletedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_Materials_DeletedByUserId",
                table: "Materials",
                column: "DeletedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Materials_InstrumentId_Status_IsDeleted",
                table: "Materials",
                columns: new[] { "InstrumentId", "Status", "IsDeleted" });

            migrationBuilder.CreateIndex(
                name: "IX_Materials_IsDeleted_Status_ApprovedAtUtc",
                table: "Materials",
                columns: new[] { "IsDeleted", "Status", "ApprovedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_Materials_RejectedByUserId",
                table: "Materials",
                column: "RejectedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Materials_RestoredByUserId",
                table: "Materials",
                column: "RestoredByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Materials_UploadedByUserId_IsDeleted_CreatedAtUtc",
                table: "Materials",
                columns: new[] { "UploadedByUserId", "IsDeleted", "CreatedAtUtc" });

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

            migrationBuilder.DropIndex(
                name: "IX_Materials_CreatedAtUtc",
                table: "Materials");

            migrationBuilder.DropIndex(
                name: "IX_Materials_DeletedAtUtc",
                table: "Materials");

            migrationBuilder.DropIndex(
                name: "IX_Materials_DeletedByUserId",
                table: "Materials");

            migrationBuilder.DropIndex(
                name: "IX_Materials_InstrumentId_Status_IsDeleted",
                table: "Materials");

            migrationBuilder.DropIndex(
                name: "IX_Materials_IsDeleted_Status_ApprovedAtUtc",
                table: "Materials");

            migrationBuilder.DropIndex(
                name: "IX_Materials_RejectedByUserId",
                table: "Materials");

            migrationBuilder.DropIndex(
                name: "IX_Materials_RestoredByUserId",
                table: "Materials");

            migrationBuilder.DropIndex(
                name: "IX_Materials_UploadedByUserId_IsDeleted_CreatedAtUtc",
                table: "Materials");

            migrationBuilder.DropColumn(
                name: "DeletedByUserId",
                table: "Materials");

            migrationBuilder.DropColumn(
                name: "RejectedAtUtc",
                table: "Materials");

            migrationBuilder.DropColumn(
                name: "RejectedByUserId",
                table: "Materials");

            migrationBuilder.DropColumn(
                name: "RejectionReason",
                table: "Materials");

            migrationBuilder.DropColumn(
                name: "RestoredAtUtc",
                table: "Materials");

            migrationBuilder.DropColumn(
                name: "RestoredByUserId",
                table: "Materials");

            migrationBuilder.CreateIndex(
                name: "IX_Materials_InstrumentId",
                table: "Materials",
                column: "InstrumentId");

            migrationBuilder.CreateIndex(
                name: "IX_Materials_UploadedByUserId",
                table: "Materials",
                column: "UploadedByUserId");
        }
    }
}
