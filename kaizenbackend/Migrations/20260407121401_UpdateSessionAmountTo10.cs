using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace kaizenbackend.Migrations
{
    /// <inheritdoc />
    public partial class UpdateSessionAmountTo10 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "PlatformSettings",
                keyColumn: "Id",
                keyValue: 1,
                column: "UpdatedAt",
                value: new DateTime(2026, 4, 7, 12, 14, 0, 50, DateTimeKind.Utc).AddTicks(5124));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "PlatformSettings",
                keyColumn: "Id",
                keyValue: 1,
                column: "UpdatedAt",
                value: new DateTime(2026, 4, 7, 10, 58, 51, 921, DateTimeKind.Utc).AddTicks(941));
        }
    }
}
