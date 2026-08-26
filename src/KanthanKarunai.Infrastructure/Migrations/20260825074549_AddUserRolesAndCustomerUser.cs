using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KanthanKarunai.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddUserRolesAndCustomerUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "customer_id",
                table: "users",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_users_customer_id",
                table: "users",
                column: "customer_id");

            migrationBuilder.AddForeignKey(
                name: "FK_users_customers_customer_id",
                table: "users",
                column: "customer_id",
                principalTable: "customers",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_users_customers_customer_id",
                table: "users");

            migrationBuilder.DropIndex(
                name: "IX_users_customer_id",
                table: "users");

            migrationBuilder.DropColumn(
                name: "customer_id",
                table: "users");
        }
    }
}
