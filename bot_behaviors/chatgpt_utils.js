async function getMSTeamsConversationHistoryFunction(chatID) {
    const result = await getMSTeamsConversationHistoryFromDB(chatID);
    return result;
}

async function getUserInteractionDataFunction(aadObjectID) {
    const result = await getUserInteractionDataFromDB(aadObjectID);
    return result;
}

module.exports = {
    getMSTeamsConversationHistoryFunction,
    getUserInteractionDataFunction
};