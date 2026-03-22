using Microsoft.EntityFrameworkCore;
using kaizenbackend.Models;

namespace kaizenbackend.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
    }
}