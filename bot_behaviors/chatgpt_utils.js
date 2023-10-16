const {
    fetchAADObjectIdFromDB,
    fetchLast24HrInteractionPerUserFromDB
} = require('../utilities/postgres_utils');

async function getAADObjectIdFromDB(chatID) {
    const result = await fetchAADObjectIdFromDB(chatID);
    return result;
}

async function getLast24HrInteractionPerUserFromDB(aadObjectID) {
    try {
        // fetch the last 24 hour interaction from the database
        const result = await fetchLast24HrInteractionPerUserFromDB(aadObjectID);
        
        // sort the interaction based on 'hourssincelastinteraction' in ascending order
        const sortedResult = result.sort((a, b) => a.hourssincelastinteraction - b.hourssincelastinteraction);
        
        // Define the initial system message
        const chatPayload = [
            {
                role: "system",
                content: "You are polite, sophisticated, chatbot assistant."
            }
        ]

        // mapping the sorted results to the required format and pushing into the chat payload
        sortedResult.forEach(message => {
            chatPayload.push(
                {
                    role: "user",
                    content: message.user_invoke_message,
                },
                {
                    role: "assistant",
                    content: message.bot_response_message,
                }
            );
        });

        console.log("Success! Chat payload is:", JSON.stringify(chatPayload));
        return chatPayload;

    } catch (error) {
        console.error("An error occurred while retrieving and formating interactions: ", error);
    }
}

module.exports = {
    getAADObjectIdFromDB,
    getLast24HrInteractionPerUserFromDB
};