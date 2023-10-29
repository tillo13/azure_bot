const global_configs = require('../utilities/global_configs.js');
const {
    fetchAADObjectIdFromDB,
    fetchLast24HrInteractionPerUserFromDB
} = require('../utilities/postgres_utils');

async function getAADObjectIdFromDB(chatID) {
    return Array.isArray(chatID) ? await handleMultipleChatIDs(chatID) : await handleSingleChatID(chatID);
}

async function handleMultipleChatIDs(chatIDs) {
    console.log("\n*******CHATGPT_UTILS.JS: Detected an array of chatIDs");
    for (const id of chatIDs) {
        const result = await handleSingleChatID(id);
        if (result.length > 0) return result;
    }
    console.log("\n*******CHATGPT_UTILS.JS: No match found in the database for any chatIDs in the given array");
    return [];
}

async function handleSingleChatID(chatID) {
    console.log("\n*******CHATGPT_UTILS.JS: Detected a single chatID");
    const result = await fetchAADObjectIdFromDB(chatID);
    logResults(result, chatID);
    return result;
}

function logResults(result, chatID) {
    result.length > 0 ? console.log(`\n*******CHATGPT_UTILS.JS: Found a match in the database for chatID: ${chatID}`) : console.log("\n*******CHATGPT_UTILS.JS: No match found in the database for the given chatID");
}

async function getLast24HrInteractionPerUserFromDB(aadObjectID) {
    let result = [];
    if (!global_configs.dbRecreationOfGptPayload) {
        console.log("\n*******CHATGPT_UTILS.JS: getLast24HrInteractionPerUserFromDB func Skipping DB Recreation of GPT Payload as the global config is set to false.");
        result = await getLastUserInteraction(aadObjectID);
    } else {
        console.log("\n*******CHATGPT_UTILS.JS: getLast24HrInteractionPerUserFromDB func Continuing with DB Recreation of GPT Payload as the global config is set to true.");
        result = await formatResults(await fetchLast24HrInteractionPerUserFromDB(aadObjectID));
    }
    return result;
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

const getLastUserInteraction = async(aadObjectID) => {
    const result = await fetchLast24HrInteractionPerUserFromDB(aadObjectID);
    return formatResults(result);
}


async function recreateGptPayloadViaDB(aadObjectID) {
    let result = [];
    if (!global_configs.dbRecreationOfGptPayload) {
        console.log("\n*******CHATGPT_UTILS.JS: recreateGptPayloadViaDB func Skipping DB Recreation of GPT Payload as the global config is set to false.");
        result = await getLastUserInteraction(aadObjectID);
    } else {
        console.log("\n*******CHATGPT_UTILS.JS: recreateGptPayloadViaDB func Continuing with DB Recreation of GPT Payload as the global config is set to true.");
        result = await formatResults(await fetchLast24HrInteractionPerUserFromDB(aadObjectID));
    }
    return result;
}

module.exports = {
    getAADObjectIdFromDB,
    getLast24HrInteractionPerUserFromDB,
    recreateGptPayloadViaDB
};