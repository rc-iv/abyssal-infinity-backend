exports.handler = async (event) => {
    console.log("Connect request", event);

    // For simplicity, we're just returning a 200 response to any $connect event.
    // In a real-world application, you might want to authenticate users.
    return {
        statusCode: 200
    };
};
