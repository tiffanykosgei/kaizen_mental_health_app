namespace kaizenbackend.DTOs
{
    public class PaymentStatusResponse
    {
        public int ResultCode { get; set; }
        public string ResultDesc { get; set; } = string.Empty;
        public string? CheckoutRequestID { get; set; }
        public string? MerchantRequestID { get; set; }
        public decimal? Amount { get; set; }
        public string? MpesaReceiptNumber { get; set; }
        public DateTime? TransactionDate { get; set; }
        public string? PhoneNumber { get; set; }
        public bool Success => ResultCode == 0;
    }
}