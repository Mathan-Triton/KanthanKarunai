using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KanthanKarunai.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddChitAmountTakenFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "adjusted_monthly_payment",
                table: "chits",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "amount_taken",
                table: "chits",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "amount_taken_date",
                table: "chits",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "amount_taken_month",
                table: "chits",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "interest_rate",
                table: "chits",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "adjusted_monthly_payment",
                table: "chits");

            migrationBuilder.DropColumn(
                name: "amount_taken",
                table: "chits");

            migrationBuilder.DropColumn(
                name: "amount_taken_date",
                table: "chits");

            migrationBuilder.DropColumn(
                name: "amount_taken_month",
                table: "chits");

            migrationBuilder.DropColumn(
                name: "interest_rate",
                table: "chits");
        }
    }
}
