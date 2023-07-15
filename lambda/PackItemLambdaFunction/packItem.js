const sendMessage = require('./messaging');

exports.handler = async (event) => {
    let data = JSON.parse(event.body).data;
    let playerData = await packItem(data);
    console.log(`Player data: ${JSON.stringify(playerData)}`);
    try {
        await sendMessage(event, {action: 'packItem', data: playerData});
    } catch (e) {
        console.log('Error posting to connection', e);
        throw e;
    }
    return {
        statusCode: 200
    }
};

async function packItem(data) {
    let player = data.player
    const item = data.item;

    if (!item || !player) {
        return {status: 400, message: 'Missing item or player in request.'};
    }

    player = unequip_item(player, item);
    return player;
}

function unequip_item(player, item) {
    const slot = item.slot;
    const equipped = player.equipped;
    const inventory = player.inventory;
    equipped[slot] = {};
    inventory.push(item);
    player.hp -= item.hp;
    player.max_hp -= item.hp;
    player.dmg -= item.dmg;
    player.equipped = equipped;
    player.inventory = inventory;
    return player;
}