using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace kaizenbackend.Migrations
{
    /// <inheritdoc />
    public partial class AddPaymentFieldsToProfessionalProfile : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "PlatformSettings",
                keyColumn: "Id",
                keyValue: 1,
                column: "UpdatedAt",
                value: new DateTime(2026, 4, 6, 8, 27, 23, 226, DateTimeKind.Utc).AddTicks(6834));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "PlatformSettings",
                keyColumn: "Id",
                keyValue: 1,
                column: "UpdatedAt",
                value: new DateTime(2026, 4, 6, 7, 57, 33, 69, DateTimeKind.Utc).AddTicks(8945));
        }
    }
}
