const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
        openapi: '3.0.0',
        info: {
            title: 'Telegram Check View',
            version: '1.0.0',
            description: 'API documentation for Telegram Check View',
        },
    },
    apis: ['./telegram.js'], // Path to the API routes
};
const swaggerSpec = swaggerJSDoc(options);
module.exports = swaggerSpec;