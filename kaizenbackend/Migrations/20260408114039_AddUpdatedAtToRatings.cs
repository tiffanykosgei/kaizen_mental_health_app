using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace kaizenbackend.Migrations
{
    /// <inheritdoc />
    public partial class AddUpdatedAtToRatings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Ratings",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "PlatformSettings",
                keyColumn: "Id",
                keyValue: 1,
                column: "UpdatedAt",
                value: new DateTime(2026, 4, 8, 11, 40, 38, 266, DateTimeKind.Utc).AddTicks(8110));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Ratings");

            migrationBuilder.UpdateData(
                table: "PlatformSettings",
                keyColumn: "Id",
                keyValue: 1,
                column: "UpdatedAt",
                value: new DateTime(2026, 4, 8, 11, 26, 6, 590, DateTimeKind.Utc).AddTicks(2773));
        }
    }
}
