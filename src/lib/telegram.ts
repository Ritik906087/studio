
'use server';

const tags = '@PRAJAPATI_KING1 @Anandyda89 @Zx_PiYUSH_02 @Satyam_ll @RITIK90608';

type OrderDetails = {
    orderId: string;
    userNumericId?: string;
    amount: number;
    utr: string;
    receiverDetails: { [key: string]: string | undefined };
};

export async function sendOrderConfirmationToTelegram(details: OrderDetails) {
    const botToken = '8368251529:AAE-kClpA0DgoaWadnpu_l1fMKhMctlYz2k';
    const chatIds = ['-1003727847200', '8033702577'];

    if (!botToken || chatIds.length === 0) {
        console.error('Telegram payment bot token or chat IDs are not configured.');
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

${tags}
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
    const botToken = '8794329051:AAEqeeqiGL2FERa9fdPib6urUNMWz61N5qQ';
    const chatIds = ['-1003702709711', '8033702577'];

    if (!botToken || chatIds.length === 0) {
        console.error('Telegram support bot token or chat ID are not configured for chat requests.');
        return;
    }

    const message = `
*New Live Chat Request!* 💬

A user needs help.

*User UID:* \`${details.userNumericId || 'N/A'}\`
*Identifier Entered:* \`${details.enteredIdentifier}\`

Please check the admin panel to join the chat.

${tags}
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
