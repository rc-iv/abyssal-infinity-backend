// lambda/default.js
const sendMessage = require('./messaging');

exports.handler = async (event) => {
    console.log("Default request", event);

    // Extract the message from the event body
    let message = JSON.parse(event.body).data;

    console.log(`Received message: ${message}`);

    try {
        await sendMessage(event, "Unknown command");
    } catch (e) {
        console.log('Error posting to connection', e);
        throw e;
    }

    return {
        statusCode: 200
    };
};
