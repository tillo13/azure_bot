const global_configs = require('../utilities/global_configs.js');
const { fetchAADObjectIdFromDB, fetchLast24HrInteractionPerUserFromDB } = require('../utilities/postgres_utils');

const processChatIDInteraction = async (chatID) => {
    let fetchedData;
    const isArray = Array.isArray(chatID);
    const dataFunc = isArray ? console.log('arrayWorks') && fetchAADObjectIdFromDB : console.log('singleWorks') && fetchAADObjectIdFromDB;

    if(isArray) {
        for(const id of chatID) {
            console.log(`*******CHATGPT_UTILS.JS: Processing a chatID: ${id}`);
            fetchedData =  await handleSingleChatID(id, dataFunc);
            if(fetchedData?.length > 0) return fetchedData;
        };
    } else {
        fetchedData = await handleSingleChatID(chatID, dataFunc);
    }

    console.log(`*******CHATGPT_UTILS.JS: No match found in the database for ${isArray ? 'any chatIDs in the given array' : 'the given chatID'}`);
    return fetchedData;
}


const handleSingleChatID = async (chatID, fetchFunc) => {
    const data = await fetchFunc(chatID);

    if(data?.length > 0) {
        console.log(`*******CHATGPT_UTILS.JS: Found a match in the database for chatID: ${chatID}`);
    }
    return data;
}

const getLast24HrInteractionPerUserFromDB = async (aadObjectID) => {
    const result =  await fetchLast24HrInteractionPerUserFromDB(aadObjectID);
    return handleResults(aadObjectID, result, global_configs.dbRecreationOfGptPayload);
}

const handleResults = (aadObjectID, result, useGlobalConfig) => {
    let chatPayload = [];

    if(!useGlobalConfig) {
        console.log("*******CHATGPT_UTILS.JS: getLast24HrInteractionPerUserFromDB func Skipping DB Recreation of GPT Payload as the global config is set to false.");
        chatPayload = getLastUserInteraction(result);
    } else { 
        console.log("*******CHATGPT_UTILS.JS: getLast24HrInteractionPerUserFromDB func Continuing with DB Recreation of GPT Payload as the global config is set to true.");
        if (result.length > 0) {
            chatPayload = formatResults(result);
        }
    }
    console.error("*******CHATGPT_UTILS.JS: No interactions found in last 24 hours for the user.");
    return chatPayload;
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
    if (result.length > 0){
        const lastInteraction = result[result.length - 1];
        const chatPayload = [
            {
                role: "system",
                content: "You are a polite, sophisticated, chatbot assistant that always checks historic conversations before using other resources to find answers."
            },
            {
                role: "user",
                content: lastInteraction.user_invoke_message,
            },
            {
                role: "assistant",
                content: lastInteraction.bot_response_message,
            }
        ];
        return chatPayload;
    } 
    console.error("*******CHATGPT_UTILS.JS: getLastUserInteraction No interactions found for the user.");
    return [];
}

const recreateGptPayloadViaDB = async (aadObjectID) => {
    const result = await fetchLast24HrInteractionPerUserFromDB(aadObjectID);
    return handleResults(aadObjectID, result, true);
}

module.exports = {
    getAADObjectIdFromDB,
    getLast24HrInteractionPerUserFromDB,
    recreateGptPayloadViaDB
};  