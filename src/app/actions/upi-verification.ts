'use server';

/**
 * @fileOverview UPI Verification Service using bhimupijs
 */

// @ts-ignore
import bhim from 'bhimupijs';

export type UpiVerificationResult = {
  isVpaVerified: boolean;
  vpa: string;
  tpap: string;
  pspBank: string;
  userId: string;
  handleName: string;
  message: string;
  payeeAccountName: string;
};

/**
 * Verifies a UPI VPA using the bhimupijs library.
 * Runs on the server to handle the library's core dependencies.
 */
export async function verifyUpiAction(vpa: string): Promise<{ success: boolean; data?: UpiVerificationResult; error?: string }> {
  try {
    if (!vpa || !vpa.includes('@')) {
        return { success: false, error: "Please enter a valid UPI ID (e.g. name@handle)" };
    }

    // Call the bhimupijs verification method
    const result = await bhim.verifyUPI(vpa);

    if (!result) {
        return { success: false, error: "No response from verification server." };
    }

    return { 
        success: true, 
        data: {
            isVpaVerified: result.isVpaVerified || false,
            vpa: result.vpa || vpa,
            tpap: result.tpap || "Unknown",
            pspBank: result.pspBank || "Unknown",
            userId: result.userId || "Unknown",
            handleName: result.handleName || "Unknown",
            message: result.message || "",
            payeeAccountName: result.payeeAccountName || ""
        }
    };
  } catch (error: any) {
    console.error("UPI Verification Error:", error);
    return { success: false, error: error.message || "Verification service is currently busy. Try again." };
  }
}
