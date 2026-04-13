using System.Threading.Tasks;
using kaizenbackend.DTOs;

namespace kaizenbackend.Services
{
    public interface IPaymentService
    {
        Task<StkPushResponse> InitiatePayment(string phoneNumber, decimal amount, int sessionId);
        Task<PaymentStatusResponse> QueryPaymentStatus(string checkoutRequestId);
    }
}