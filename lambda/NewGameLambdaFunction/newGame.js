const sendMessage = require('./messaging');
const {loadUser, doesUserExist, getLevelForPlayer} = require("./dbOperations");
const {saveGameState} = require("./dbWrite");
const {v4: uuidv4} = require("uuid");

exports.handler = async (event) => {
    let data = JSON.parse(event.body).data;
    let playerData = await startGame(data);
    console.log(`Player data: ${JSON.stringify(playerData)}`);
    try {
        await sendMessage(event, {action: 'newGame', data: playerData});
    } catch (e) {
        console.log('Error posting to connection', e);
        throw e;
    }
    return {
        statusCode: 200
    }
};

const STARTING_GEAR = {
    gloves: {
        name: "Tattered Gloves",
        slot: "gloves",
        hp: 2,
        dmg: 0,
        image: `https://abyssal-infinity-images.s3.amazonaws.com/images/loot/gloves/tattered_gloves.png`,
        value: 1
    },
    boots: {
        name: "Tattered Boots",
        slot: "boots",
        hp: 2,
        dmg: 0,
        image: `https://abyssal-infinity-images.s3.amazonaws.com/images/loot/boots/tattered_boots.png`,
        value: 1
    },
    chest: {
        name: "Tattered Shirt",
        slot: "chest",
        hp: 2,
        dmg: 0,
        image: `https://abyssal-infinity-images.s3.amazonaws.com/images/loot/chest/tattered_shirt.png`,
        value: 1
    },
    helmet: {
        name: "Tattered Hat",
        slot: "helmet",
        hp: 2,
        dmg: 0,
        image: `https://abyssal-infinity-images.s3.amazonaws.com/images/loot/helmet/tattered_hat.png`,
        value: 1
    },
    leg: {
        name: "Tattered Pants",
        slot: "leg",
        hp: 2,
        dmg: 0,
        image: `https://abyssal-infinity-images.s3.amazonaws.com/images/loot/leg/tattered_pants.png`,
        value: 1
    },
    weapon: {
        name: "Fists",
        slot: "weapon",
        hp: 0,
        dmg: 2,
        image: `https://abyssal-infinity-images.s3.amazonaws.com/images/loot/weapon/fists.png`,
        value: 1
    }
};

async function startGame(data) {
    // noinspection JSUnresolvedVariable
    const playerName = data.playerName;
    const userId = data.userId;
    if (!playerName || !playerName) {
        return {status: 400, message: 'Player name and userId are required.'}
    }
    let new_user;
    if (await doesUserExist(userId)) {
        console.log(`User ${userId} exists.`)
        new_user = await loadUser(userId); // write the function load_user that loads the user data from the database
    } else {
        console.log(`User ${userId} does not exist.`)
        new_user = create_user(userId);
    }


    let new_player = create_player(playerName);
    new_player.current_game = await startNewGame(new_player);
    new_player = move_player_to_new_level(new_player);
    console.log(`player id: ${new_player.id}`);

    new_player.connectionId = data.connectionId;
    await saveGameState(new_user, new_player);

    return new_player;
}

function create_user(userId) {
    return {
        user_id: userId,
        stash: {},
        completed_levels: [],
        players:{} // player_id: player
    };
}

function create_player(playerName) {
    return {
        name: playerName,
        id: `${playerName}-${uuidv4()}`,
        level: 1,
        xp: 0,
        next_xp: 100,
        max_hp: 80,
        hp: 80,
        is_alive: true,
        base_dmg: 5,
        dmg: 10,
        heals_used: 0,
        equipped: STARTING_GEAR,
        inventory: [],
        stash: {},
        gold: 0,
        completed_levels: [],
        x: 4,
        y: 5
    };
}

function move_player_to_new_level(player) {
    player.x = 4;
    player.y = 5;
    player.player_square_contents = player.current_game.level.grid[4][5]; // contents of the player's square
    player.player_square_description = player_location_description(player.current_game.player_square_contents, player.current_game.level.monsters); // description of the player's square
    player.player_view = getPlayerView(player.current_game.level.grid, player); // get the player's view
    return player;
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

async function startNewGame(player) {
    const game = {};
    game.id = uuidv4();
    game.combat_log = {}; // initialize the combat log
    game.dungeon_level = 1; // start at level 1
    game.level = await getLevelForPlayer(player.completed_levels);
    return populate_level(game, 1);
}

function populate_level(game, level) {
    game.level.monsters = add_monster_stats(game, level); // give the monsters stats
    game = give_loot_stats(game, level); // give the loot stats
    game.monsters_remaining = game.level.monsters.length; // number of monsters remaining
    return game;
}

function add_monster_stats(game) {
    const monsters = game.level.monsters;
    let level = game.dungeon_level
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
    let level = game.dungeon_level
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