
import { NextRequest, NextResponse } from 'next/server';

/**
 * A secure API route to extract the real client IP address.
 * It checks multiple headers commonly used by Vercel, Cloudflare, Nginx, and Load Balancers.
 */
export async function GET(req: NextRequest) {
  const headers = req.headers;
  
  // List of headers to check, in order of reliability
  const ip = headers.get('cf-connecting-ip') || 
             headers.get('x-client-ip') || 
             headers.get('x-forwarded-for')?.split(',')[0] || 
             headers.get('x-real-ip') || 
             headers.get('forwarded') ||
             '127.0.0.1';

  return NextResponse.json({ 
    ip: ip.trim(),
    userAgent: headers.get('user-agent'),
    timestamp: new Date().toISOString()
  });
}
