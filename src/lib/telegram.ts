
'use server';

import 'dotenv/config';

const FETCH_TIMEOUT = 25000;
const RETRY_COUNT = 3;
const RETRY_DELAY = 2000;

// User provided bot credentials for instant alerts
const ORDER_BOT_TOKEN = '8762196679:AAF5hgLZoUQZbjrqk-ONmrAh07nFzdPF9k0';
const ORDER_GROUP_ID = '-1002925101550';

async function fetchWithRetry(url: string, options: RequestInit, retries: number, botName: string, chatId: string): Promise<Response> {
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

async function sendTelegramMessage(botToken: string, chatId: string, message: string, botName: string) {
    if (!botToken || !chatId) return;

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    try {
        await fetchWithRetry(
            url,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: message,
                    parse_mode: 'Markdown',
                }),
            },
            RETRY_COUNT,
            botName,
            chatId
        );
    } catch (error: any) {
        console.error(`[TelegramBot] [${botName}] Error: ${error.message}`);
    }
}

/**
 * Sends order submission details to the dedicated Telegram group.
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

*Status:* Pending Confirmation
    `;

    await sendTelegramMessage(ORDER_BOT_TOKEN, ORDER_GROUP_ID, message, 'OrderAlert');
}

/**
 * Existing function for chat requests.
 */
export async function sendNewChatRequestToTelegram(details: {
    userNumericId?: string;
    enteredIdentifier: string;
}) {
    const botToken = process.env.TELEGRAM_SUPPORT_BOT_TOKEN || ORDER_BOT_TOKEN;
    const groupChatId = process.env.TELEGRAM_SUPPORT_CHAT_ID_GROUP || ORDER_GROUP_ID;

    const message = `
💬 *New Live Chat Request!*

*User UID:* \`${details.userNumericId || 'N/A'}\`
*Identifier:* \`${details.enteredIdentifier}\`

Check admin panel to respond.
    `;

    await sendTelegramMessage(botToken, groupChatId, message, 'Support');
}
