// We define constants for directions and the size of the maze.
const DIRECTIONS = [
    [-2, 0], // Up
    [0, 2],  // Right
    [2, 0],  // Down
    [0, -2]  // Left
];

// A helper function to create a blank grid.
function createGrid(size) {
    return new Array(size).fill(null).map(() => new Array(size).fill('#'));
}

function fillWalls(grid) {
    const rowLen = grid[0].length;
    const padRow = Array(rowLen + 4).fill('#');
    const newGrid = [padRow, ...grid.map(row => ['#', '#', ...row, '#', '#']), padRow];
    return newGrid;
}

// The main function that generates the maze.
function generateMaze(size) {
    let grid = createGrid(size + 4);
    let stack = [];
    let start = [3, 3];

    grid[start[0]][start[1]] = 'E';
    stack.push(start);

    while (stack.length > 0) {
        let current = stack.pop();
        let neighbours = [];

        DIRECTIONS.forEach(([dx, dy]) => {
            let nx = current[0] + dx;
            let ny = current[1] + dy;
            if (nx >= 0 && nx < size + 3 && ny >= 0 && ny < size + 3 && grid[nx][ny] === '#') {
                let opposite = [current[0] + dx / 2, current[1] + dy / 2];
                if (grid[opposite[0]][opposite[1]] === '#') {
                    neighbours.push([nx, ny]);
                }
            }
        });

        if (neighbours.length > 0) {
            stack.push(current);

            let randomNeighbour = neighbours[Math.floor(Math.random() * neighbours.length)];
            let nx = current[0] + (randomNeighbour[0] - current[0]) / 2;
            let ny = current[1] + (randomNeighbour[1] - current[1]) / 2;

            grid[randomNeighbour[0]][randomNeighbour[1]] = '.';
            grid[nx][ny] = '.';
            stack.push(randomNeighbour);
        }
    }

    grid[size + 1][size + 2] = '.';
    grid[size + 1][size + 3] = 'X';

    return fillWalls(grid);
}

function printGrid(grid) {
    console.log("Board:");
    console.log();
    for (let i = 0; i < grid.length; i++) {
        console.log(grid[i].join('|'));
    }
}

function addMonsters(grid, numMonsters) {
    const grid_size = grid.length;
    while (numMonsters > 0) {
        let x = Math.floor(Math.random() * grid_size);
        let y = Math.floor(Math.random() * grid_size);

        // Check that the space is a floor and not the entrance or exit
        if (grid[x][y] === '.' && grid[x][y] !== 'E' && grid[x][y] !== 'X') {
            grid[x][y] = numMonsters.toString();
            numMonsters--;
        }
    }
    return grid;
}
function addHealer(grid){
    const grid_size = grid.length;
    while (true) {
        let x = Math.floor(Math.random() * grid_size);
        let y = Math.floor(Math.random() * grid_size);

        // Check that the space is a floor and not the entrance or exit
        if (grid[x][y] === '.' && grid[x][y] !== 'E' && grid[x][y] !== 'X') {
            grid[x][y] = 'H';
            break;
        }
    }
    return grid;
}

function addMerchant(grid){
    const grid_size = grid.length;
    while (true) {
        let x = Math.floor(Math.random() * grid_size);
        let y = Math.floor(Math.random() * grid_size);

        // Check that the space is a floor and not the entrance or exit
        if (grid[x][y] === '.' && grid[x][y] !== 'E' && grid[x][y] !== 'X') {
            grid[x][y] = 'M';
            break;
        }
    }
    return grid;
}

function addNPCs(grid, num_monsters){
    grid = addMonsters(grid, num_monsters);
    grid = addHealer(grid);
    grid = addMerchant(grid);
    return grid;
}



// We export the generateMaze function so that we can use it in other files.
module.exports = {
    generateMaze,
    printGrid,
    addNPCs
}