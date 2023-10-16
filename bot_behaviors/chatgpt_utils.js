const {
    getMSTeamsConversationHistoryFromDB
} = require('../utilities/postgres_utils');

async function getMSTeamsConversationHistoryFunction() {
    const result = await getMSTeamsConversationHistoryFromDB();
    return result;
}

module.exports = {
    getMSTeamsConversationHistoryFunction
};