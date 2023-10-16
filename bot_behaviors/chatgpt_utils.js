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
        
        // sort the interaction based on 'hourssincelastinteraction' in descending order
        const sortedResult = result.sort((a, b) => b.hourssincelastinteraction - a.hourssincelastinteraction);
        
        // Define the initial system message
        const chatPayload = [
            {
                role: "system",
                content: "You are polite, sophisticated, chatbot assistant."
            }
        ];

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

        console.log("\n*******CHATGPT_UTILS.JS:Oldest user message was:", sortedResult[sortedResult.length - 1].user_invoke_message, "\n*******CHATGPT_UTILS.JS:It was sent", sortedResult[sortedResult.length - 1].hourssincelastinteraction, "hours ago.");
        console.log("\n*******CHATGPT_UTILS.JS:Newest user message is:", sortedResult[0].user_invoke_message, "\n*******CHATGPT_UTILS.JS:It was sent", sortedResult[0].hourssincelastinteraction, "hours ago.");
        console.log("\n*******CHATGPT_UTILS.JS:Success! Chat payload is: ", JSON.stringify(chatPayload, null, 2));
        return chatPayload;
        


    } catch (error) {
        console.error("An error occurred while retrieving and formating interactions ", error);
    }
}

module.exports = {
    getAADObjectIdFromDB,
    getLast24HrInteractionPerUserFromDB
};