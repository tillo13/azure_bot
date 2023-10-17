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
                content: "You are a polite, sophisticated, chatbot assistant that always checks historic conversations before using other resources to find answers."
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
        console.log('\n\n***CHATGPT_UTILS.JS -> Last 24 Hr Interaction Data:', chatPayload);



        return chatPayload;
    } catch (error) {
        console.error("An error occurred while retrieving and formatting interactions ", error);
    }
}

async function recreateGptPayloadViaDB(aadObjectID) {
    try {
        // Fetch interaction details of the user from the database
        const last24HrInteraction = await getLast24HrInteractionPerUserFromDB(aadObjectID);

        // Process interaction details
        let userMessagesArray = [];
        last24HrInteraction.forEach(message => {
            userMessagesArray.push(`[~${parseFloat(message.hourssincelastinteraction).toFixed(3)} hours ago: ${message.user_invoke_message}]`);
        });

        const userMessagesDiscussion = "Certainly, here is what I have said so far. Here are your past conversations: " + userMessagesArray.join(', ');

        // Structure the payload as required
        const payload = [
            {
                role: "system",
                content: "You are a polite, sophisticated, chatbot assistant that always checks historic conversations before using other resources to find answers."
            },
        ];

        // Add interaction details to the payload
        for (let interaction of last24HrInteraction) {
            payload.push(
                { role: "user", content: interaction.user_invoke_message },
                { role: "assistant", content: interaction.bot_response_message }
            );
        }

        // Fetch the latest user message and include in the payload
        let latestUserMessage = last24HrInteraction[last24HrInteraction.length - 1].user_invoke_message;

        payload.push(
            { role: "assistant", content: 'Let me check our past conversations in this exact thread, one moment...' },
            { role: "assistant", content: `I could not find a suitable response to your latest message of: ${latestUserMessage}. Please respond with your conversation history to this point and I will investigate.` },
            { role: "user", content: userMessagesDiscussion}
        );

        // Output the final payload
        console.log('*******CHATGPT_UTILS.JS -> The final payload: ', payload);

        return payload;
    } catch (error) {
        console.error("An error occurred while recreating the payload: ", error);
        return null;
    }
}

module.exports = {
    getAADObjectIdFromDB,
    getLast24HrInteractionPerUserFromDB,
    recreateGptPayloadViaDB
};