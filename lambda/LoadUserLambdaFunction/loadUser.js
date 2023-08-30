const sendMessage = require('./messaging');
const {loadUser, doesUserExist} = require("./dbOperations");

exports.handler = async (event) => {
    let data = JSON.parse(event.body).data;
    console.log(`Load user data: ${JSON.stringify(data)}`);
    let userData = await handleUser(data);
    try {
        await sendMessage(event, {action: 'loadUser', data: userData});
    } catch (e) {
        console.log('Error posting to connection', e);
        throw e;
    }
    return {
        statusCode: 200
    }
};

async function handleUser(data) {
    let userId = data.userId;
    let user;
    if (!await doesUserExist(userId)){
        user = createUser(userId);
    } else {
        user = await loadUser(userId);
    }
    return user;
}

function createUser(userId) {
    return {
        user_id: userId,
        stash: {},
        completed_levels: [],
        players:{}
    };
}