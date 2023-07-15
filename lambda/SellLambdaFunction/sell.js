const sendMessage = require('./messaging');

exports.handler = async (event) => {
    let data = JSON.parse(event.body).data;
    let playerData = await sellItem(data);
    console.log(`Player data: ${JSON.stringify(playerData)}`);
    try {
        await sendMessage(event, {action: 'sell', data: playerData});
    } catch (e) {
        console.log('Error posting to connection', e);
        throw e;
    }
    return {
        statusCode: 200
    }
};

async function sellItem(data) {
    let player = data.player
    const item = data.item;

    if (!player || !item) {
        return {status: 400, message: 'Missing player, or item in request.'};
    }

    if (player.player_square_contents === 'M') {
        player = sell_item_to_merchant(player, item);
        return player;
    } else {
        return {status: 600, message: 'Not in a merchant square.'};
    }

}

function find_item_index(items, item_name) {
    let index = -1;
    for (let i = 0; i < items.length; i++) {
        if (items[i].name === item_name) {
            index = i;
        }
    }
    return index;
}

function sell_item_to_merchant(player, item) {
    let inventory = player.inventory;
    const item_cost = item.value;
    const inventory_index = find_item_index(inventory, item.name);
    inventory.splice(inventory_index, 1);
    player.inventory = inventory;
    player.gold += item_cost;
    return player;
}
