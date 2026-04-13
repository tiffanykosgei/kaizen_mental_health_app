using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace kaizenbackend.Migrations
{
    /// <inheritdoc />
    public partial class AddRatingsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "PlatformSettings",
                keyColumn: "Id",
                keyValue: 1,
                column: "UpdatedAt",
                value: new DateTime(2026, 4, 7, 9, 35, 59, 547, DateTimeKind.Utc).AddTicks(829));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "PlatformSettings",
                keyColumn: "Id",
                keyValue: 1,
                column: "UpdatedAt",
                value: new DateTime(2026, 4, 7, 9, 31, 58, 358, DateTimeKind.Utc).AddTicks(3833));
        }
    }
}
