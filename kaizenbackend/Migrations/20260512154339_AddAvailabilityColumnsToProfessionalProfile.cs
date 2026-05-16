using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace kaizenbackend.Migrations
{
    /// <inheritdoc />
    public partial class AddAvailabilityColumnsToProfessionalProfile : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CurrentMedications",
                table: "ClientProfiles");

            migrationBuilder.DropColumn(
                name: "Diagnoses",
                table: "ClientProfiles");

            migrationBuilder.DropColumn(
                name: "KnownTriggers",
                table: "ClientProfiles");

            migrationBuilder.DropColumn(
                name: "MedicalNotes",
                table: "ClientProfiles");

            migrationBuilder.DropColumn(
                name: "PreviousTherapy",
                table: "ClientProfiles");

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

            migrationBuilder.UpdateData(
                table: "PlatformSettings",
                keyColumn: "Id",
                keyValue: 1,
                column: "UpdatedAt",
                value: new DateTime(2026, 5, 12, 15, 43, 38, 435, DateTimeKind.Utc).AddTicks(6343));
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

            migrationBuilder.AddColumn<string>(
                name: "CurrentMedications",
                table: "ClientProfiles",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Diagnoses",
                table: "ClientProfiles",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "KnownTriggers",
                table: "ClientProfiles",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "MedicalNotes",
                table: "ClientProfiles",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "PreviousTherapy",
                table: "ClientProfiles",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.UpdateData(
                table: "PlatformSettings",
                keyColumn: "Id",
                keyValue: 1,
                column: "UpdatedAt",
                value: new DateTime(2026, 5, 4, 13, 50, 15, 242, DateTimeKind.Utc).AddTicks(1315));
        }
    }
}
