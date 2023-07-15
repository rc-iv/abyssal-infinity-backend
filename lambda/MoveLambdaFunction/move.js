const sendMessage = require('./messaging');

exports.handler = async (event) => {
    let data = JSON.parse(event.body).data;
    let playerData = await movePlayer(data);
    console.log(`Player data: ${JSON.stringify(playerData)}`);
    try {
        await sendMessage(event, {action: 'move', data: playerData});
    } catch (e) {
        console.log('Error posting to connection', e);
        throw e;
    }
    return {
        statusCode: 200
    }

};

async function movePlayer(data) {
    const direction = data.direction;
    const player = data.player;
    if (!direction || !player) {
        return {status: 400, message: 'Missing parameters for move.'};
    }

    let game = player.current_game;

    console.log(`${player.name} is moving ${direction} in dungeon ${game.level.dungeon.name}. Location(${player.x},${player.y})`);

    // Calculate the new position of the player.
    let newX = player.x;
    let newY = player.y;
    switch (direction) {
        case 'north':
            newX -= 1;
            break;
        case 'east':
            newY += 1;
            break;
        case 'south':
            newX += 1;
            break;
        case 'west':
            newY -= 1;
            break;
        case 'retreat':
            newX = player.previous_x;
            newY = player.previous_y;
            break;
        default:
            return {status: 600, message: 'Invalid direction.'};
    }

    if (newX < 0 || newX >= game.level.grid.length || newY < 0 || newY >= game.level.grid.length) {
        console.log(`Player ${player.name} is out of bounds.`)
        return {status: 600, message: 'Move is out of bounds.'};
    }
    if (game.level.grid[newX][newY] === '#') {
        console.log(`Player ${player.name} is blocked.`)
        return {status: 600, message: 'Move is blocked.'};
    }

    // Set old player location to previous contents.
    game.level.grid[player.x][player.y] = player.player_square_contents;
    // Set previous player square
    player.previous_x = player.x;
    player.previous_y = player.y;
    // Update the player's position and send the new game state.
    player.x = newX;
    player.y = newY;
    player.player_square_contents = game.level.grid[newX][newY];
    player.player_square_description = player_location_description(game.level.grid[newX][newY], game.level.monsters);
    game.level.grid[newX][newY] = "P";
    player.player_view = getPlayerView(game.level.grid, {x: newX, y: newY});
    game.combat_just_ended = false;
    player.current_game = game;

    return player;
}

function player_location_description(grid_contents, monster_data) {
    console.log(`getting player location description for ${grid_contents}`);
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