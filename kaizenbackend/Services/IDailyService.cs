using System.Threading.Tasks;
using kaizenbackend.DTOs;

namespace kaizenbackend.Services
{
    public interface IDailyService
    {
        Task<DailyRoomResponse> CreateRoom(string roomName, int expiryMinutes = 60);
        Task<bool> DeleteRoom(string roomName);
    }
}