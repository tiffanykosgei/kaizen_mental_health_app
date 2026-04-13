using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace kaizenbackend.Migrations
{
    /// <inheritdoc />
    public partial class AddMeetingFieldsToSessions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "MeetingRoomName",
                table: "Sessions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MeetingUrl",
                table: "Sessions",
                type: "text",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "PlatformSettings",
                keyColumn: "Id",
                keyValue: 1,
                column: "UpdatedAt",
                value: new DateTime(2026, 4, 6, 11, 59, 14, 809, DateTimeKind.Utc).AddTicks(212));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MeetingRoomName",
                table: "Sessions");

            migrationBuilder.DropColumn(
                name: "MeetingUrl",
                table: "Sessions");

            migrationBuilder.UpdateData(
                table: "PlatformSettings",
                keyColumn: "Id",
                keyValue: 1,
                column: "UpdatedAt",
                value: new DateTime(2026, 4, 6, 8, 27, 23, 226, DateTimeKind.Utc).AddTicks(6834));
        }
    }
}
