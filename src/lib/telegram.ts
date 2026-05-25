
'use server';

import 'dotenv/config';

const FETCH_TIMEOUT = 15000; // Reduced for serverless efficiency
const RETRY_COUNT = 2;
const RETRY_DELAY = 1000;

// HARDCODED CREDENTIALS (Failsafe for Vercel/Studio without .env)
const FALLBACK_TOKEN = '8762196679:AAF5hgLZoUQZbjrqk-ONmrAh07nFzdPF9k0';
const FALLBACK_GROUP_ID = '-1002273617326'; 

async function fetchWithRetry(url: string, options: RequestInit, retries: number, botName: string): Promise<Response> {
    for (let i = 0; i < retries; i++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

        try {
            const response = await fetch(url, { 
                ...options, 
                signal: controller.signal,
                cache: 'no-store' // Critical for serverless
            });
            clearTimeout(timeoutId);

            if (response.ok) return response;
            
            const errData = await response.json().catch(() => ({}));
            console.error(`[TelegramBot] [${botName}] API Error (Status ${response.status}):`, errData);
            
            if (response.status >= 400 && response.status < 500 && response.status !== 429) {
                return response;
            }
            
        } catch (error: any) {
            clearTimeout(timeoutId);
            console.warn(`[TelegramBot] [${botName}] Attempt ${i+1} failed: ${error.message}`);
        }

        if (i < retries - 1) {
            await new Promise(res => setTimeout(res, RETRY_DELAY));
        }
    }
    throw new Error(`Failed to send message to Telegram after ${retries} attempts.`);
}

async function sendTelegramMessage(message: string, botName: string) {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || FALLBACK_TOKEN;
    const GROUP_ID = process.env.TELEGRAM_GROUP_ID || FALLBACK_GROUP_ID;

    if (!BOT_TOKEN || !GROUP_ID) {
        console.error(`[TelegramBot] [${botName}] Error: Credentials missing`);
        return;
    }

    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    try {
        await fetchWithRetry(
            url,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: GROUP_ID,
                    text: message,
                    parse_mode: 'Markdown',
                    disable_web_page_preview: true
                }),
            },
            RETRY_COUNT,
            botName
        );
    } catch (error: any) {
        console.error(`[TelegramBot] [${botName}] Final failure: ${error.message}`);
    }
}

/**
 * Sends buy order submission details to the configured Telegram group.
 */
export async function sendOrderSubmissionToTelegram(details: {
    orderId: string;
    uid: string;
    mobile: string;
    amount: number;
    utr: string;
}) {
    const message = `
🚀 *NEW ORDER SUBMITTED!*

*Order ID:* \`${details.orderId}\`
*User UID:* \`${details.uid}\`
*Mobile:* \`+91 ${details.mobile}\`
*Amount:* ₹${details.amount.toLocaleString()}
*UTR/Ref:* \`${details.utr}\`

*Status:* Waiting for Admin Audit
    `;

    await sendTelegramMessage(message, 'OrderAlert');
}

/**
 * Sends notification for human agent chat requests.
 */
export async function sendNewChatRequestToTelegram(details: {
    userNumericId?: string;
    enteredIdentifier: string;
}) {
    const message = `
💬 *LIVE CHAT REQUEST!*

*User UID:* \`${details.userNumericId || 'N/A'}\`
*Identifier:* \`${details.enteredIdentifier}\`

A user is waiting for support in the admin panel.
    `;

    await sendTelegramMessage(message, 'SupportAlert');
}
