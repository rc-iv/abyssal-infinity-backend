function player_attack(player) {
    return Math.floor(Math.random() * player.dmg);
}

function monster_attack(monster) {
    return Math.floor(Math.random() * monster.dmg);
}

function gain_xp(player, monster) {
    const next_level_xp = player.next_xp;
    const current_xp = player.xp;
    const xp_needed = next_level_xp - current_xp;
    console.log(`You gained ${monster.xp} xp!`);
    if (monster.xp >= xp_needed) {
        player.level = player.level + 1;
        player.dmg = player.dmg + 1;
        player.hp = player.hp + 5;
        player.max_hp = player.max_hp + 5;
        player.next_xp = player.next_xp * 2;
        player.xp = monster.xp - xp_needed;
        console.log(`You leveled up! You are now level ${player.level}.`);
    } else {
        player.xp = player.xp + monster.xp;
    }
    return player.xp;
}

function combat_simulation(player, monster_id) {
    let game = player.current_game;
    let monster = game.level.monsters[monster_id];
    let temp_player = player;
    // Perform attack logic here. Subtract player's damage from monster's hp.
    let player_damage = 0;
    let monster_damage = 0;
    let combat_id = 0;

    while (game.combat_log[combat_id]) {
        combat_id++;
    }
    game.combat_log[combat_id] = {
        combat_messages: []
    };
    game.combat_log[combat_id].monster = monster;
    console.log(`Combat log[combat_id]: ${JSON.stringify(game.combat_log[combat_id])}`);
    while (monster.hp > 0 && player.hp > 0) {
        player_damage = player_attack(temp_player);
        monster.hp = monster.hp - player_damage;
        if (monster.hp <= 0) {
            game.combat_log[combat_id].combat_messages.push(`You hit the ${monster.name} for ${player_damage} damage! You killed the ${monster.name}!`);
            game.combat_log[combat_id].combat_messages.push(`You earned ${monster.xp} xp!`);
            if (monster.loot.equipment !== null) {
                game.combat_log[combat_id].combat_messages.push(`You found a ${monster.loot.equipment.name}!`);
            }

            temp_player.xp = gain_xp(player, monster);
            temp_player = killMonster(player, monster_id);
            break;
        } else {
            game.combat_log[combat_id].combat_messages.push(`You hit the ${monster.name} for ${player_damage} damage! The ${monster.name} has ${monster.hp} hp left.`);
            monster_damage = monster_attack(monster);
            temp_player.hp = temp_player.hp - monster_damage;
            if (temp_player.hp <= 0) {
                temp_player.is_alive = false;
                game.combat_log[combat_id].combat_messages.push(`The ${monster.name} hit you for ${monster_damage} damage! You died!`);
                break;
            }
            game.combat_log[combat_id].combat_messages.push(`The ${monster.name} hit you for ${monster_damage} damage! You have ${player.hp} hp left.`);
        }
    }
    temp_player.current_game = game;
    return temp_player;
}

function killMonster(player, monster_id) {
    let game = player.current_game
    game.level.grid = removeMonster(game.level.grid, monster_id + 1);
    game.level.monsters[monster_id].status = "dead";
    player.player_square_contents = "";
    player.player_square_description = `You are in a room with the corpse of ${game.level.monsters[monster_id].name}.`;
    const monster_equipment = game.level.monsters[monster_id].loot.equipment;
    const monster_gold = game.level.monsters[monster_id].loot.gold;
    if (monster_equipment !== null) {
        player.inventory.push(monster_equipment);
    }
    player.gold += monster_gold;
    game.monsters_remaining--;
    player.current_game = game;
    return player;
}

function removeMonster(grid, monster_number) {
    const grid_size = grid.length;
    for (let i = 0; i < grid_size; i++) {
        for (let j = 0; j < grid_size; j++) {
            if (grid[i][j] === monster_number.toString()) {
                grid[i][j] = "";
                return grid;
            }
        }
    }
    return grid;
}

module.exports = {
    combat_simulation
}