const sendMessage = require('./messaging');

exports.handler = async (event) => {
    let data = JSON.parse(event.body).data;
    let playerData = await equipHandler(data);
    console.log(`Player data: ${JSON.stringify(playerData)}`);
    try {
        await sendMessage(event, {action: 'equipItem', data: playerData});
    } catch (e) {
        console.log('Error posting to connection', e);
        throw e;
    }
    return {
        statusCode: 200
    }
};

async function equipHandler(data) {
    let player = data.player
    const item = data.item;
    if (!item || !player) {
        return {status: 400, message: 'Missing item, playerId, or userId in request.'};
    }

    const itemType = item.slot;

    // un-equip item if slot is already occupied
    if (player.equipped[itemType].name) {
        player = unequip_item(player, player.equipped[itemType]);
    }

    player = equip_item(player, item);
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

function equip_item(player, item) {
    const slot = item.slot;
    const equipped = player.equipped;
    const inventory = player.inventory;
    equipped[slot] = item;
    const inventory_index = find_item_index(inventory, item.name);
    inventory.splice(inventory_index, 1);
    player.hp += item.hp;
    player.max_hp += item.hp;
    player.dmg += item.dmg;
    player.equipped = equipped;
    player.inventory = inventory;
    return player;
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