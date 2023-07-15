const sendMessage = require('./messaging');
const {combat_simulation} = require("./combat");


exports.handler = async (event) => {
    let data = JSON.parse(event.body).data;
    let playerData = await attackMonster(data);
    console.log(`Player data: ${JSON.stringify(playerData)}`);
    try {
        await sendMessage(event, {action: 'attack', data: playerData});
    } catch (e) {
        console.log('Error posting to connection', e);
        throw e;
    }
    return {
        statusCode: 200
    }
};

async function attackMonster(data) {
    console.log(`Attacking monster. Data: ${data}`);
    let player = data.player;
    const monsterId = parseInt(data.monsterId);
    if (!player || isNaN(monsterId)) {
        return {status: 400, message: 'Missing parameters for attack.'};
    }

    let game = player.current_game;

    // Find if there's a monster in the player's current position.
    const monster = game.level.monsters[monsterId]

    console.log(`Player ${player.name} is attacking monster ${monsterId}.`);
    if (!monster) {
        return {status: 600, message: 'Invalid monster.'};
    }

    let combat_id = Object.keys(player.current_game.combat_log).length;

    player = combat_simulation(player, monsterId);

    if (!player.is_alive) {
        return {
            status: 200,
            message: 'Game Over',
            last_level_cleared: game.dungeon_level - 1,
            combat_log: game.combat_log[combat_id].combat_messages
        };
    }
    player.current_game.combat_just_ended = true;
    return player;
}