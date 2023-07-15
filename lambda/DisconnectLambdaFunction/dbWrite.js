const AWS = require('aws-sdk');

AWS.config.update({
    region: 'us-east-1', // set your region
    accessKeyId: process.env.AWS_ACCESS_KEY, // set your access key
    secretAccessKey: process.env.AWS_SECRET_KEY // set your secret key
});

const docClient = new AWS.DynamoDB.DocumentClient();

async function saveGameState(user, playerData) {
    console.log(`Saving game state of player: ${playerData.name} for user: ${user.user_id}`);
    let players = user.players;
    let player_id = playerData.id
    // set the player object in the user object with key player_id to playerData
    if (players[player_id]) {
        console.log(`Updating player ${player_id} in user ${user.user_id}`);
        players[player_id] = playerData;
    } else{
        console.log(`Adding player ${player_id} to user ${user.user_id}`);
        players[player_id] = playerData;
    }
    const params = {
        TableName: "abyssal-infinity-users",
        Item: {
            "user_id": `${user.user_id}`,
            "user_name": `${user.name}`,
            "stash": user.stash,
            "completed_levels": user.completed_levels,
            "players": players,
        }
    };

    try {
        await docClient.put(params).promise();
        console.log(`Saved game state for player : ${playerData.name}`);
        return true;
    } catch (err) {
        console.error(`Unable to save game state. Error JSON: ${JSON.stringify(err, null, 2)}`);
    }
}

module.exports = {
    saveGameState
}
