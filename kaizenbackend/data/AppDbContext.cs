using Microsoft.EntityFrameworkCore;
using kaizenbackend.Models;

namespace kaizenbackend.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<ClientProfile> ClientProfiles { get; set; }
        public DbSet<ProfessionalProfile> ProfessionalProfiles { get; set; }
        public DbSet<Admin> Admins { get; set; }
        public DbSet<SelfAssessment> SelfAssessments { get; set; }
        public DbSet<JournalEntry> JournalEntries { get; set; }
        public DbSet<Resource> Resources { get; set; }
        public DbSet<Session> Sessions { get; set; }
        public DbSet<Rating> Ratings { get; set; }
        public DbSet<PlatformSetting> PlatformSettings { get; set; }
        public DbSet<ResourceRating> ResourceRatings { get; set; }
        public DbSet<EmailVerification> EmailVerifications { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // User relationships
            modelBuilder.Entity<User>()
                .HasOne(u => u.ClientProfile)
                .WithOne(c => c.User)
                .HasForeignKey<ClientProfile>(c => c.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<User>()
                .HasOne(u => u.ProfessionalProfile)
                .WithOne(p => p.User)
                .HasForeignKey<ProfessionalProfile>(p => p.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<User>()
                .HasOne<Admin>()
                .WithOne(a => a.User)
                .HasForeignKey<Admin>(a => a.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();

            // SelfAssessment relationship
            modelBuilder.Entity<User>()
               .HasMany<SelfAssessment>()
               .WithOne(s => s.User)
               .HasForeignKey(s => s.UserId)
               .OnDelete(DeleteBehavior.Cascade);

            // JournalEntry relationship
            modelBuilder.Entity<User>()
                .HasMany<JournalEntry>()
                .WithOne(j => j.User)
                .HasForeignKey(j => j.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Resource relationship
            modelBuilder.Entity<Resource>()
                .HasOne(r => r.Uploader)
                .WithMany()
                .HasForeignKey(r => r.UploadedBy)
                .OnDelete(DeleteBehavior.Restrict);

            // Session relationships (only declare once)
            modelBuilder.Entity<Session>()
                .HasOne(s => s.Client)
                .WithMany()
                .HasForeignKey(s => s.ClientId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Session>()
                .HasOne(s => s.Professional)
                .WithMany()
                .HasForeignKey(s => s.ProfessionalId)
                .OnDelete(DeleteBehavior.Restrict);

            // Configure DateTime handling for Session to use timestamp with time zone
            modelBuilder.Entity<Session>()
                .Property(s => s.SessionDate)
                .HasColumnType("timestamp with time zone");

            modelBuilder.Entity<Session>()
                .Property(s => s.CreatedAt)
                .HasColumnType("timestamp with time zone");

            modelBuilder.Entity<Session>()
                .Property(s => s.UpdatedAt)
                .HasColumnType("timestamp with time zone");

            // Configure DateTime handling for other tables if needed
            modelBuilder.Entity<SelfAssessment>()
                .Property(s => s.DateCompleted)
                .HasColumnType("timestamp with time zone");

            modelBuilder.Entity<JournalEntry>()
                .Property(j => j.CreatedAt)
                .HasColumnType("timestamp with time zone");

            modelBuilder.Entity<JournalEntry>()
                .Property(j => j.UpdatedAt)
                .HasColumnType("timestamp with time zone");

            modelBuilder.Entity<Resource>()
                .Property(r => r.DateUploaded)
                .HasColumnType("timestamp with time zone");

                // Rating relationships
modelBuilder.Entity<Rating>()
    .HasOne(r => r.Session)
    .WithMany()
    .HasForeignKey(r => r.SessionId)
    .OnDelete(DeleteBehavior.Cascade);

modelBuilder.Entity<Rating>()
    .HasOne(r => r.Client)
    .WithMany()
    .HasForeignKey(r => r.ClientId)
    .OnDelete(DeleteBehavior.Restrict);

modelBuilder.Entity<Rating>()
    .HasOne(r => r.Professional)
    .WithMany()
    .HasForeignKey(r => r.ProfessionalId)
    .OnDelete(DeleteBehavior.Restrict);

    // PlatformSetting - seed default values
modelBuilder.Entity<PlatformSetting>().HasData(
    new PlatformSetting { Id = 1, DefaultPlatformPercentage = 40, DefaultProfessionalPercentage = 60, UpdatedAt = DateTime.UtcNow }
);

modelBuilder.Entity<ResourceRating>()
    .HasOne(r => r.Resource)
    .WithMany()
    .HasForeignKey(r => r.ResourceId)
    .OnDelete(DeleteBehavior.Cascade);

modelBuilder.Entity<ResourceRating>()
    .HasOne(r => r.User)
    .WithMany()
    .HasForeignKey(r => r.UserId)
    .OnDelete(DeleteBehavior.Restrict);

// Ensure one user can only rate a resource once
modelBuilder.Entity<ResourceRating>()
    .HasIndex(r => new { r.ResourceId, r.UserId })
    .IsUnique();
        }
    }
}