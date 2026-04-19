using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace kaizenbackend.Migrations
{
    /// <inheritdoc />
    public partial class AddProfessionalProfileFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<decimal>(
                name: "TotalEarnings",
                table: "ProfessionalProfiles",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m,
                oldClrType: typeof(decimal),
                oldType: "numeric");

            migrationBuilder.AlterColumn<string>(
                name: "Specialization",
                table: "ProfessionalProfiles",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<decimal>(
                name: "PendingPayout",
                table: "ProfessionalProfiles",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m,
                oldClrType: typeof(decimal),
                oldType: "numeric");

            migrationBuilder.AlterColumn<string>(
                name: "PaymentMethod",
                table: "ProfessionalProfiles",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Mpesa",
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "PaymentAccount",
                table: "ProfessionalProfiles",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<decimal>(
                name: "PaidOut",
                table: "ProfessionalProfiles",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m,
                oldClrType: typeof(decimal),
                oldType: "numeric");

            migrationBuilder.AlterColumn<string>(
                name: "Bio",
                table: "ProfessionalProfiles",
                type: "character varying(5000)",
                maxLength: 5000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<decimal>(
                name: "AverageRating",
                table: "ProfessionalProfiles",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m,
                oldClrType: typeof(decimal),
                oldType: "numeric");

            migrationBuilder.AddColumn<string>(
                name: "Certifications",
                table: "ProfessionalProfiles",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Education",
                table: "ProfessionalProfiles",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Languages",
                table: "ProfessionalProfiles",
                type: "jsonb",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "LicenseNumber",
                table: "ProfessionalProfiles",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ProfessionalLinks",
                table: "ProfessionalProfiles",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "YearsOfExperience",
                table: "ProfessionalProfiles",
                type: "character varying(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "");

            migrationBuilder.UpdateData(
                table: "PlatformSettings",
                keyColumn: "Id",
                keyValue: 1,
                column: "UpdatedAt",
                value: new DateTime(2026, 4, 17, 11, 40, 24, 369, DateTimeKind.Utc).AddTicks(3556));

            migrationBuilder.CreateIndex(
                name: "IX_ProfessionalProfiles_LicenseNumber",
                table: "ProfessionalProfiles",
                column: "LicenseNumber");

            migrationBuilder.CreateIndex(
                name: "IX_ProfessionalProfiles_Specialization",
                table: "ProfessionalProfiles",
                column: "Specialization");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ProfessionalProfiles_LicenseNumber",
                table: "ProfessionalProfiles");

            migrationBuilder.DropIndex(
                name: "IX_ProfessionalProfiles_Specialization",
                table: "ProfessionalProfiles");

            migrationBuilder.DropColumn(
                name: "Certifications",
                table: "ProfessionalProfiles");

            migrationBuilder.DropColumn(
                name: "Education",
                table: "ProfessionalProfiles");

            migrationBuilder.DropColumn(
                name: "Languages",
                table: "ProfessionalProfiles");

            migrationBuilder.DropColumn(
                name: "LicenseNumber",
                table: "ProfessionalProfiles");

            migrationBuilder.DropColumn(
                name: "ProfessionalLinks",
                table: "ProfessionalProfiles");

            migrationBuilder.DropColumn(
                name: "YearsOfExperience",
                table: "ProfessionalProfiles");

            migrationBuilder.AlterColumn<decimal>(
                name: "TotalEarnings",
                table: "ProfessionalProfiles",
                type: "numeric",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,2)",
                oldPrecision: 18,
                oldScale: 2,
                oldDefaultValue: 0m);

            migrationBuilder.AlterColumn<string>(
                name: "Specialization",
                table: "ProfessionalProfiles",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(200)",
                oldMaxLength: 200);

            migrationBuilder.AlterColumn<decimal>(
                name: "PendingPayout",
                table: "ProfessionalProfiles",
                type: "numeric",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,2)",
                oldPrecision: 18,
                oldScale: 2,
                oldDefaultValue: 0m);

            migrationBuilder.AlterColumn<string>(
                name: "PaymentMethod",
                table: "ProfessionalProfiles",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20,
                oldDefaultValue: "Mpesa");

            migrationBuilder.AlterColumn<string>(
                name: "PaymentAccount",
                table: "ProfessionalProfiles",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100);

            migrationBuilder.AlterColumn<decimal>(
                name: "PaidOut",
                table: "ProfessionalProfiles",
                type: "numeric",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,2)",
                oldPrecision: 18,
                oldScale: 2,
                oldDefaultValue: 0m);

            migrationBuilder.AlterColumn<string>(
                name: "Bio",
                table: "ProfessionalProfiles",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(5000)",
                oldMaxLength: 5000);

            migrationBuilder.AlterColumn<decimal>(
                name: "AverageRating",
                table: "ProfessionalProfiles",
                type: "numeric",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,2)",
                oldPrecision: 18,
                oldScale: 2,
                oldDefaultValue: 0m);

            migrationBuilder.UpdateData(
                table: "PlatformSettings",
                keyColumn: "Id",
                keyValue: 1,
                column: "UpdatedAt",
                value: new DateTime(2026, 4, 13, 7, 31, 45, 69, DateTimeKind.Utc).AddTicks(8401));
        }
    }
}
