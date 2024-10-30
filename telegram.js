const { Api, TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const app = express();

const apiId = parseInt(process.env.APIID,10);
const apiHash = process.env.APIHASH;
const stringSession = new StringSession(process.env.STRINGSESSION);

let client;

async function initializeTelegramClient() {
    client = new TelegramClient(stringSession, apiId, apiHash, {
        connectionRetries: 5,
    });
    await client.connect();
    return client;
}

app.get('/api/message', async (req, res) => {
    try {
        const { peer, id } = req.query;
        
        if (!peer || !id) {
            return res.status(400).json({ error: 'Thiếu tham số peer hoặc id' });
        }

        if (!client) {
            await initializeTelegramClient();
        }
        //getViews
        const viewsResult = await client.invoke(
            new Api.messages.GetMessagesViews({
                peer: peer,
                id: [parseInt(id)],
                increment: false,
            })
        );
        //getReactions
        const reactionsResult = await client.invoke(
            new Api.messages.GetMessagesReactions({
                peer: peer,
                id: [parseInt(id)],
            })
        );
        const response = {
            views: viewsResult.views?.[0]?.views || 0,
            title: viewsResult.chats?.[0]?.title,
            reactions: []
        };

        if (reactionsResult.updates?.length > 0) {
            const reactions = reactionsResult.updates[0].reactions;
            if (reactions?.results) {
                response.reactions = reactions.results.map(result => ({
                    count: result.count,
                    reaction: result.reaction,
                }));
            }
        }

        res.json(response);
    } catch (error) {
        console.error('Lỗi:', error);
        res.status(500).json({ error: 'Đã xảy ra lỗi khi xử lý yêu cầu' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    await initializeTelegramClient();
    console.log(`Server đang chạy tại port ${PORT}`);
});