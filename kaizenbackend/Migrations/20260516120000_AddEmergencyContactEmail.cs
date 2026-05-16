using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Infrastructure;
using kaizenbackend.Data;

#nullable disable

namespace kaizenbackend.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260516120000_AddEmergencyContactEmail")]
    public partial class AddEmergencyContactEmail : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "EmergencyContactEmail",
                table: "ClientProfiles",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EmergencyContactEmail",
                table: "ClientProfiles");
        }
    }
}
