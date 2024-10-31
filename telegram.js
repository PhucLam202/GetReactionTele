const { Api, TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const dotenv = require('dotenv');
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger'); // Import swaggerSpec từ swagger.js
dotenv.config();

const app = express();

const apiId = parseInt(process.env.APIID, 10);
const apiHash = process.env.APIHASH;
const stringSession = new StringSession(process.env.STRINGSESSION);

let client;

async function initializeTelegramClient() {
    if (!client) {
        client = new TelegramClient(stringSession, apiId, apiHash, {
            connectionRetries: 5,
        });
        await client.connect();
    }
    return client;
}
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * /api/message:
 *   get:
 *     summary: Lấy thông tin lượt xem và phản ứng của tin nhắn
 *     parameters:
 *       - in: query
 *         name: peer
 *         required: true
 *         description: Peer của tin nhắn
 *         schema:
 *           type: string
 *       - in: query
 *         name: id
 *         required: true
 *         description: ID của tin nhắn
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thông tin lượt xem và phản ứng của tin nhắn
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 views:
 *                   type: integer
 *                   description: Số lượt xem
 *                 title:
 *                   type: string
 *                   description: Tiêu đề của tin nhắn
 *                 totalReactions:
 *                   type: integer
 *                   description: Tổng số phản ứng
 *                 reactions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       count:
 *                         type: integer
 *                         description: Số lượng phản ứng
 *                       reaction:
 *                         type: string
 *                         description: Loại phản ứng
 *       400:
 *         description: Thiếu tham số peer hoặc id
 *       500:
 *         description: Đã xảy ra lỗi khi xử lý yêu cầu
 */
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
            totalReactions: 0,
            reactions: [],
        };

        if (reactionsResult.updates?.length > 0) {
            const reactions = reactionsResult.updates[0].reactions;
            if (reactions?.results) {
                response.reactions = reactions.results.map(result => ({
                    count: result.count,
                    reaction: result.reaction,
                }));

                response.totalReactions = reactions.results.reduce((total, current) => total + current.count, 0);
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