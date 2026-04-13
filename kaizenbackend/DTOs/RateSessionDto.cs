namespace kaizenbackend.DTOs
{
    public class RateSessionDto
    {
        public int Rating { get; set; } // 1-5 stars
        public string? Review { get; set; } // Optional review text
    }
}