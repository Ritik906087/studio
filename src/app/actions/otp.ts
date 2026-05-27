'use server';

/**
 * @fileOverview OTP Service using Fast2SMS API
 */

const FAST2SMS_API_KEY = "ObgHikFN3vfxRuIT74hBmaKpD1JUdrwlqstSe6VQWn5Cy0PLXMVZ7gm1LfjvCOxcH2z8e6JEa4MNhPAW";

/**
 * Sends an OTP to a mobile number using Fast2SMS Bulk V2 API.
 * Returns the OTP (for verification) or an error.
 */
export async function sendOtpAction(phoneNumber: string): Promise<{ success: boolean; otp?: string; error?: string }> {
  try {
    if (!phoneNumber || phoneNumber.length !== 10) {
      return { success: false, error: "Invalid mobile number." };
    }

    // Generate a 6-digit random OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Fast2SMS API URL
    const url = "https://www.fast2sms.com/dev/bulkV2";

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "authorization": FAST2SMS_API_KEY,
        "Content-Type": "application/json",
        "accept": "*/*"
      },
      body: JSON.stringify({
        "route": "otp",
        "variables_values": otp,
        "numbers": phoneNumber
      })
    });

    const data = await response.json();

    if (data.return) {
      return { success: true, otp: otp };
    } else {
      console.error("Fast2SMS Error:", data);
      return { success: false, error: data.message || "Failed to send OTP. Service busy." };
    }
  } catch (error: any) {
    console.error("OTP Action Error:", error);
    return { success: false, error: "Network error. Try again later." };
  }
}
