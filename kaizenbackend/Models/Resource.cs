namespace kaizenbackend.Models
{
    public class Resource
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string Url { get; set; } = string.Empty;
        public int UploadedBy { get; set; }
        public DateTime DateUploaded { get; set; } = DateTime.UtcNow;

        public User Uploader { get; set; } = null!;
    }
}