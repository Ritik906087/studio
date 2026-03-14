
'use server';

// Define tags at the top as a constant
const TAGS = '@PRAJAPATI_KING1 @Anandyda89 @Zx_PiYUSH_02 @Satyam_ll @RITIK90608';
const FETCH_TIMEOUT = 20000; // 20 seconds timeout for Telegram API requests

type OrderDetails = {
    orderId: string;
    userNumericId?: string;
    amount: number;
    utr: string;
    receiverDetails: { [key: string]: string | undefined };
};

// A generic function to handle sending messages to avoid code duplication
async function sendTelegramMessage(botToken: string | undefined, chatIds: string[], message: string, botName: string) {
    if (!botToken || chatIds.length === 0 || chatIds.every(id => !id.trim())) {
        console.error(`[TelegramBot] [${botName}] CRITICAL: Bot token or chat IDs are not configured. This is the likely reason for failure in production. Please add the required secrets to your Firebase App Hosting backend environment variables.`);
        // Log what we have to help debugging
        const maskedToken = botToken ? `${botToken.slice(0, 5)}...${botToken.slice(-4)}` : 'Not Provided';
        console.error(`[TelegramBot] [${botName}] DEBUG: Bot Token Found: ${!!botToken} (${maskedToken}), Chat IDs Found: ${chatIds.length}`);
        return;
    }

    console.log(`[TelegramBot] [${botName}] INFO: Preparing to send message to ${chatIds.length} chat(s).`);

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    // Using AbortController for timeout, which is more reliable for fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const sendPromises = chatIds.map(chatId => {
        const trimmedChatId = chatId.trim();
        if (!trimmedChatId) {
            console.warn(`[TelegramBot] [${botName}] WARN: Skipped empty chat ID.`);
            // Return a resolved promise for empty chat IDs
            return Promise.resolve({ ok: false, status: 'skipped', statusText: 'Skipped empty chat ID' } as Response);
        }
        
        console.log(`[TelegramBot] [${botName}] INFO: Sending to Chat ID: ${trimmedChatId}`);
        return fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: trimmedChatId,
                text: message,
                parse_mode: 'Markdown',
            }),
            signal: controller.signal, // Pass the signal to the fetch request
        });
    });

    try {
        const results = await Promise.allSettled(sendPromises);

        results.forEach((result, index) => {
            const chatId = chatIds[index]?.trim();
            if (!chatId) return;

            if (result.status === 'rejected') {
                // This will catch network errors and timeouts from AbortController
                 if ((result.reason as Error).name === 'AbortError') {
                    console.error(`[TelegramBot] [${botName}] FATAL: Request to Telegram API timed out after ${FETCH_TIMEOUT / 1000} seconds for chat ID ${chatId}. This is likely due to a serverless cold start. The increased timeout should help.`);
                } else {
                    console.error(`[TelegramBot] [${botName}] FATAL: Network error sending to chat ID ${chatId}:`, result.reason);
                }
            } else {
                // The promise was fulfilled, but the fetch response might indicate an error
                const response = result.value;
                if (!response.ok) {
                    if (response.statusText === 'Skipped empty chat ID') return; // Skip logging for intentionally skipped IDs
                    // Try to parse the error response from Telegram
                    response.json().then(errorBody => {
                        console.error(`[TelegramBot] [${botName}] ERROR: Failed to send message to chat ID ${chatId}. Status: ${response.status}. Response:`, JSON.stringify(errorBody, null, 2));
                    }).catch(() => {
                        // If parsing fails, log the raw status
                        console.error(`[TelegramBot] [${botName}] ERROR: Failed to send message to chat ID ${chatId}. Status: ${response.status}. Could not parse error response.`);
                    });
                } else {
                    console.log(`[TelegramBot] [${botName}] SUCCESS: Sent message to chat ID ${chatId}.`);
                }
            }
        });
    } catch (e) {
        // This catch is for Promise.allSettled itself, which should not happen.
        console.error(`[TelegramBot] [${botName}] FATAL: An unexpected error occurred in sendTelegramMessage.`, e);
    } finally {
        clearTimeout(timeoutId); // Clear the timeout in all cases
    }
}


export async function sendOrderConfirmationToTelegram(details: OrderDetails) {
    const botToken = process.env.TELEGRAM_PAYMENT_BOT_TOKEN;
    const chatIds = process.env.TELEGRAM_PAYMENT_CHAT_IDS?.split(',') || [];

    let receiverText = '';
    for (const [key, value] of Object.entries(details.receiverDetails)) {
        if (value) {
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

${TAGS}
    `;

    await sendTelegramMessage(botToken, chatIds, message, 'Payment');
}

type ChatRequestDetails = {
    userNumericId?: string;
    enteredIdentifier: string;
};

export async function sendNewChatRequestToTelegram(details: ChatRequestDetails) {
    const botToken = process.env.TELEGRAM_SUPPORT_BOT_TOKEN;
    const chatIds = process.env.TELEGRAM_SUPPORT_CHAT_IDS?.split(',') || [];

    const message = `
*New Live Chat Request!* 💬

A user needs help.

*User UID:* \`${details.userNumericId || 'N/A'}\`
*Identifier Entered:* \`${details.enteredIdentifier}\`

Please check the admin panel to join the chat.

${TAGS}
    `;

    await sendTelegramMessage(botToken, chatIds, message, 'Support');
}
