using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using kaizenbackend.DTOs;

namespace kaizenbackend.Services
{
    public class PaymentService : IPaymentService
    {
        private readonly IConfiguration _config;
        private readonly HttpClient _httpClient;

        public PaymentService(IConfiguration config)
        {
            _config = config;
            _httpClient = new HttpClient();
        }

        public async Task<StkPushResponse> InitiatePayment(string phoneNumber, decimal amount, int sessionId)
        {
            try
            {
                // Get configuration values with null checks
                var consumerKey = _config["Mpesa:ConsumerKey"];
                var consumerSecret = _config["Mpesa:ConsumerSecret"];
                var passKey = _config["Mpesa:PassKey"];
                var shortCode = _config["Mpesa:ShortCode"];
                var callbackUrl = _config["Mpesa:CallbackURL"];
                var isLive = _config["Mpesa:IsLive"] == "true";

                // Validate configuration
                if (string.IsNullOrEmpty(consumerKey) || consumerKey == "YOUR_CONSUMER_KEY_FROM_DARAJA")
                    return new StkPushResponse { Success = false, ResponseDescription = "M-Pesa Consumer Key not configured. Please add your Daraja credentials to appsettings.json." };
                
                if (string.IsNullOrEmpty(consumerSecret) || consumerSecret == "YOUR_CONSUMER_SECRET_FROM_DARAJA")
                    return new StkPushResponse { Success = false, ResponseDescription = "M-Pesa Consumer Secret not configured. Please add your Daraja credentials to appsettings.json." };

                // Format phone number
                string formattedPhone = FormatPhoneNumber(phoneNumber);
                
                // Generate timestamp
                string timestamp = DateTime.Now.ToString("yyyyMMddHHmmss");
                
                // Generate password
                string password = Convert.ToBase64String(
                    Encoding.UTF8.GetBytes(shortCode + passKey + timestamp)
                );
                
                // Get access token
                string accessToken = await GetAccessToken(consumerKey, consumerSecret);
                if (string.IsNullOrEmpty(accessToken))
                {
                    return new StkPushResponse
                    {
                        Success = false,
                        ResponseDescription = "Failed to authenticate with M-Pesa. Check your Consumer Key and Secret."
                    };
                }
                
                // Determine API URL based on environment
                string apiUrl = isLive 
                    ? "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
                    : "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";
                
                // Build STK Push request
                var stkRequest = new
                {
                    BusinessShortCode = shortCode,
                    Password = password,
                    Timestamp = timestamp,
                    TransactionType = "CustomerPayBillOnline",
                    Amount = (int)amount,
                    PartyA = formattedPhone,
                    PartyB = shortCode,
                    PhoneNumber = formattedPhone,
                    CallBackURL = callbackUrl,
                    AccountReference = $"SESSION_{sessionId}",
                    TransactionDesc = $"Payment for session {sessionId}"
                };
                
                // Send STK Push request
                _httpClient.DefaultRequestHeaders.Clear();
                _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {accessToken}");
                
                var content = new StringContent(
                    JsonSerializer.Serialize(stkRequest),
                    Encoding.UTF8,
                    "application/json"
                );
                
                var response = await _httpClient.PostAsync(apiUrl, content);
                
                var responseJson = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"STK Push Response: {responseJson}");
                
                using var doc = JsonDocument.Parse(responseJson);
                var root = doc.RootElement;
                
                var resultCode = root.GetProperty("ResponseCode").GetString();
                
                return new StkPushResponse
                {
                    Success = resultCode == "0",
                    MerchantRequestId = root.TryGetProperty("MerchantRequestID", out var merchantId) ? merchantId.GetString() : null,
                    CheckoutRequestId = root.TryGetProperty("CheckoutRequestID", out var checkoutId) ? checkoutId.GetString() : null,
                    ResponseDescription = root.TryGetProperty("ResponseDescription", out var desc) ? desc.GetString() : responseJson
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"InitiatePayment Error: {ex.Message}");
                return new StkPushResponse
                {
                    Success = false,
                    ResponseDescription = ex.Message
                };
            }
        }

        public async Task<PaymentStatusResponse> QueryPaymentStatus(string checkoutRequestId)
        {
            try
            {
                Console.WriteLine($"Querying payment status for CheckoutRequestID: {checkoutRequestId}");
                
                // Get configuration values
                var consumerKey = _config["Mpesa:ConsumerKey"];
                var consumerSecret = _config["Mpesa:ConsumerSecret"];
                var passKey = _config["Mpesa:PassKey"];
                var shortCode = _config["Mpesa:ShortCode"];
                var isLive = _config["Mpesa:IsLive"] == "true";
                
                // Get access token
                string accessToken = await GetAccessToken(consumerKey, consumerSecret);
                if (string.IsNullOrEmpty(accessToken))
                {
                    return new PaymentStatusResponse
                    {
                        ResultCode = 1,
                        ResultDesc = "Failed to authenticate with M-Pesa"
                    };
                }
                
                // Generate timestamp
                string timestamp = DateTime.Now.ToString("yyyyMMddHHmmss");
                
                // Generate password
                string password = Convert.ToBase64String(
                    Encoding.UTF8.GetBytes(shortCode + passKey + timestamp)
                );
                
                // Build query request
                var queryRequest = new
                {
                    BusinessShortCode = shortCode,
                    Password = password,
                    Timestamp = timestamp,
                    CheckoutRequestID = checkoutRequestId
                };
                
                // Determine API URL based on environment
                string apiUrl = isLive
                    ? "https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query"
                    : "https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query";
                
                // Send query request
                _httpClient.DefaultRequestHeaders.Clear();
                _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {accessToken}");
                
                var content = new StringContent(
                    JsonSerializer.Serialize(queryRequest),
                    Encoding.UTF8,
                    "application/json"
                );
                
                var response = await _httpClient.PostAsync(apiUrl, content);
                var responseJson = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"Query Status Response: {responseJson}");
                
                using var doc = JsonDocument.Parse(responseJson);
                var root = doc.RootElement;
                
                var resultCode = root.TryGetProperty("ResultCode", out var rc) ? rc.GetInt32() : 1;
                var resultDesc = root.TryGetProperty("ResultDesc", out var rd) ? rd.GetString() : "Unknown error";
                
                var statusResponse = new PaymentStatusResponse
                {
                    ResultCode = resultCode,
                    ResultDesc = resultDesc,
                    CheckoutRequestID = checkoutRequestId
                };
                
                // Extract metadata if available
                if (root.TryGetProperty("CallbackMetadata", out var metadata))
                {
                    if (metadata.TryGetProperty("Item", out var items))
                    {
                        foreach (var item in items.EnumerateArray())
                        {
                            var name = item.GetProperty("Name").GetString();
                            if (item.TryGetProperty("Value", out var value))
                            {
                                var valueStr = value.ToString();
                                
                                switch (name)
                                {
                                    case "Amount":
                                        statusResponse.Amount = decimal.Parse(valueStr);
                                        break;
                                    case "MpesaReceiptNumber":
                                        statusResponse.MpesaReceiptNumber = valueStr;
                                        break;
                                    case "TransactionDate":
                                        statusResponse.TransactionDate = DateTime.ParseExact(valueStr, "yyyyMMddHHmmss", null);
                                        break;
                                    case "PhoneNumber":
                                        statusResponse.PhoneNumber = valueStr;
                                        break;
                                }
                            }
                        }
                    }
                }
                
                return statusResponse;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"QueryPaymentStatus Error: {ex.Message}");
                return new PaymentStatusResponse
                {
                    ResultCode = 1,
                    ResultDesc = $"Error: {ex.Message}",
                    CheckoutRequestID = checkoutRequestId
                };
            }
        }
        
        private async Task<string> GetAccessToken(string consumerKey, string consumerSecret)
        {
            try
            {
                var auth = Convert.ToBase64String(
                    Encoding.UTF8.GetBytes($"{consumerKey}:{consumerSecret}")
                );
                
                _httpClient.DefaultRequestHeaders.Clear();
                _httpClient.DefaultRequestHeaders.Add("Authorization", $"Basic {auth}");
                
                var response = await _httpClient.GetAsync(
                    "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
                );
                
                var responseJson = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"Token Response: {responseJson}");
                
                using var doc = JsonDocument.Parse(responseJson);
                var root = doc.RootElement;
                
                return root.GetProperty("access_token").GetString() ?? "";
            }
            catch (Exception ex)
            {
                Console.WriteLine($"GetAccessToken Error: {ex.Message}");
                return "";
            }
        }
        
        private string FormatPhoneNumber(string phoneNumber)
        {
            // Remove any non-digit characters
            string cleaned = System.Text.RegularExpressions.Regex.Replace(phoneNumber, @"[^\d]", "");
            
            // Handle different Kenyan phone number formats
            if (cleaned.StartsWith("0"))
            {
                // Format: 0712345678 -> 254712345678
                cleaned = "254" + cleaned.Substring(1);
            }
            else if (cleaned.Length == 9 && !cleaned.StartsWith("254"))
            {
                // Format: 712345678 -> 254712345678
                cleaned = "254" + cleaned;
            }
            else if (cleaned.Length == 12 && cleaned.StartsWith("254"))
            {
                // Already in correct format
                return cleaned;
            }
            
            return cleaned;
        }
    }
}