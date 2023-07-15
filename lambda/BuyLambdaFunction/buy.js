const sendMessage = require('./messaging');

exports.handler = async (event) => {
    let data = JSON.parse(event.body).data;
    let playerData = await buyItem(data);
    console.log(`Player data: ${JSON.stringify(playerData)}`);
    try {
        await sendMessage(event, {action: 'buy', data: playerData});
    } catch (e) {
        console.log('Error posting to connection', e);
        throw e;
    }
    return {
        statusCode: 200
    }
};

async function buyItem(data) {
    let player = data.player
    const item = data.item;

    if (!player || !item) {
        return {status: 400, message: 'Missing userId, playerId, or item in request.'};
    }

    let game = player.current_game;

    if (player.gold >= item.value) {
        player = buy_item_from_merchant(player, item);
        game.level.merchant = sell_item_to_player(game.level.merchant, item);
        player.current_game = game;
    } else {
        return {status: 600, message: 'Not enough gold.'};
    }
    return player;
}

function buy_item_from_merchant(player, item) {
    let inventory = player.inventory;
    const item_cost = item.value;
    if (player.gold >= item_cost) {
        inventory.push(item);
        player.inventory = inventory;
        player.gold -= item_cost;
    }
    return player;
}

function sell_item_to_player(merchant, item) {
    let inventory = merchant.inventory;
    let index = -1;
    for (let i = 0; i < inventory.length; i++) {
        if (inventory[i].name === item.name) {
            index = i;
        }
    }
    if (index > -1) {
        inventory.splice(index, 1);
    }
    merchant.inventory = inventory;
    return merchant;
}