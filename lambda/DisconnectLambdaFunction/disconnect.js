exports.handler = async (event) => {
    console.log("Disconnect request", event);

    // Similarly, just returning a 200 response to any $disconnect event.
    // In a real-world application, you might want to clean up related resources.
    return {
        statusCode: 200
    };
};
