const global_configs = require('../utilities/global_configs.js');
const {
    fetchAADObjectIdFromDB,
    fetchLast24HrInteractionPerUserFromDB
} = require('../utilities/postgres_utils');

async function getAADObjectIdFromDB(chatID) {
    return Array.isArray(chatID) ? await handleMultipleChatIDs(chatID) : await handleSingleChatID(chatID);
}

async function handleMultipleChatIDs(chatIDs) {
    console.log("\n*******CHATGPT_UTILS.JS: Found an array of chatIDs");
    for (const id of chatIDs) {
        const result = await handleSingleChatID(id);
        if (result.length > 0) return result;
    }
    console.log("\n*******CHATGPT_UTILS.JS: No match found in the database for any chatIDs in the given array");
    return [];
}

async function handleSingleChatID(chatID) {
    console.log("\n*******CHATGPT_UTILS.JS: Checking for a single chatID");
    const result = await fetchAADObjectIdFromDB(chatID);
    result.length > 0 ? console.log(`\n*******CHATGPT_UTILS.JS: Found a match in the database for chatID: ${chatID}`) : console.log("\n*******CHATGPT_UTILS.JS: No match found in the database for the given chatID");
    return result;
}


async function getLast24HrInteractionPerUserFromDB(aadObjectID) {
    console.log("\n*******CHATGPT_UTILS.JS: getLast24HrInteractionPerUserFromDB func is running");

    const result = await fetchLast24HrInteractionPerUserFromDB(aadObjectID);
    if (result.length === 0) {
        console.error("\n*******CHATGPT_UTILS.JS: No interactions found in last 24 hours for the user.");
        return [];
    }

    return global_configs.dbRecreationOfGptPayload ? formatResults(result) : getLastUserInteraction(result);
}

const formatResults = (result) => {
    const sortedResult = result.sort((a, b) => b.hourssincelastinteraction - a.hourssincelastinteraction);
    const chatPayload = [
        {
            role: "system",
            content: "You are a polite, sophisticated, chatbot assistant that always checks historic conversations before using other resources to find answers."
        },
    ];

    sortedResult.forEach(message => {
        chatPayload.push(
            { role: "user", content: message.user_invoke_message },
            { role: "assistant", content: message.bot_response_message },
        );
    });
    return chatPayload;
}

const getLastUserInteraction = (result) => {
    const lastInteraction = result[result.length - 1];
    return [
        { role: "system", content: "You are a polite, sophisticated, chatbot assistant that always checks historic conversations before using other resources to find answers." },
        { role: "user", content: lastInteraction.user_invoke_message },
        { role: "assistant", content: lastInteraction.bot_response_message },

    ];
}

async function recreateGptPayloadViaDB(aadObjectID) {
    console.log("\n*******CHATGPT_UTILS.JS: recreateGptPayloadViaDB func is running");

    const result = await fetchLast24HrInteractionPerUserFromDB(aadObjectID);
    if (result.length === 0) {
        console.error("\n*******CHATGPT_UTILS.JS: No interactions found for the user in last 24 hours.");
        return [];
    }

    return formatResults(result);
}

module.exports = {
    getAADObjectIdFromDB,
    getLast24HrInteractionPerUserFromDB,
    recreateGptPayloadViaDB
};