'use server';

type OrderDetails = {
    orderId: string;
    userNumericId?: string;
    amount: number;
    utr: string;
    receiverDetails: { [key: string]: string | undefined };
};

export async function sendOrderConfirmationToTelegram(details: OrderDetails) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatIds = process.env.TELEGRAM_CHAT_IDS?.split(',') || [];

    if (!botToken || chatIds.length === 0) {
        console.error('Telegram bot token or chat IDs are not configured.');
        return;
    }

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
    `;

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const promises = chatIds.map(chatId => {
        if (!chatId.trim()) return Promise.resolve();
        return fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId.trim(),
                text: message,
                parse_mode: 'Markdown',
            }),
        }).catch(error => {
            console.error(`Failed to send message to chat ID ${chatId}:`, error);
        });
    });

    await Promise.all(promises);
}

type ChatRequestDetails = {
    userNumericId?: string;
    enteredIdentifier: string;
};

export async function sendNewChatRequestToTelegram(details: ChatRequestDetails) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatIds = process.env.TELEGRAM_CHAT_IDS?.split(',') || [];

    if (!botToken || chatIds.length === 0) {
        console.error('Telegram bot token or chat IDs are not configured for chat requests.');
        return;
    }

    const message = `
*New Live Chat Request!* 💬

A user needs help.

*User UID:* \`${details.userNumericId || 'N/A'}\`
*Identifier Entered:* \`${details.enteredIdentifier}\`

Please check the admin panel to join the chat.
    `;

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const promises = chatIds.map(chatId => {
        if (!chatId.trim()) return Promise.resolve();
        return fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId.trim(),
                text: message,
                parse_mode: 'Markdown',
            }),
        }).catch(error => {
            console.error(`Failed to send message to chat ID ${chatId}:`, error);
        });
    });

    await Promise.all(promises);
}
