import { NextRequest, NextResponse } from 'next/server';

/**
 * Backend verification for Cloudflare Turnstile tokens.
 */
export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ success: false, error: 'Token missing' }, { status: 400 });
    }

    const secretKey = '0x4AAAAAADV2Z49nzBcro60hKAqmIH0PWa0';

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: secretKey,
        response: token,
      }),
    });

    const data = await response.json();

    if (data.success) {
      return NextResponse.json({ success: true });
    } else {
      console.error("Cloudflare verification failed:", data['error-codes']);
      return NextResponse.json({ 
        success: false, 
        error: 'Security verification failed. Please try again.' 
      }, { status: 403 });
    }
  } catch (error) {
    console.error("Internal verification error:", error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
