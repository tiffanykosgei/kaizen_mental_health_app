using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace kaizenbackend.Migrations
{
    /// <inheritdoc />
    public partial class AddProfessionalAvailability : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "AvailableFromUtc",
                table: "ProfessionalProfiles",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "AvailableUntilUtc",
                table: "ProfessionalProfiles",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsAcceptingSessions",
                table: "ProfessionalProfiles",
                type: "boolean",
                nullable: false,
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AvailableFromUtc",
                table: "ProfessionalProfiles");

            migrationBuilder.DropColumn(
                name: "AvailableUntilUtc",
                table: "ProfessionalProfiles");

            migrationBuilder.DropColumn(
                name: "IsAcceptingSessions",
                table: "ProfessionalProfiles");
        }
    }
}
