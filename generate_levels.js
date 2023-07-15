require('dotenv').config();
const {generateMaze, addNPCs, printGrid} = require("./gridGenerator");
const {get_monster_prompt, get_merchant_prompt,get_loot_prompt, get_merchant_loot_prompt, get_dungeon_prompt} = require("./prompts");
const axios = require('axios');
const AWS = require('aws-sdk');
const {v4: uuidv4} = require('uuid');
const {Configuration, OpenAIApi} = require('openai');
const {create} = require("axios");

AWS.config.update({
    region: 'us-east-1', // set your region
    accessKeyId: process.env.AWS_ACCESS_KEY, // set your access key
    secretAccessKey: process.env.AWS_SECRET_KEY // set your secret key
});

// Create AWS dynamodb client to store levels
const docClient = new AWS.DynamoDB.DocumentClient();

// Create OpenAI client to generate dungeons, monsters, loot, merchants, etc.
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Create an S3 client for sprite storage
const s3 = new AWS.S3();

const THEMES = ["fantasy", "forgotten realms", "science fiction", "lord of the rings",
    "harry potter", "star wars", "star trek", "dungeons and dragons", "game of thrones",
    "the witcher", "the elder scrolls", "the legend of zelda", "final fantasy", "pokemon",
    "world of warcraft", "diablo", "magic the gathering", "cyberpunk", "steampunk",
    "horror", "superhero", "western", "pirate", "post apocalyptic", "space", "space western",];

const SIZE = 10;
const NUM_MONSTERS = 10;

async function create_level(themes) {
    await processInChunks(themes, createLevel, 4);
}

async function processInChunks(array, process, concurrencyLimit) {
    const chunks = [];
    for (let i = 0; i < array.length; i += concurrencyLimit) {
        chunks.push(array.slice(i, i + concurrencyLimit));
    }
    for (const chunk of chunks) {
        await Promise.all(chunk.map(process));
    }
}


async function createLevel(theme = null) {
    let grid = generateMaze(SIZE);
    if (theme === null) {
        theme = generate_theme();
    }
    console.log("Creating level with theme: " + theme);
    grid = addNPCs(grid, NUM_MONSTERS); // for example, add 5 monsters
    printGrid(grid);
    // replace all "." in grid with " "
    for (let i = 0; i < grid.length; i++) {
        grid[i] = grid[i].map((x) => {
            if (x === '.') {
                return '';
            } else {
                return x;
            }
        });
    }
    let generated_dungeon = null;
    try {
        generated_dungeon = await generateDungeon(theme);
    } catch (e) {
        console.log(`Error generating dungeon: ${e}`);
    }
    while (generated_dungeon === null) {
        try {
            generated_dungeon = await generateDungeon(theme);
        } catch (e) {
            console.log(`Error generating dungeon: ${e}`);
        }
    }
    let monsters = null;
    try {
        monsters = await generateMonsters(generated_dungeon, NUM_MONSTERS);
    } catch (e) {
        console.log(`Error generating monsters: ${e}`);
    }
    while (monsters === null) {
        try {
            monsters = await generateMonsters(generated_dungeon, NUM_MONSTERS);
        } catch (e) {
            console.log(`Error generating monsters: ${e}`);
        }
    }
    let merchant = null;
    try {
        merchant = await generateMerchant(generated_dungeon);
    } catch (e) {
        console.log(`Error generating merchant: ${e}`);
    }
    while (merchant === null) {
        try {
            merchant = await generateMerchant(generated_dungeon);
        } catch (e) {
            console.log(`Error generating merchant: ${e}`);
        }
    }
    const level = {}
    level.grid = grid;
    level.dungeon = generated_dungeon;
    level.monsters = monsters;
    level.merchant = merchant;
    level.id = await saveNewLevel(level);
    return level.id
}

function generate_theme() {
    return THEMES[Math.floor(Math.random() * THEMES.length)];
}

async function generateDungeon(theme) {
    console.log(`Generating ${theme} themed dungeon...`);
    const response = await openai.createChatCompletion({
        model: "gpt-4",
        messages: get_dungeon_prompt(theme),
        max_tokens: 1000,
    });
    console.log("Dungeon generated!")
    try {
        let data = JSON.parse(response.data.choices[0].message.content);
        data.theme = theme;
        return data;
    } catch (e) {
        console.log(e);
        console.log(response)
        return null;
    }
}

async function generateMonsters(dungeon, num_monsters) {
    console.log(`Generating monsters for ${dungeon.theme} themed dungeon...`)
    const response = await openai.createChatCompletion({
        model: "gpt-4",
        messages: get_monster_prompt(dungeon, num_monsters),
        max_tokens: 1000,
    });

    try {
        let data = JSON.parse(response.data.choices[0].message.content);
        // Add hp and damage attributes to each monster.
        data.monsters.forEach(monster => {
            monster.status = "alive";
            monster.strength = monster.strength.toLowerCase();
            switch (monster.strength) {
                case "weak":
                    monster.loot_coefficient = 0.5;
                    break;
                case "normal":
                    monster.loot_coefficient = 0.6;
                    break;
                case "elite":
                    monster.loot_coefficient = 0.75;
                    break;
                case "boss":
                    monster.loot_coefficient = 1;
                    break;
                default:
                    monster.loot_coefficient = 0.5;
                    break;
            }
        });
        let monsters = await generate_loot(data.monsters);
        monsters = await generate_monster_sprites(dungeon, monsters);

        return (monsters);
    } catch (e) {
        console.log(e);
        return null;
    }
}

async function generateMonsterSprite(dungeon, monster) {
    const fileName = `${monster.name.replace(/ /g, '_')}.png`;
    const s3Key = `images/monsters/${dungeon.theme}/${fileName}`;

    try {
        // Check if the image already exists in S3
        await s3.headObject({
            Bucket: process.env.BUCKET_NAME,
            Key: s3Key
        }).promise();
        console.log(`Image for monster ${monster.name} already exists.`);
    } catch (headErr) {
        if (headErr.code === 'NotFound') {
            // If the image doesn't exist in S3, generate a new one
            console.log(`Image for monster ${monster.name} does not exist, generating...`);
            try {
                const response = await openai.createImage({
                    prompt: `generate a pixel art sprite of a ${monster.name} with black background. ${monster.description}`,
                    n: 1,
                    size: "256x256" // Adjust the size as needed for your game
                });

                // Download the image
                const imageUrl = response.data.data[0].url;
                const imageResponse = await axios.get(imageUrl, {responseType: 'arraybuffer'});

                // Upload the image to S3
                await s3.upload({
                    Bucket: process.env.BUCKET_NAME,
                    Key: s3Key,
                    Body: imageResponse.data,
                    ContentType: 'image/png'
                }).promise();

                console.log(`Image for monster ${monster.name} successfully uploaded.`);
            } catch (e) {
                console.error(`Failed to generate image for monster ${monster.name}: ${e}`);
                return null;
            }
        } else {
            // Handle any other errors
            throw headErr;
        }
    }

    // Return the URL of the image file in the S3 bucket
    return `https://${process.env.BUCKET_NAME}.s3.amazonaws.com/${encodeURIComponent(s3Key)}`;
}

async function generate_monster_sprites(dungeon, monsters) {
    let new_monsters = monsters;
    for (let i = 0; i < monsters.length; i++) {
        new_monsters[i].imageURL = await generateMonsterSprite(dungeon, monsters[i]);
    }
    return new_monsters;
}

async function generateMerchant(dungeon) {
    console.log(`Generating merchant for ${dungeon.theme} themed dungeon...`)
    const response = await openai.createChatCompletion({
        model: "gpt-4",
        messages: get_merchant_prompt(dungeon),
        max_tokens: 1000,
    });

    try {
        let data = JSON.parse(response.data.choices[0].message.content);
        console.log(`Merchant data: ${JSON.stringify(data)}`);
        let merchant = await generate_merchant_inventory(data);
        merchant.image = await generateMerchantSprite(dungeon, merchant);

        return (merchant);
    } catch (e) {
        console.log(e);
        return null;
    }
}

async function generateMerchantSprite(dungeon, merchant) {
    const fileName = `${merchant.name.replace(/ /g, '_')}.png`;
    const s3Key = `images/merchants/${dungeon.theme}/${fileName}`;

    try {
        // Check if the image already exists in S3
        await s3.headObject({
            Bucket: process.env.BUCKET_NAME,
            Key: s3Key
        }).promise();
        console.log(`Image for merchant ${merchant.name} already exists.`);
    } catch (headErr) {
        if (headErr.code === 'NotFound') {
            // If the image doesn't exist in S3, generate a new one
            console.log(`Image for merchant ${merchant.name} does not exist, generating...`);
            try {
                const response = await openai.createImage({
                    prompt: `generate a pixel art sprite of a merchant named ${merchant.name} with black background. ${merchant.description}`,
                    n: 1,
                    size: "256x256"
                });

                // Download the image
                const imageUrl = response.data.data[0].url;
                const imageResponse = await axios.get(imageUrl, {responseType: 'arraybuffer'});

                // Upload the image to S3
                await s3.upload({
                    Bucket: process.env.BUCKET_NAME,
                    Key: s3Key,
                    Body: imageResponse.data,
                    ContentType: 'image/png'
                }).promise();

                console.log(`Image for merchant ${merchant.name} successfully uploaded.`);
            } catch (e) {
                console.error(`Failed to generate image for merchant ${merchant.name}: ${e}`);
                return null;
            }
        } else {
            // Handle any other errors
            throw headErr;
        }
    }

    // Return the URL of the image file in the S3 bucket
    return `https://${process.env.BUCKET_NAME}.s3.amazonaws.com/${encodeURIComponent(s3Key)}`;
}

async function saveNewLevel(level) {
    console.log(`Saving level: ${JSON.stringify(level, null, 2)}`);
    // Generate level_id
    const level_id = `${level.dungeon.name}-${uuidv4()}`;
    const params = {
        TableName: "abyssal-infinity-levels",
        Item: {
            "level_id": level_id,
            "theme": level.dungeon.theme,
            "level_data": level
        }
    };

    try {
        await docClient.put(params).promise();
        console.log(`Level saved to DynamoDB with level ID: ${level_id}`);
    } catch (err) {
        console.error(`Unable to save level. Error JSON: ${JSON.stringify(err, null, 2)}`);
    }

    // Check if Level Index exists
    const getIndexParams = {
        TableName: "abyssal-infinity-levels",
        Key: {
            "level_id": "level_index",
            "theme": level.dungeon.theme
        }
    };

    try {
        const levelIndex = await docClient.get(getIndexParams).promise();
        if (!levelIndex.Item) { // if levelIndex does not exist
            const createIndexParams = {
                TableName: "abyssal-infinity-levels",
                Item: {
                    "level_id": "level_index",
                    "theme": level.dungeon.theme,
                    "level_ids": docClient.createSet([level_id])
                }
            };
            await docClient.put(createIndexParams).promise();
            console.log(`Level Index created with new level ID`);
        } else {
            // Update Level Index
            const updateParams = {
                TableName: "abyssal-infinity-levels",
                Key: {
                    "level_id": "level_index",
                    "theme": level.dungeon.theme
                },
                UpdateExpression: "ADD #level_ids_list :new_level_id",
                ExpressionAttributeNames: {
                    "#level_ids_list": "level_ids"
                },
                ExpressionAttributeValues: {
                    ":new_level_id": docClient.createSet([level_id]) // Adding level_id to the Set of level_ids
                },
                ReturnValues: "UPDATED_NEW"
            };

            const updatedIndex = await docClient.update(updateParams).promise();
            console.log(`Level Index updated with new level ID: ${updatedIndex}`);
        }
    } catch (err) {
        console.error(`Unable to update level index. Error JSON: ${JSON.stringify(err, null, 2)}`);
    }

    return level_id;
}

async function generateItemImage(item) {
    let description = item.slot;
    if (item.slot === "chest" || item.slot === "leg") {
        description += " armor";
    }
    const imagePath = `images/loot/${item.slot}/${item.name.replace(/ /g, '_')}.png`;

    try {
        // Check if the image already exists in S3
        await s3.headObject({
            Bucket: process.env.BUCKET_NAME,
            Key: imagePath
        }).promise();
        console.log(`Image for item ${item.name} already exists.`);
    } catch (headErr) {
        if (headErr.code === 'NotFound') {
            // If the image doesn't exist in S3, generate a new one
            console.log(`Image for item ${item.name} does not exist, generating...`);
            try {
                const response = await openai.createImage({
                    prompt: `generate a pixel art image of ${description} called ${item.name}`,
                    n: 1,
                    size: "256x256" // Adjust the size as needed for your game
                });

                // Download the image
                const imageUrl = response.data.data[0].url;
                const imageResponse = await axios.get(imageUrl, {responseType: 'arraybuffer'});

                // Upload the image to S3
                const uploadResponse = await s3.upload({
                    Bucket: process.env.BUCKET_NAME,
                    Key: imagePath,
                    Body: imageResponse.data,
                    ContentType: 'image/png' // assuming the image is a PNG
                }).promise();

                return uploadResponse.Location;
            } catch (e) {
                console.error(`Failed to generate image for item ${item.name}: ${e}`);
                return null;
            }
        } else {
            // Handle any other errors
            throw headErr;
        }
    }
    // If the image already exists, return its URL
    return `https://${process.env.BUCKET_NAME}.s3.amazonaws.com/${encodeURIComponent(imagePath)}`;
}

async function generate_loot(monsters) {
    for (let i = 0; i < monsters.length; i++) {
        monsters[i].loot = {equipment: null, gold: 0}
        // randomly decide if the monster has loot
        if (Math.random() <= monsters[i].loot_coefficient) {
            const response = await openai.createChatCompletion({
                model: "gpt-3.5-turbo",
                messages: get_loot_prompt(monsters[i]),
                max_tokens: 200,
            });
            try {
                let item = JSON.parse(response.data.choices[0].message.content);
                // make sure item.slot is lower case
                item.slot = item.slot.toLowerCase();
                // Generate an image for the item
                item.image = await generateItemImage(item);

                monsters[i].loot.equipment = item;
            } catch (e) {
                console.log(e);
                monsters[i].loot.equipment = null;
            }
        } else {
            monsters[i].loot.equipment = null;
        }
    }
    return monsters;
}

async function generate_merchant_inventory(merchant) {
    merchant.inventory = [];
    //  loop 1 to 4 times randomly
    while (merchant.inventory.length < 1) {
        for (let i = 0; i < Math.floor(Math.random() * 2) + 1; i++) {
            const response = await openai.createChatCompletion({
                model: "gpt-3.5-turbo",
                messages: get_merchant_loot_prompt(merchant),
                max_tokens: 200,
            });

            try {
                let item = JSON.parse(response.data.choices[0].message.content);
                // make sure item.slot is lower case
                item.slot = item.slot.toLowerCase();
                // Generate an image for the item
                item.image = await generateItemImage(item);

                merchant.inventory.push(item);
            } catch (e) {
                console.log(e);
            }
        }
    }
    return merchant;
}

(async function () {
    await create_level(THEMES);
})();