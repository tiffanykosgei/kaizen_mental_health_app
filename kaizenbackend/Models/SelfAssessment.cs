namespace kaizenbackend.Models
{
    public class SelfAssessment
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public DateTime DateCompleted { get; set; } = DateTime.UtcNow;

        public double AnxietyScore { get; set; }
        public double DepressionScore { get; set; }
        public double LonelinessScore { get; set; }
        public double OverallScore { get; set; }

        public string AnxietyLevel { get; set; } = string.Empty;
        public string DepressionLevel { get; set; } = string.Empty;
        public string LonelinessLevel { get; set; } = string.Empty;
        public string OverallLevel { get; set; } = string.Empty;

        public string Primaryconcern { get; set; } = string.Empty;
        public string ResultSummary { get; set; } = string.Empty;

        public int Q1 { get; set; } public int Q2 { get; set; }
        public int Q3 { get; set; } public int Q4 { get; set; }
        public int Q5 { get; set; } public int Q6 { get; set; }
        public int Q7 { get; set; } public int Q8 { get; set; }
        public int Q9 { get; set; } public int Q10 { get; set; }
        public int Q11 { get; set; } public int Q12 { get; set; }
        public int Q13 { get; set; } public int Q14 { get; set; }
        public int Q15 { get; set; }

        public User User { get; set; } = null!;
    }
}