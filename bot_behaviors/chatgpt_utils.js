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
        result = await formatAndLogResults(await fetchLast24HrInteractionPerUserFromDB(aadObjectID));
    }
    return result;
}

async function formatAndLogResults(result) {
    if (result.length === 0) {
        console.error("\n*******CHATGPT_UTILS.JS: No interactions found in last 24 hours for the user.");
        return [];
    }
    const sortedResult = result.sort((a, b) => b.hourssincelastinteraction - a.hourssincelastinteraction);
    const chatPayload = getInitialSystemMessage();
    const userMessagesArray = getUserMessagesArray(sortedResult, chatPayload);
    logUserMessages(userMessagesArray);
    logMostAndLeastRecentUserMessages(sortedResult);
    console.log('\n\n***CHATGPT_UTILS.JS -> last24 Last 24 Hr Interaction Data:', chatPayload);
    return chatPayload;
}

function getInitialSystemMessage() {
    return [
        {
            role: "system",
            content: "You are a polite, sophisticated, chatbot assistant that always checks historic conversations before using other resources to find answers."
        },
    ];
}

function getUserMessagesArray(sortedResult, chatPayload) {
    const userMessagesArray = [];
    sortedResult.forEach(message => {
        chatPayload.push(
            { role: "user", content: message.user_invoke_message },
            { role: "assistant", content: message.bot_response_message },
        );
        userMessagesArray.push(`[~${parseFloat(message.hourssincelastinteraction).toFixed(3)} hours ago: ${message.user_invoke_message}]`);
    });
    return userMessagesArray;
}

function logUserMessages(userMessagesArray) {
    const userMessagesinLast24hrswithapproximateTimessortedChronologically = userMessagesArray.join(', ');
    const formattedUserMessages = "In the last 24 hours, I have said the following with the approximate times they were mentioned: " + userMessagesinLast24hrswithapproximateTimessortedChronologically;
    console.log("\n*******CHATGPT_UTILS.JS: last24 Messages along with their approximate times: ", formattedUserMessages);
}

function logMostAndLeastRecentUserMessages(sortedResult) {
    if (sortedResult.length > 0) {
        console.log("\n*******CHATGPT_UTILS.JS: last24 The most recent user message in the last 24 hours: ", sortedResult[sortedResult.length - 1].user_invoke_message);
        console.log("\n*******CHATGPT_UTILS.JS: last24 The most recent user message was received", sortedResult[sortedResult.length - 1].hourssincelastinteraction, "hours ago.");
        console.log("\n*******CHATGPT_UTILS.JS: last24 The oldest user message in the last 24 hours: ", sortedResult[0].user_invoke_message);
        console.log("\n*******CHATGPT_UTILS.JS: last24 The oldest user message was received", sortedResult[0].hourssincelastinteraction, "hours ago.");
    } 
    else {
        console.error("\n*******CHATGPT_UTILS.JS: last 24 No messages found in the last 24 hours.");
    }
}

const getLastUserInteraction = async(aadObjectID) => {
    const result = await fetchLast24HrInteractionPerUserFromDB(aadObjectID);
    return formatAndLogResults(result);
}


async function recreateGptPayloadViaDB(aadObjectID) {
    let result = [];
    if (!global_configs.dbRecreationOfGptPayload) {
        console.log("\n*******CHATGPT_UTILS.JS: recreateGptPayloadViaDB func Skipping DB Recreation of GPT Payload as the global config is set to false.");
        result = await getLastUserInteraction(aadObjectID);
    } else {
        console.log("\n*******CHATGPT_UTILS.JS: recreateGptPayloadViaDB func Continuing with DB Recreation of GPT Payload as the global config is set to true.");
        const interactions = await fetchLast24HrInteractionPerUserFromDB(aadObjectID);
        result = await transformPayload(interactions);
    }
    return result;
}

async function transformPayload(interactions) {
    if (interactions.length === 0) {
        console.error("\n*******CHATGPT_UTILS.JS: recreateGptPayloadViaDB No interactions found in last 24 hours for the user.");
        return [];
    }
    const sortedInteractions = interactions.sort((a, b) => b.hourssincelastinteraction - a.hourssincelastinteraction);
    const chatPayload = getRecreatedChatPayload(sortedInteractions);
    console.log('\n*******CHATGPT_UTILS.JS -> recreateGptPayloadViaDB updated payload: ', chatPayload);
    return chatPayload;
}

function getRecreatedChatPayload(sortedInteractions) {
    const chatPayload = getInitialSystemMessage();
    const userMessagesArray = [];
    sortedInteractions.forEach(interaction => {
        chatPayload.push(
            { role: "user", content: interaction.user_invoke_message },
            { role: "assistant", content: interaction.bot_response_message }
        );
        userMessagesArray.push(`[~${parseFloat(interaction.hourssincelastinteraction).toFixed(3)} hours ago: ${interaction.user_invoke_message}]`);
    });

    const latestUserMessage = sortedInteractions[sortedInteractions.length - 1].user_invoke_message;

    chatPayload.push(
        { role: "assistant", content: 'Let\'s check our past conversations in this exact gpt thread, one moment...' },
        { role: "assistant", content: `I could not find a suitable response to your latest message of: ${latestUserMessage}. Please respond with your conversation history up to this point and I will investigate.` },
        { role: "user", content: `Certainly, here's what I've said so far along with the timestamps. In the last 24 hours, I have mentioned the following with approximate times: ${userMessagesArray.join(", ")}.` }
    );

    return chatPayload;
}

module.exports = {
    getAADObjectIdFromDB,
    getLast24HrInteractionPerUserFromDB,
    recreateGptPayloadViaDB
};