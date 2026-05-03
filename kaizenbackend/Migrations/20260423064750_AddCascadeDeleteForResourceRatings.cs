using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace kaizenbackend.Migrations
{
    /// <inheritdoc />
    public partial class AddCascadeDeleteForResourceRatings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ResourceRatings_Users_UserId",
                table: "ResourceRatings");

            migrationBuilder.UpdateData(
                table: "PlatformSettings",
                keyColumn: "Id",
                keyValue: 1,
                column: "UpdatedAt",
                value: new DateTime(2026, 4, 23, 6, 47, 49, 915, DateTimeKind.Utc).AddTicks(6752));

            migrationBuilder.AddForeignKey(
                name: "FK_ResourceRatings_Users_UserId",
                table: "ResourceRatings",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ResourceRatings_Users_UserId",
                table: "ResourceRatings");

            migrationBuilder.UpdateData(
                table: "PlatformSettings",
                keyColumn: "Id",
                keyValue: 1,
                column: "UpdatedAt",
                value: new DateTime(2026, 4, 22, 13, 58, 5, 887, DateTimeKind.Utc).AddTicks(3108));

            migrationBuilder.AddForeignKey(
                name: "FK_ResourceRatings_Users_UserId",
                table: "ResourceRatings",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
