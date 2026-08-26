using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace KanthanKarunai.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddGetChitManagement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "get_chits",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    customer_id = table.Column<int>(type: "integer", nullable: false),
                    principal_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    interest_rate = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false, defaultValue: 1.00m),
                    received_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    outstanding_principal = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    total_interest_paid = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false, defaultValue: 0m),
                    total_principal_paid = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false, defaultValue: 0m),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false, defaultValue: "ACTIVE"),
                    notes = table.Column<string>(type: "text", nullable: true),
                    created_by = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_get_chits", x => x.id);
                    table.ForeignKey(
                        name: "FK_get_chits_customers_customer_id",
                        column: x => x.customer_id,
                        principalTable: "customers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_get_chits_users_created_by",
                        column: x => x.created_by,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "get_chit_payments",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    get_chit_id = table.Column<int>(type: "integer", nullable: false),
                    customer_id = table.Column<int>(type: "integer", nullable: false),
                    payment_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    payment_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    interest_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    principal_paid_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    remaining_principal = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    payment_method = table.Column<string>(type: "text", nullable: false),
                    receipt_no = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    remarks = table.Column<string>(type: "text", nullable: true),
                    collected_by = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_get_chit_payments", x => x.id);
                    table.ForeignKey(
                        name: "FK_get_chit_payments_customers_customer_id",
                        column: x => x.customer_id,
                        principalTable: "customers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_get_chit_payments_get_chits_get_chit_id",
                        column: x => x.get_chit_id,
                        principalTable: "get_chits",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_get_chit_payments_users_collected_by",
                        column: x => x.collected_by,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_get_chit_payments_collected_by",
                table: "get_chit_payments",
                column: "collected_by");

            migrationBuilder.CreateIndex(
                name: "IX_get_chit_payments_customer_id",
                table: "get_chit_payments",
                column: "customer_id");

            migrationBuilder.CreateIndex(
                name: "IX_get_chit_payments_get_chit_id",
                table: "get_chit_payments",
                column: "get_chit_id");

            migrationBuilder.CreateIndex(
                name: "IX_get_chit_payments_payment_date",
                table: "get_chit_payments",
                column: "payment_date");

            migrationBuilder.CreateIndex(
                name: "IX_get_chit_payments_receipt_no",
                table: "get_chit_payments",
                column: "receipt_no",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_get_chits_created_by",
                table: "get_chits",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "IX_get_chits_customer_id",
                table: "get_chits",
                column: "customer_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "get_chit_payments");

            migrationBuilder.DropTable(
                name: "get_chits");
        }
    }
}
