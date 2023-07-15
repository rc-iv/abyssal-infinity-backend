const { ApiGatewayManagementApi } = require("@aws-sdk/client-apigatewaymanagementapi");

async function sendMessage(event, message){
    const apiGatewayManagementApi = new ApiGatewayManagementApi({
        apiVersion: '2018-11-29',
        endpoint: `https://${event.requestContext.domainName}/${event.requestContext.stage}`
    });

    try {
        await apiGatewayManagementApi.postToConnection({
            ConnectionId: event.requestContext.connectionId,
            Data: JSON.stringify({
                message: message
            })
        });
    } catch (e) {
        console.log('Error posting to connection', e);
        throw e;
    }
}

module.exports = sendMessage;
