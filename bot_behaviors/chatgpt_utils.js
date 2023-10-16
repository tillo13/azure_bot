const {
    fetchAADObjectIdFromDB,
    fetchLast24HrInteractionPerUserFromDB
} = require('../utilities/postgres_utils');

async function getAADObjectIdFromDB(chatID) {
    const result = await fetchAADObjectIdFromDB(chatID);
    return result;
}

async function getLast24HrInteractionPerUserFromDB(aadObjectID) {
    const result = await fetchLast24HrInteractionPerUserFromDB(aadObjectID);
    return result;
}

module.exports = {
    getAADObjectIdFromDB,
    getLast24HrInteractionPerUserFromDB
};