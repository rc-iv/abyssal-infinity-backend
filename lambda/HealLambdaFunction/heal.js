const sendMessage = require('./messaging');

exports.handler = async (event) => {
    let data = JSON.parse(event.body).data;
    let playerData = await healPlayer(data);
    console.log(`Player data: ${JSON.stringify(playerData)}`);
    try {
        await sendMessage(event, {action: 'heal', data: playerData});
    } catch (e) {
        console.log('Error posting to connection', e);
        throw e;
    }
    return {
        statusCode: 200
    }
};

async function healPlayer(data) {
    let player = data.player
    if (!player) {
        return {status: 400, message: 'Missing playerId or userId in request.'};
    }

    const heal_cost = player.heals_used * 100;

    if (player.gold < heal_cost) {
        return {status: 600, message: 'Not enough gold.'};
    }

    player.gold -= heal_cost;
    player.hp = player.max_hp;
    player.heals_used += 1;
    return player;
}