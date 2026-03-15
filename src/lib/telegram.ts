
'use server';

// Define tags at the top as a constant
const TAGS = '@PRAJAPATI_KING1 @Anandyda89 @Zx_PiYUSH_02 @Satyam_ll @RITIK90608';
const FETCH_TIMEOUT = 25000; // 25 seconds timeout for each attempt

/**
 * A helper function to send a request with retries. This is crucial for serverless environments
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
            clearTimeout(timeoutId); // Clear the timeout if fetch completes

            // If response is OK, we are done.
            if (response.ok) {
                return response;
            }

            // Don't retry on "client" errors (4xx), as they are likely permanent.
            if (response.status >= 400 && response.status < 500) {
                const errorBody = await response.json().catch(() => ({ description: 'Could not parse error body.' }));
                console.error(`[TelegramBot] [${botName}] FATAL: Client error for chat ID ${chatId}. Status: ${response.status}. Body: ${JSON.stringify(errorBody)}. Not retrying.`);
                return response; // Return the failed response to be handled by the caller
            }
            
            // For server errors (5xx) or other transient issues, log and prepare to retry.
            console.warn(`[TelegramBot] [${botName}] WARN: Attempt ${i + 1} failed with status ${response.status}. Retrying in 2s...`);

        } catch (error: any) {
            clearTimeout(timeoutId); // Clear timeout on error too
            if (error.name === 'AbortError') {
                console.warn(`[TelegramBot] [${botName}] WARN: Attempt ${i + 1} timed out after ${FETCH_TIMEOUT / 1000}s. Retrying...`);
            } else {
                console.warn(`[TelegramBot] [${botName}] WARN: Attempt ${i + 1} failed with network error: ${error.message}. Retrying...`);
            }
        }

        // Wait before the next retry, but not after the last attempt.
        if (i < retries - 1) {
            await new Promise(res => setTimeout(res, 2000)); // 2-second delay
        }
    }

    // If all retries fail, throw an error.
    throw new Error(`Failed to send message to chat ID ${chatId} after ${retries} attempts.`);
}


async function sendTelegramMessage(botToken: string | undefined, chatIds: string[], message: string, botName: string) {
    if (!botToken || chatIds.length === 0 || chatIds.every(id => !id.trim())) {
        console.error(`[TelegramBot] [${botName}] CRITICAL: Bot token or chat IDs are not configured. This is a common production issue. Please add the required secrets to your Firebase App Hosting backend environment variables.`);
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
                3, // Try up to 3 times
                botName,
                trimmedChatId
            );

            if (!response.ok) {
                 // The error is already logged in fetchWithRetry for client errors.
                 // We return a failure status to be safe.
                return { status: 'failed', chatId: trimmedChatId };
            }
            
            return { status: 'success', chatId: trimmedChatId };

        } catch (error: any) {
            console.error(`[TelegramBot] [${botName}] FINAL_ERROR for chat ID ${trimmedChatId}:`, error.message);
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

type OrderDetails = {
    orderId: string;
    userNumericId?: string;
    amount: number;
    utr: string;
    receiverDetails: { [key: string]: string | undefined };
};
