const AWS = require('aws-sdk');

AWS.config.update({
    region: 'us-east-1', // set your region
    accessKeyId: process.env.AWS_ACCESS_KEY, // set your access key
    secretAccessKey: process.env.AWS_SECRET_KEY // set your secret key
});

const docClient = new AWS.DynamoDB.DocumentClient();

function generate_theme() {
// list of dungeon themes
    const themes = ["fantasy", "forgotten realms", "science fiction", "lord of the rings",
    "harry potter", "star wars", "star trek", "dungeons and dragons", "game of thrones",
    "the witcher", "the elder scrolls", "the legend of zelda", "final fantasy", "pokemon",
    "world of warcraft", "diablo", "magic the gathering", "cyberpunk", "steampunk",
    "horror", "superhero", "western", "pirate", "post apocalyptic", "space", "space western",];
    return themes[Math.floor(Math.random() * themes.length)];
}
async function getLevelForPlayer(playerCompletedLevels) {
    // Generate a random theme
    const theme = generate_theme();

    // Retrieve the list of level IDs for the theme
    const getThemeLevelsParams = {
        TableName: "abyssal-infinity-levels",
        Key: {
            "level_id": "level_index",
            "theme": theme
        }
    };

    try {
        const themeLevels = await docClient.get(getThemeLevelsParams).promise();


        // Check each level ID in the theme to see if it's in the player's completed list
        const themeLevelIds = themeLevels.Item.level_ids.values;
        for (const levelId of themeLevelIds) {
            if (!playerCompletedLevels.includes(levelId)) {
                // If the level hasn't been completed by the player, return it
                console.log(`Level ID ${levelId} has not been completed by the player`);
                return await getLevelById(levelId, theme);
            }
        }

        // If all levels have been completed by the player, return a random one
        const randomLevelId = themeLevelIds[Math.floor(Math.random() * themeLevelIds.length)];
        console.log(`All levels in theme ${theme} have been completed by the player. Returning random level ID ${randomLevelId}`);
        return await getLevelById(randomLevelId, theme);

    } catch (err) {
        console.error(`Unable to generate new level for player. Error JSON: ${JSON.stringify(err, null, 2)}`);
        return null;
    }
}

async function getLevelById(levelId, theme) {
    // Params for the request
    const params = {
        TableName: 'abyssal-infinity-levels',
        Key: {
            'level_id': levelId,
            'theme': theme
        }
    };

    // Make the request
    try {
        const response = await docClient.get(params).promise();

        // If the response is empty, return null
        if (!response.Item) {
            console.log(`Level ID ${levelId} not found`);
            return null;
        }

        // Otherwise, return the level data
        return response.Item.level_data;
    } catch (err) {
        console.error(`Unable to retrieve level. Error JSON: ${JSON.stringify(err, null, 2)}`);
        return null;
    }
}

async function doesUserExist(userId) {
    const params = {
        TableName: "abyssal-infinity-users",
        Key: {
            "user_id": userId
        }
    };

    try {
        const data = await docClient.get(params).promise();

        // If the Item property exists, then the user exists in the database
        return !!data.Item;
    } catch (err) {
        console.error(`Unable to check user. Error JSON: ${JSON.stringify(err, null, 2)}`);
        throw err; // or return some error indicator
    }
}

async function loadUser(userId) {
    const params = {
        TableName: "abyssal-infinity-users",
        Key: {
            "user_id": userId
        }
    };

    try {
        const data = await docClient.get(params).promise();

        // If the Item property exists, then the user exists in the database
        if (data.Item) {
            console.log(`User ${userId} loaded successfully`)
            return data.Item;
        } else {
            console.error(`User does not exist. User ID: ${userId}`);
            throw new Error(`User does not exist. User ID: ${userId}`);
        }
    } catch (err) {
        console.error(`Unable to load user. Error JSON: ${JSON.stringify(err, null, 2)}`);
        throw err; // or return some error indicator
    }
}


module.exports = {
    getLevelForPlayer,
    doesUserExist,
    loadUser
}