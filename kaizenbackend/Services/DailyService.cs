using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using kaizenbackend.DTOs;

namespace kaizenbackend.Services
{
    public class DailyService : IDailyService
    {
        private readonly IConfiguration _config;
        private readonly HttpClient _httpClient;

        public DailyService(IConfiguration config)
        {
            _config = config;
            _httpClient = new HttpClient();
        }

        public async Task<DailyRoomResponse> CreateRoom(string roomName, int expiryMinutes)
        {
            try
            {
                var apiKey = _config["Daily:ApiKey"];
                var apiUrl = _config["Daily:ApiUrl"];
                var domain = _config["Daily:Domain"];

                if (string.IsNullOrEmpty(apiKey))
                {
                    return new DailyRoomResponse
                    {
                        Success = false,
                        ErrorMessage = "Daily.co API key not configured"
                    };
                }

                // Set up authentication
                _httpClient.DefaultRequestHeaders.Clear();
                _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");

                // Build the room properties WITHOUT recording for free plan
                var roomProperties = new
                {
                    name = roomName,
                    privacy = "public",
                    properties = new
                    {
                        exp = expiryMinutes > 0 ? (int?)(DateTime.UtcNow.AddMinutes(expiryMinutes).Subtract(DateTime.UnixEpoch).TotalSeconds) : null,
                        enable_chat = true,
                        enable_screenshare = true,
                        enable_prejoin_ui = true,
                        lang = "en"
                    }
                };

                var content = new StringContent(
                    JsonSerializer.Serialize(roomProperties),
                    Encoding.UTF8,
                    "application/json"
                );

                var response = await _httpClient.PostAsync($"{apiUrl}/rooms", content);
                var responseJson = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    using var doc = JsonDocument.Parse(responseJson);
                    var root = doc.RootElement;
                    
                    var roomUrl = root.GetProperty("url").GetString();
                    
                    return new DailyRoomResponse
                    {
                        Success = true,
                        RoomUrl = roomUrl,
                        RoomName = roomName
                    };
                }
                else
                {
                    return new DailyRoomResponse
                    {
                        Success = false,
                        ErrorMessage = $"Daily API error: {responseJson}"
                    };
                }
            }
            catch (Exception ex)
            {
                return new DailyRoomResponse
                {
                    Success = false,
                    ErrorMessage = ex.Message
                };
            }
        }

        // ✅ ADD THIS METHOD - Delete a room
        public async Task<bool> DeleteRoom(string roomName)
        {
            try
            {
                var apiKey = _config["Daily:ApiKey"];
                var apiUrl = _config["Daily:ApiUrl"];

                if (string.IsNullOrEmpty(apiKey))
                {
                    Console.WriteLine("Daily.co API key not configured");
                    return false;
                }

                // Set up authentication
                _httpClient.DefaultRequestHeaders.Clear();
                _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");

                // First, get the room to find its ID
                var getResponse = await _httpClient.GetAsync($"{apiUrl}/rooms");
                var getResponseJson = await getResponse.Content.ReadAsStringAsync();

                if (getResponse.IsSuccessStatusCode)
                {
                    using var doc = JsonDocument.Parse(getResponseJson);
                    var rooms = doc.RootElement.GetProperty("data").EnumerateArray();
                    
                    foreach (var room in rooms)
                    {
                        var name = room.GetProperty("name").GetString();
                        if (name == roomName)
                        {
                            var roomId = room.GetProperty("id").GetString();
                            
                            // Delete the room
                            var deleteResponse = await _httpClient.DeleteAsync($"{apiUrl}/rooms/{roomId}");
                            
                            if (deleteResponse.IsSuccessStatusCode)
                            {
                                Console.WriteLine($"Successfully deleted room: {roomName}");
                                return true;
                            }
                            else
                            {
                                var error = await deleteResponse.Content.ReadAsStringAsync();
                                Console.WriteLine($"Failed to delete room: {error}");
                                return false;
                            }
                        }
                    }
                }
                
                Console.WriteLine($"Room not found: {roomName}");
                return false;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error deleting room: {ex.Message}");
                return false;
            }
        }

        // Optional: Add method to delete room by ID (more efficient)
        public async Task<bool> DeleteRoomById(string roomId)
        {
            try
            {
                var apiKey = _config["Daily:ApiKey"];
                var apiUrl = _config["Daily:ApiUrl"];

                if (string.IsNullOrEmpty(apiKey))
                {
                    Console.WriteLine("Daily.co API key not configured");
                    return false;
                }

                _httpClient.DefaultRequestHeaders.Clear();
                _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");

                var response = await _httpClient.DeleteAsync($"{apiUrl}/rooms/{roomId}");
                
                if (response.IsSuccessStatusCode)
                {
                    Console.WriteLine($"Successfully deleted room: {roomId}");
                    return true;
                }
                else
                {
                    var error = await response.Content.ReadAsStringAsync();
                    Console.WriteLine($"Failed to delete room: {error}");
                    return false;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error deleting room: {ex.Message}");
                return false;
            }
        }
    }
}