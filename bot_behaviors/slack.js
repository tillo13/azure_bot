const { MessageFactory } = require('botbuilder');
const { fetchConversationHistory, postMessageToSlack } = require('./slack_utils');

const activeThreads = {};

const processSlackResponseMessage = (assistantResponse, pathConfig) =>
    `${pathConfig.messagePrefix}: ${assistantResponse}`;

const isFromSlack = context => context.activity.channelId === 'slack';

const formatChatRecord = messages =>
    messages.reduce((chatRecord, { ts, text }, idx) => 
        `${chatRecord}\n${idx + 1}. [${ts}] ${text}\n`,
        '\n****SLACK.JS: letMeCheckFlag invoked!\nUSER MESSAGES IN THIS THREAD**\n'
    ) + '\n***END OF USER MESSAGES***';

const cleanChatRecord = chatRecord => 
    chatRecord.replace(/\*/g, '')
        .replace(/SLACK.JS: letMeCheckFlag invoked!/i, '')
        .replace(/USER MESSAGES IN THIS THREAD/i, '')
        .replace(/END OF USER MESSAGES/i, '')
        .replace(/\n/g, ' ')
        .trim();

const handleActiveThread = async (context, response, threadId) => {
    if (activeThreads[threadId] && context.activity.text) {
        await respondToSlackThread(context, response, threadId);
    }
};

const respondToSlackThread = async (context, slackMessageResponse, threadId) => {
    const replyActivity = MessageFactory.text(slackMessageResponse);

    try {
        replyActivity.conversation = context.activity.conversation;

        if (!replyActivity.conversation.id.includes(threadId)) {
            replyActivity.conversation.id += ':' + threadId;
        }

        await context.sendActivity(replyActivity);
    } catch (error) {
        console.error('\n****SLACK.JS: An error occurred while trying to reply in the thread:', error);
    }
};

const postChatHistoryToSlack = async (channelId, threadId, apiToken) => {
    const conversationHistory = await fetchConversationHistory(channelId, threadId, apiToken);
    const messages = conversationHistory.messages.filter(msg => !msg.hasOwnProperty('bot_id'));

    let chatRecord = formatChatRecord(messages);
    const cleanedChatRecord = cleanChatRecord(chatRecord);

    await postMessageToSlack(channelId, threadId, chatRecord, apiToken);

    return cleanedChatRecord;
};

const handleSlackMessage = async (context, assistantResponse, letMeCheckFlag, pathConfig) => {
    const slackMessageResponse = processSlackResponseMessage(assistantResponse, pathConfig);
    const apiToken = context.activity.channelData?.ApiToken;
    const threadId = context.activity.channelData?.SlackMessage?.event?.thread_ts || context.activity.channelData?.SlackMessage?.event?.ts;
    const channelId = context.activity.channelData.SlackMessage.event.channel;

    if (context.activity.text.includes('@bot') || context.activity.text.includes('@atbot')) {
        activeThreads[threadId] = true;
    }

    if (!activeThreads[threadId] && !context.activity.conversation.isGroup) {
        console.log('\n****SLACK.JS: SLACK_PAYLOAD_WITHOUT_CALLING_BOT -- IGNORING! User said: ', context.activity.text);
        return;
    }

    let cleanedFormattedMessages = letMeCheckFlag && apiToken 
        ? await postChatHistoryToSlack(channelId, threadId, apiToken) 
        : null;

    const isActiveThread = Boolean(activeThreads[threadId]);

    await handleActiveThread(context, slackMessageResponse, threadId);

    return {
        cleanedFormattedMessages: cleanedFormattedMessages,
        isActiveThread: isActiveThread
    };
};

module.exports = { handleSlackMessage, isFromSlack };