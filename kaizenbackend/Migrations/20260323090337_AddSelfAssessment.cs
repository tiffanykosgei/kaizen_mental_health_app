using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace kaizenbackend.Migrations
{
    /// <inheritdoc />
    public partial class AddSelfAssessment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SelfAssessments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    DateCompleted = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AnxietyScore = table.Column<double>(type: "double precision", nullable: false),
                    DepressionScore = table.Column<double>(type: "double precision", nullable: false),
                    LonelinessScore = table.Column<double>(type: "double precision", nullable: false),
                    OverallScore = table.Column<double>(type: "double precision", nullable: false),
                    AnxietyLevel = table.Column<string>(type: "text", nullable: false),
                    DepressionLevel = table.Column<string>(type: "text", nullable: false),
                    LonelinessLevel = table.Column<string>(type: "text", nullable: false),
                    OverallLevel = table.Column<string>(type: "text", nullable: false),
                    Primaryconcern = table.Column<string>(type: "text", nullable: false),
                    ResultSummary = table.Column<string>(type: "text", nullable: false),
                    Q1 = table.Column<int>(type: "integer", nullable: false),
                    Q2 = table.Column<int>(type: "integer", nullable: false),
                    Q3 = table.Column<int>(type: "integer", nullable: false),
                    Q4 = table.Column<int>(type: "integer", nullable: false),
                    Q5 = table.Column<int>(type: "integer", nullable: false),
                    Q6 = table.Column<int>(type: "integer", nullable: false),
                    Q7 = table.Column<int>(type: "integer", nullable: false),
                    Q8 = table.Column<int>(type: "integer", nullable: false),
                    Q9 = table.Column<int>(type: "integer", nullable: false),
                    Q10 = table.Column<int>(type: "integer", nullable: false),
                    Q11 = table.Column<int>(type: "integer", nullable: false),
                    Q12 = table.Column<int>(type: "integer", nullable: false),
                    Q13 = table.Column<int>(type: "integer", nullable: false),
                    Q14 = table.Column<int>(type: "integer", nullable: false),
                    Q15 = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SelfAssessments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SelfAssessments_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SelfAssessments_UserId",
                table: "SelfAssessments",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SelfAssessments");
        }
    }
}
