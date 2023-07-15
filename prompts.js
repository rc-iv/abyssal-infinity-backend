function get_dungeon_prompt(theme) {
    return [
        {
            role: "system",
            content: 'You are a dungeon generator who generates dungeons with a name, theme, backstory, and color palette. You return only json data. Do not return any text besides json'
        },
        {
            role: "user",
            content: `Generate a ${theme} themed dungeon.Return only the json data. Do not include any leading or trailing text.For example:\n" +
                    "{\n" +
                    "  \"name\": \"The Forgotten Catacombs\",\n" +
                    "  \"theme\": \"Ancient Ruins\",\n" +
                    "  \"backstory\": \"Long ago, a powerful civilization thrived in these catacombs. It was said to possess great knowledge and arcane secrets. However, an unforeseen catastrophe befell the civilization, causing its downfall. Now, the catacombs are forgotten, filled with traps, treasures, and the remnants of a bygone era.\",\n" +
                    "  \"color_palette\": \n"+
                    "    \"background_colors\": list of 3 dark shades of color,\n"+
                    "    \"text_colors\": list of 2 colors that contrast the 3 background colors\n" +
                    "}\n" +
                    " ensure that the background_colors and text_colors have high contrast`,
        },
    ];
}


function get_monster_prompt(dungeon, num_monsters) {
    return [
        {
            role: "system",
            content: 'You are a dungeon generator who populates monsters into a dungeon based on dungeon data. You return only json data. Do not return any text besides json'
        },
        {
            role: "user",
            content: `Generate ${num_monsters} monsters for the provided dungeon. Return only the monster data as a json object giving each monster\'s "name", "description", "strength" (weak, normal, elite, boss), "color" (dark shade of color to contrast white text), "weakness element", "strength element" elements are : physical, cold, fire, earth, wind, water. Dungeon name: ${dungeon.name}, theme: ${dungeon.theme}, backstory: ${dungeon.backstory}, color palette: ${dungeon.color_palette}. Return only the json data with no text before or after.`,
        },
    ];
}

function get_merchant_prompt(dungeon) {
    return [
        {
            role: "system",
            content: 'You are a dungeon generator who populates npvs into a dungeon based on dungeon data. You return only json data. Do not return any text besides json'
        },
        {
            role: "user",
            content: `Generate a merchant for the provided dungeon. Return only the merchant data as a json object giving the merchant's: "name", "description". Dungeon name: ${dungeon.name}, theme: ${dungeon.theme}, backstory: ${dungeon.backstory}, color palette: ${dungeon.color_palette}. Return only the json data with no text before or after.`,
        },
    ];
}

function get_loot_prompt(monster){
    const slots = ["gloves", "boots", "chest", "weapon", "leg", "helmet"];
    const slot = slots[Math.floor(Math.random() * slots.length)];
    return [
        {
            role: "system",
            content: 'You are a loot generator that creates items that monsters would own. You return only json data. Do not return any text besides json'
        },
        {
            role: "user",
            content: `Return the name of the ${slot} loot item that the give monster will drop. Monster name: ${monster.name} Monster description: ${monster.description} Return it as a json object containing the following fields: "name" and "slot" (gloves, boots, chest, weapon, leg, helmet). Return only the json data with no text before or after.`,
        },
    ];
}

function get_merchant_loot_prompt(merchant){
    const slots = ["gloves", "boots", "chest", "weapon", "leg", "helmet"];
    const slot = slots[Math.floor(Math.random() * slots.length)];
    return [
        {
            role: "system",
            content: 'You are a loot generator that creates items that merchants sell. You return only json data. Do not return any text besides json'
        },
        {
            role: "user",
            content: `Return the name of the ${slot} loot item that the given merchant will sell. Merchant name: ${merchant.name} Merchant description: ${merchant.description} Return it as a json object containing the following fields: "name" and "slot" (gloves, boots, chest, weapon, leg, helmet). Return only the json data with no text before or after.`,
        },
    ];
}

module.exports = {get_dungeon_prompt, get_monster_prompt, get_loot_prompt, get_merchant_prompt, get_merchant_loot_prompt};