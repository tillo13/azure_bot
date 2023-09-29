const { MessageFactory } = require('botbuilder');
const {
    handleSlackMessage,
    isFromSlack
} = require('./slack');
const {
    handleTeamsMessage,
    isFromMSTeams
} = require('./msteams');
const chatCompletion = require('./chat_helper');

async function handleMessageFromMSTeams(context, chatMessagesUser, isFirstInteraction) {
    if (isFromMSTeams(context)) {
        const assistantResponse = await handleTeamsMessage(context, chatMessagesUser, isFirstInteraction);
        await context.sendActivity(MessageFactory.text(assistantResponse));
        return true;
    }

    return false;
}

async function handleMessageFromSlack(context, chatMessagesUser, botCalled, botInThread, savedThread_ts, current_thread_ts, PERSONALITY_OF_BOT) {
    if (isFromSlack(context) && (botCalled || (botInThread && savedThread_ts === current_thread_ts))) {
        let chatResponse = await chatCompletion(chatMessagesUser, PERSONALITY_OF_BOT, context.activity.channelId);

        if (chatResponse.requery && chatResponse.isActiveThread) {
            const chatResponses = await chatCompletion(chatMessagesUser, PERSONALITY_OF_BOT, context.activity.channelId, result.isActiveThread);
            chatMessagesUser.push({
                role: "assistant",
                content: chatResponses.assistantResponse
            });
        }

        chatMessagesUser.push({
            role: "assistant",
            content: chatResponse.assistantResponse
        });

        const result = await handleSlackMessage(context, chatResponse.assistantResponse, chatResponse.letMeCheckFlag, chatCompletion);
        return true;
    }

    return false;
}

async function handleDefault(context, chatMessagesUser, PERSONALITY_OF_BOT) {
    // Code for handling default interaction
    const chatResponse = await chatCompletion(chatMessagesUser, PERSONALITY_OF_BOT, context.activity.channelId);
    console.log(`\n\n***BOT_ROUTER.JS: assistant responded with: ${chatResponse.assistantResponse}`);

    await context.sendActivity(MessageFactory.text(`default_router: ${chatResponse.assistantResponse}`));
}

module.exports = {
    handleMessageFromMSTeams,
    handleMessageFromSlack,
    handleDefault
};