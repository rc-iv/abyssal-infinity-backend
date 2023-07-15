const sendMessage = require('./messaging');
const {loadUser, getLevelForPlayer} = require("./dbOperations");
const {saveGameState} = require("./dbWrite");

exports.handler = async (event) => {
    let data = JSON.parse(event.body).data;
    let playerData = await moveToNextLevel(data);
    console.log(`Player data: ${JSON.stringify(playerData)}`);
    try {
        await sendMessage(event, {action: 'nextLevel', data: playerData});
    } catch (e) {
        console.log('Error posting to connection', e);
        throw e;
    }
    return {
        statusCode: 200
    }
};

async function moveToNextLevel(data) {
    const userId = data.userId;
    let player = data.player;
    if (!userId || !player) {
        return {status: 400, message: 'Missing parameters for next level.'};
    }

    const user = await loadUser(userId);
    let game = player.current_game;
    console.log(`Getting next level for ${player.name}`);

    // add level to player's completed levels
    player.completed_levels.push(game.level.dungeon.level);
    // update game board with new level
    game.level = await getLevelForPlayer(player.completed_levels);
    game.dungeon_level += 1;
    game = populate_level(game);
    player.current_game = game;
    console.log(player.current_game);
    player = await move_player_to_new_level(player);
    if (await saveGameState(user, player)) {
        // Return the updated game.
        return player;
    } else {
        console.error('Error saving game state');
        return {status: 500, message: 'Error saving game state.'};
    }
}


function move_player_to_new_level(player) {
    player.x = 4;
    player.y = 5;
    player.player_square_contents = player.current_game.level.grid[4][5]; // contents of the player's square
    player.player_square_description = player_location_description(player.current_game.player_square_contents, player.current_game.level.monsters); // description of the player's square
    player.player_view = getPlayerView(player.current_game.level.grid, player); // get the player's view
    return player;
}

function populate_level(game) {
    game.level.monsters = add_monster_stats(game); // give the monsters stats
    game = give_loot_stats(game); // give the loot stats
    game.monsters_remaining = game.level.monsters.length; // number of monsters remaining
    return game;
}

function add_monster_stats(game) {
    const monsters = game.level.monsters;
    let level = game.dungeon_level;
    // Add hp and damage attributes to each monster.
    monsters.forEach(monster => {
        monster.status = "alive";
        monster.strength = monster.strength.toLowerCase();
        switch (monster.strength) {
            case "weak":
                monster.hp = 5 + level * 3;
                monster.dmg = 4 + level;
                break;
            case "normal":
                monster.hp = 10 + level * 4;
                monster.dmg = 5 + level;
                break;
            case "elite":
                monster.hp = 20 + level * 5;
                monster.dmg = 6 + level;
                break;
            case "boss":
                monster.hp = level * 50;
                monster.dmg = 10 + level;
                break;
            default:
                monster.hp = 5 + level * 3;
                monster.dmg = 4 + level;
                monster.strength = "weak";
                break;
        }
        monster.xp = 2 * monster.hp;
    });
    return monsters;
}

function give_loot_stats(game) {
    const monsters = game.level.monsters;
    const merchant = game.level.merchant;
    let level = game.dungeon_level;
    // for each monster, if it has loot, add item.hp and item.dmg values to loot
    for (let i = 0; i < monsters.length; i++) {
        if (monsters[i].loot.equipment !== null) {
            monsters[i].loot.equipment.hp = Math.floor(Math.random() * (level * 5 * monsters[i].loot_coefficient)) + 1;
            monsters[i].loot.equipment.dmg = Math.floor(Math.random() * (level * 5 * monsters[i].loot_coefficient)) + 1;
            monsters[i].loot.equipment.value = Math.floor((monsters[i].loot.equipment.hp + monsters[i].loot.equipment.dmg) / 2);
        }
        monsters[i].loot.gold = Math.floor(Math.random() * (level * 10)) + 1;
    }
    for (let i = 0; i < merchant.inventory.length; i++) {
        merchant.inventory[i].hp = Math.floor(Math.random() * (level * 8)) + 1;
        merchant.inventory[i].dmg = Math.floor(Math.random() * (level * 8)) + 1;
        merchant.inventory[i].value = merchant.inventory[i].hp + merchant.inventory[i].dmg;
    }
    game.monsters = monsters;
    game.level.merchant = merchant;
    console.log(`merchant: ${JSON.stringify(merchant)}`);
    return game;
}

function getPlayerView(grid, player) {
    let x = player.x;
    let y = player.y;
    return [
        [grid[x - 2][y - 2], grid[x - 2][y - 1], grid[x - 2][y], grid[x - 2][y + 1], grid[x - 2][y + 2]],
        [grid[x - 1][y - 2], grid[x - 1][y - 1], grid[x - 1][y], grid[x - 1][y + 1], grid[x - 1][y + 2]],
        [grid[x][y - 2], grid[x][y - 1], 'O', grid[x][y + 1], grid[x][y + 2]],
        [grid[x + 1][y - 2], grid[x + 1][y - 1], grid[x + 1][y], grid[x + 1][y + 1], grid[x + 1][y + 2]],
        [grid[x + 2][y - 2], grid[x + 2][y - 1], grid[x + 2][y], grid[x + 2][y + 1], grid[x + 2][y + 2]]
    ];
}

function player_location_description(grid_contents, monster_data) {
    let description = "";
    // check if grid_contents is a number
    if (grid_contents === "E") {
        description = "You are in a room with an entry portal. ";
    }
    if (grid_contents === "X") {
        description = "You are in a room with an exit portal. ";
    }
    if (grid_contents === "") {
        description = "You are in an empty room. ";
    } else if (!isNaN(grid_contents)) {
        // convert grid_contents to a number
        let num = parseInt(grid_contents) - 1;
        const monster_name = monster_data[num].name;
        description = `You are in a room with ${monster_name}.`;
    }

    return description;
}