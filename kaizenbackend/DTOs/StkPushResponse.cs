namespace kaizenbackend.DTOs
{
    public class StkPushResponse
    {
        public bool Success { get; set; }
        public string? MerchantRequestId { get; set; }
        public string? CheckoutRequestId { get; set; }
        public string? ResponseDescription { get; set; }
    }
}