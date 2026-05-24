
'use server';

import 'dotenv/config';

const FETCH_TIMEOUT = 25000;
const RETRY_COUNT = 3;
const RETRY_DELAY = 2000;

// Accessing credentials from environment variables for security
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GROUP_ID = process.env.TELEGRAM_GROUP_ID;

async function fetchWithRetry(url: string, options: RequestInit, retries: number, botName: string): Promise<Response> {
    for (let i = 0; i < retries; i++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

        try {
            const response = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(timeoutId);

            if (response.ok) return response;
            if (response.status >= 400 && response.status < 500) return response;
            
        } catch (error: any) {
            clearTimeout(timeoutId);
        }

        if (i < retries - 1) {
            await new Promise(res => setTimeout(res, RETRY_DELAY));
        }
    }
    throw new Error(`Failed to send message to Telegram after ${retries} attempts.`);
}

async function sendTelegramMessage(message: string, botName: string) {
    if (!BOT_TOKEN || !GROUP_ID) {
        console.error(`[TelegramBot] [${botName}] Error: Credentials missing in .env`);
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
                }),
            },
            RETRY_COUNT,
            botName
        );
    } catch (error: any) {
        console.error(`[TelegramBot] [${botName}] Error: ${error.message}`);
    }
}

/**
 * Sends buy order submission details to the configured Telegram group.
 * This is triggered ONLY when a user successfully submits their payment proof.
 */
export async function sendOrderSubmissionToTelegram(details: {
    orderId: string;
    uid: string;
    mobile: string;
    amount: number;
    utr: string;
}) {
    const message = `
🚀 *New Order Submitted!*

*Order ID:* \`${details.orderId}\`
*User UID:* \`${details.uid}\`
*Mobile:* \`+91 ${details.mobile}\`
*Amount:* ₹${details.amount.toFixed(2)}
*UTR:* \`${details.utr}\`

*Status:* Pending System Audit
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
💬 *New Live Chat Request!*

*User UID:* \`${details.userNumericId || 'N/A'}\`
*Identifier:* \`${details.enteredIdentifier}\`

A user is waiting for support in the admin panel.
    `;

    await sendTelegramMessage(message, 'SupportAlert');
}
