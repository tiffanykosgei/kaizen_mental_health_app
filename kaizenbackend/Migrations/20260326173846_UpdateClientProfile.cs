using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace kaizenbackend.Migrations
{
    /// <inheritdoc />
    public partial class UpdateClientProfile : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "MedicalHistory",
                table: "ClientProfiles",
                newName: "MedicalNotes");

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
                name: "EmergencyContactPhone",
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

            migrationBuilder.AddColumn<bool>(
                name: "PreviousTherapy",
                table: "ClientProfiles",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CurrentMedications",
                table: "ClientProfiles");

            migrationBuilder.DropColumn(
                name: "Diagnoses",
                table: "ClientProfiles");

            migrationBuilder.DropColumn(
                name: "EmergencyContactPhone",
                table: "ClientProfiles");

            migrationBuilder.DropColumn(
                name: "KnownTriggers",
                table: "ClientProfiles");

            migrationBuilder.DropColumn(
                name: "PreviousTherapy",
                table: "ClientProfiles");

            migrationBuilder.RenameColumn(
                name: "MedicalNotes",
                table: "ClientProfiles",
                newName: "MedicalHistory");
        }
    }
}
