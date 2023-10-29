const global_configs = require('../utilities/global_configs.js');
const {
    fetchAADObjectIdFromDB,
    fetchLast24HrInteractionPerUserFromDB
} = require('../utilities/postgres_utils');

// utility function to construct the initial chat payload
const getInitialPayload = () => [{
    role: "system",
    content: "You are a polite, sophisticated, chatbot assistant that always checks historic conversations before using other resources to find answers."
}];

// utility function for logging
const logResult = (result, id) => 
    result && result.length > 0 && console.log(`\n*******CHATGPT_UTILS.JS: Found a match in the database for chatID: ${id}`);
const logNoMatch = id => console.log("\n*******CHATGPT_UTILS.JS:: No match found in the database for the given chatID", id);

const getAADObjectIdFromDB = async chatID => {
    const isArray = Array.isArray(chatID);
    let result;
    if(isArray){
        for (const id of chatID) {
            result = await fetchAADObjectIdFromDB(id);
            logResult(result, id);
            if(result && result.length > 0) {
                return result;
            }
        }
    } else {
        result = await fetchAADObjectIdFromDB(chatID);
        logResult(result, chatID);
    }

    isArray && console.log("\n*******CHATGPT_UTILS.JS: No match found in the database for any chatIDs in the given array");
    return result || [];
};

const handleDBInteractions = async (aadObjectID, fn) => {
    if(!global_configs.dbRecreationOfGptPayload){
        console.log("\n*******CHATGPT_UTILS.JS: getLast24HrInteractionPerUserFromDB func Skipping DB Recreation of GPT Payload as the global config is set to false.");
        return getInitialPayload();
    } else {
        console.log("\n*******CHATGPT_UTILS.JS: getLast24HrInteractionPerUserFromDB func Continuing with DB Recreation of GPT Payload as the global config is set to true.");
        const result = await fetchLast24HrInteractionPerUserFromDB(aadObjectID);
        return result && result.length > 0 ? fn(result) : [];
    }
};

const getLast24HrInteractionPerUserFromDB = async aadObjectID => 
    handleDBInteractions(aadObjectID, result => {
        const chatPayload = getInitialPayload();
        if(result.length === 0) {
            console.error("\n*******CHATGPT_UTILS.JS: No interactions found in last 24 hours for the user.");
        } else {
            const sortedResult = result.sort((a, b) => b.hourssincelastinteraction - a.hourssincelastinteraction);
            sortedResult.forEach(message => chatPayload.push(
                { role: "user", content: message.user_invoke_message },
                { role: "assistant", content: message.bot_response_message }
            ));
        }
        return chatPayload;
    });

const recreateGptPayloadViaDB = async aadObjectID => 
    handleDBInteractions(aadObjectID, result => {
        if(result.length === 0) {
            console.error("\n*******CHATGPT_UTILS.JS: No interactions found in last 24 hours for the user.");
            return getInitialPayload();
        } else {
            const sortedResult = result.sort((a, b) => b.hourssincelastinteraction - a.hourssincelastinteraction);
            const chatPayload = getInitialPayload();
            const userMessagesArray = [];
            sortedResult.forEach(message => {
                chatPayload.push(
                    { role: "user", content: message.user_invoke_message },
                    { role: "assistant", content: message.bot_response_message }
                );
                userMessagesArray.push(`[~${message.hourssincelastinteraction.toFixed(3)} hours ago: ${message.user_invoke_message}]`);
            });

            const latestUserMessage = sortedResult[sortedResult.length - 1].user_invoke_message;

            chatPayload.push(
                { role: "assistant", content: 'Let\'s check our past conversations in this exact gpt thread, one moment...' },
                { role: "assistant", content: `I could not find a suitable response to your latest message of: ${latestUserMessage}. Can you provide more context?` },
                { role: "user", content: `In the last 24 hours, I have mentioned the following with approximate times: ${userMessagesArray.join(", ")}.` }
            );

            return chatPayload;
        }
    });

module.exports = {
    getAADObjectIdFromDB,
    getLast24HrInteractionPerUserFromDB,
    recreateGptPayloadViaDB
};