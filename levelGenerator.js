const { createLevel } = require('./lambda/shared/game_utilities');

async function generateLevel() {
    try {
        const dungeon = await createLevel();
        process.send(dungeon);
    } catch (error) {
        process.send({ error });
    }
}

process.on('message', () => {
   generateLevel().then(r => console.log(r));
});
