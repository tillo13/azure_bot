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
        // fetch the last 24-hour interaction from the database
        const result = await fetchLast24HrInteractionPerUserFromDB(aadObjectID);
        
        // sort the interaction based on 'hourssincelastinteraction' in descending order
        const sortedResult = result.sort((a, b) => b.hourssincelastinteraction - a.hourssincelastinteraction);
        
        // Define the initial system message
        const chatPayload = [
            {
                role: "system",
                content: "You are a polite, sophisticated, chatbot assistant."
            }
        ];

        // start a new array to hold each user message
        const userMessagesArray = [];

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
            userMessagesArray.push(`[~${parseFloat(message.hourssincelastinteraction).toFixed(3)} hours ago: ${message.user_invoke_message}]`);
        });

        // Join each message and interaction time with ', ' to create the final string
        const userMessagesinLast24hrswithapproximateTimessortedChronologically = userMessagesArray.join(', ');
        const formattedUserMessages = "In the last 24 hours, I have said the following with the approximate times they were mentioned: " + userMessagesinLast24hrswithapproximateTimessortedChronologically;
        console.log("\n*******CHATGPT_UTILS.JS: Messages along with their approximate times: ", formattedUserMessages);
        
        console.log("\n*******CHATGPT_UTILS.JS: The most recent user message in the last 24 hours: ", sortedResult[sortedResult.length - 1].user_invoke_message);
        console.log("\n*******CHATGPT_UTILS.JS: The most recent user message was received", sortedResult[sortedResult.length - 1].hourssincelastinteraction, "hours ago.");
        console.log("\n*******CHATGPT_UTILS.JS: The oldest user message in the last 24 hours: ", sortedResult[0].user_invoke_message);
        console.log("\n*******CHATGPT_UTILS.JS: The oldest user message was received", sortedResult[0].hourssincelastinteraction, "hours ago.");

        return chatPayload;
    } catch (error) {
        console.error("An error occurred while retrieving and formatting interactions ", error);
    }
}

module.exports = {
    getAADObjectIdFromDB,
    getLast24HrInteractionPerUserFromDB
};