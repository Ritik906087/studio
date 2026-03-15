
'use server';

import 'dotenv/config'; // Ensures .env variables are loaded for local development

const FETCH_TIMEOUT = 25000; // 25 seconds timeout for each attempt
const RETRY_COUNT = 3; // Number of retries
const RETRY_DELAY = 2000; // 2 seconds delay between retries

/**
 * A helper function to safely get an environment variable and log if it's missing.
 * @param name The name of the environment variable.
 * @param botName The name of the bot for logging purposes.
 * @returns The value of the environment variable or an empty string if not found.
 */
function getEnvVariable(name: string, botName: string): string {
    const value = process.env[name];
    if (!value) {
        console.error(`[TelegramBot] [${botName}] FATAL: Environment variable ${name} is not set. The bot cannot function. Please configure this secret in your Firebase App Hosting backend.`);
        return '';
    }
    console.log(`[TelegramBot] [${botName}] INFO: Successfully loaded environment variable ${name}.`);
    return value;
}


/**
 * A robust fetch function with retries and timeout. This is crucial for serverless environments
 * where cold starts can cause initial requests to time out.
 * @param url The URL to fetch.
 * @param options The fetch options.
 * @param retries The number of times to retry.
 * @param botName The name of the bot for logging.
 * @param chatId The chat ID for logging.
 * @returns A Promise that resolves to the Response.
 */
async function fetchWithRetry(url: string, options: RequestInit, retries: number, botName: string, chatId: string): Promise<Response> {
    for (let i = 0; i < retries; i++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

        try {
            console.log(`[TelegramBot] [${botName}] INFO: Attempt ${i + 1}/${retries} to send to chat ID ${chatId}.`);
            const response = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(timeoutId);

            if (response.ok) {
                return response; // Success
            }

            // Don't retry on client errors (4xx), as they are likely permanent.
            if (response.status >= 400 && response.status < 500) {
                const errorBody = await response.json().catch(() => ({ description: 'Could not parse error body.' }));
                console.error(`[TelegramBot] [${botName}] FATAL_CLIENT_ERROR for chat ID ${chatId}. Status: ${response.status}. Body: ${JSON.stringify(errorBody)}. Not retrying.`);
                return response;
            }
            
            console.warn(`[TelegramBot] [${botName}] WARN: Attempt ${i + 1} failed with server/network issue. Status: ${response.status}. Retrying in ${RETRY_DELAY / 1000}s...`);

        } catch (error: any) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                console.warn(`[TelegramBot] [${botName}] WARN: Attempt ${i + 1} timed out after ${FETCH_TIMEOUT / 1000}s. Retrying...`);
            } else {
                console.warn(`[TelegramBot] [${botName}] WARN: Attempt ${i + 1} failed with network error: ${error.message}. Retrying...`);
            }
        }

        if (i < retries - 1) {
            await new Promise(res => setTimeout(res, RETRY_DELAY));
        }
    }

    throw new Error(`Failed to send message to chat ID ${chatId} after ${retries} attempts.`);
}

/**
 * Sends a message to multiple Telegram chats. It handles cases where some chats might fail without stopping others.
 * @param botToken The bot's API token.
 * @param chatIds An array of chat IDs.
 * @param message The message to send.
 * @param botName A friendly name for the bot for logging.
 */
async function sendTelegramMessage(botToken: string | undefined, chatIds: string[], message: string, botName: string) {
    if (!botToken || chatIds.length === 0 || chatIds.every(id => !id.trim())) {
        console.error(`[TelegramBot] [${botName}] CRITICAL: Bot token or chat IDs are empty or not configured. Cannot send message. Please check your Firebase secrets.`);
        return;
    }

    console.log(`[TelegramBot] [${botName}] INFO: Preparing to send message to ${chatIds.length} chat(s).`);
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const sendPromises = chatIds.map(async (chatId) => {
        const trimmedChatId = chatId.trim();
        if (!trimmedChatId) {
            console.warn(`[TelegramBot] [${botName}] WARN: Skipped empty chat ID.`);
            return { status: 'skipped', chatId: 'empty' };
        }

        try {
            const response = await fetchWithRetry(
                url,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: trimmedChatId,
                        text: message,
                        parse_mode: 'Markdown',
                    }),
                },
                RETRY_COUNT,
                botName,
                trimmedChatId
            );

            if (!response.ok) {
                 return { status: 'failed', chatId: trimmedChatId };
            }
            
            return { status: 'success', chatId: trimmedChatId };

        } catch (error: any) {
            console.error(`[TelegramBot] [${botName}] FINAL_ERROR for chat ID ${trimmedChatId}: ${error.message}`);
            return { status: 'failed', chatId: trimmedChatId, error: error.message };
        }
    });

    const results = await Promise.all(sendPromises);
    results.forEach(result => {
        if (result.status === 'success') {
            console.log(`[TelegramBot] [${botName}] SUCCESS: Message sent to chat ID ${result.chatId}.`);
        }
    });
}

// --- Exported Functions ---

type OrderDetails = {
    orderId: string;
    userNumericId?: string;
    amount: number;
    utr: string;
    receiverDetails: { [key: string]: string | undefined };
};

export async function sendOrderConfirmationToTelegram(details: OrderDetails) {
    const botName = 'Payment';
    console.log(`[TelegramBot] [${botName}] INFO: Initiating order confirmation notification.`);
    
    const botToken = getEnvVariable('TELEGRAM_PAYMENT_BOT_TOKEN', botName);
    const groupChatId = getEnvVariable('TELEGRAM_PAYMENT_CHAT_ID_GROUP', botName);
    const personalChatId = getEnvVariable('TELEGRAM_ADMIN_CHAT_ID_PERSONAL', botName);
    
    const chatIds = [groupChatId, personalChatId].filter(Boolean); // Filter out empty strings

    let receiverText = '';
    for (const [key, value] of Object.entries(details.receiverDetails)) {
        if (value) {
            // Using backticks for monospaced font in Telegram
            receiverText += `\n${key}: \`${value}\``;
        }
    }

    const message = `
*New Buy Order Confirmation!*

*Order ID:* \`${details.orderId}\`
*User UID:* \`${details.userNumericId || 'N/A'}\`
*Amount:* ₹${details.amount.toFixed(2)}
*UTR:* \`${details.utr}\`

*Receiver Details:*${receiverText}
    `;

    await sendTelegramMessage(botToken, chatIds, message, botName);
}

type ChatRequestDetails = {
    userNumericId?: string;
    enteredIdentifier: string;
};

export async function sendNewChatRequestToTelegram(details: ChatRequestDetails) {
    const botName = 'Support';
    console.log(`[TelegramBot] [${botName}] INFO: Initiating new chat request notification.`);

    const botToken = getEnvVariable('TELEGRAM_SUPPORT_BOT_TOKEN', botName);
    const groupChatId = getEnvVariable('TELEGRAM_SUPPORT_CHAT_ID_GROUP', botName);
    const personalChatId = getEnvVariable('TELEGRAM_ADMIN_CHAT_ID_PERSONAL', botName);

    const chatIds = [groupChatId, personalChatId].filter(Boolean); // Filter out empty strings

    const message = `
*New Live Chat Request!* 💬

A user needs help.

*User UID:* \`${details.userNumericId || 'N/A'}\`
*Identifier Entered:* \`${details.enteredIdentifier}\`

Please check the admin panel to join the chat.
    `;

    await sendTelegramMessage(botToken, chatIds, message, botName);
}

    