namespace kaizenbackend.DTOs
{
    public class DailyRoomResponse
    {
        public bool Success { get; set; }
        public string? RoomUrl { get; set; }
        public string? RoomName { get; set; }
        public string? ErrorMessage { get; set; }
    }

    public class DailyApiRoomResponse
    {
        public string? id { get; set; }
        public string? name { get; set; }
        public string? url { get; set; }
    }
}