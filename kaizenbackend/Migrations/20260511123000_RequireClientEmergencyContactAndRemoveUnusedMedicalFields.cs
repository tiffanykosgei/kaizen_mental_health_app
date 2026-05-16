using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace kaizenbackend.Migrations
{
    /// <inheritdoc />
    public partial class RequireClientEmergencyContactAndRemoveUnusedMedicalFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "CurrentMedications", table: "ClientProfiles");
            migrationBuilder.DropColumn(name: "Diagnoses", table: "ClientProfiles");
            migrationBuilder.DropColumn(name: "KnownTriggers", table: "ClientProfiles");
            migrationBuilder.DropColumn(name: "MedicalNotes", table: "ClientProfiles");
            migrationBuilder.DropColumn(name: "PreviousTherapy", table: "ClientProfiles");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(name: "CurrentMedications", table: "ClientProfiles", type: "text", nullable: false, defaultValue: "");
            migrationBuilder.AddColumn<string>(name: "Diagnoses", table: "ClientProfiles", type: "text", nullable: false, defaultValue: "");
            migrationBuilder.AddColumn<string>(name: "KnownTriggers", table: "ClientProfiles", type: "text", nullable: false, defaultValue: "");
            migrationBuilder.AddColumn<string>(name: "MedicalNotes", table: "ClientProfiles", type: "text", nullable: false, defaultValue: "");
            migrationBuilder.AddColumn<bool>(name: "PreviousTherapy", table: "ClientProfiles", type: "boolean", nullable: false, defaultValue: false);
        }
    }
}
