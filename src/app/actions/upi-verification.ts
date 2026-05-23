'use server';

/**
 * @fileOverview UPI Verification Service using bhimupijs
 */

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
 * This runs on the server to handle the CJS module discovery.
 */
export async function verifyUpiAction(vpa: string): Promise<{ success: boolean; data?: UpiVerificationResult; error?: string }> {
  try {
    if (!vpa || !vpa.includes('@')) {
        return { success: false, error: "Please enter a valid UPI ID (e.g. name@handle)" };
    }

    // Robust discovery of the verification function
    // bhimupijs has varying export patterns depending on bundling
    let bhim;
    try {
        bhim = require('bhimupijs');
    } catch (e) {
        const mod = await import('bhimupijs');
        bhim = mod.default || mod;
    }

    // Comprehensive search for the actual function
    const verifyFn = 
        (typeof bhim === 'function' ? bhim : null) || 
        bhim.verifyUPI || 
        (bhim.default && bhim.default.verifyUPI) ||
        (bhim.default && typeof bhim.default === 'function' ? bhim.default : null);
    
    if (typeof verifyFn !== 'function') {
        console.error("Module structure keys:", Object.keys(bhim));
        throw new Error("Verification engine initialization failed. Engine method not found.");
    }

    const result = await verifyFn(vpa);

    if (!result) {
        return { success: false, error: "No response from verification server." };
    }

    return { 
        success: true, 
        data: {
            isVpaVerified: !!result.isVpaVerified,
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
