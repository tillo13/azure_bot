const { MessageFactory } = require('botbuilder');
const { fetchConversationHistory, getBotId, executeHttpPostRequest, postMessageToSlack } = require('./slack_utils');

const activeThreads = {};

function processSlackResponseMessage(assistantResponse, pathPrefix) {
    return `${pathPrefix}: ${assistantResponse}`;
}

function isFromSlack(context) {
    return context.activity.channelId === 'slack';
}

async function postChatHistoryToSlack(slack_channel_id, thread_ts, apiToken) {
    const conversationHistory = await fetchConversationHistory(slack_channel_id, thread_ts, apiToken);
    const messages = conversationHistory.messages.filter(msg => !msg.hasOwnProperty('bot_id'));
    
    let chatRecord = formatChatRecord(messages);
    console.log(chatRecord);
    
    const cleanedChatRecord = cleanChatRecord(chatRecord);
    console.log('****SLACK.JS: cleaned payload ready for Openai: ', cleanedChatRecord);
  
    await postMessageToSlack(slack_channel_id, thread_ts, chatRecord, apiToken);
    return cleanedChatRecord;
}

function formatChatRecord(messages) {
    return messages.reduce((chatRecord, msg, idx) => {
        return chatRecord + `\n${idx + 1}. [${msg.ts}] ${msg.text}\n`;
    }, '\n****SLACK.JS: letMeCheckFlag invoked!\nUSER MESSAGES IN THIS THREAD**\n') + '\n***END OF USER MESSAGES***';
}

function cleanChatRecord(chatRecord) {
    return chatRecord.replace(/\*/g, '')
        .replace(/SLACK.JS: letMeCheckFlag invoked!/i, '')
        .replace(/USER MESSAGES IN THIS THREAD/i, '')
        .replace(/END OF USER MESSAGES/i, '')
        .replace(/\n/g, ' ')
        .trim();
}
async function handleSlackMessage(context, assistantResponse, letMeCheckFlag) {
    let pathConfig = PATH_CONFIGS[context.activity.channelId];
    let slackMessageResponse = processSlackResponseMessage(assistantResponse, pathConfig.messagePrefix);
    
    const apiToken = context.activity.channelData?.ApiToken;
    const thread_ts = context.activity.channelData?.SlackMessage?.event?.thread_ts || context.activity.channelData?.SlackMessage?.event?.ts;

    const slack_channel_id = context.activity.channelData.SlackMessage.event.channel;
    
    if (context.activity.text.includes('@bot') || context.activity.text.includes('@atbot')) {
        activeThreads[thread_ts] = true;
    }
    
    if (!activeThreads[thread_ts] && !context.activity.conversation.isGroup) {
        console.log('****SLACK.JS: SLACK_PAYLOAD_WITHOUT_CALLING_BOT -- IGNORING! User said: ', context.activity.text);
        return;
    }
  
    let cleanedFormattedMessages = letMeCheckFlag && apiToken ? await postChatHistoryToSlack(slack_channel_id, thread_ts, apiToken) : null;

    const isActiveThread = Boolean(activeThreads[thread_ts]);
    
    console.log('\n*&*&*& SLACK.JS bug check --> Cleaned formatted messages after postChatHistoryToSlack', cleanedFormattedMessages);
    if (isActiveThread && context.activity.text) {
        console.log('****SLACK.JS: Latest user posted message:', context.activity.text);
        await respondToSlackThread(context, slackMessageResponse, thread_ts);
    }
  
    console.log('****SLACK.JS: clean format regardless ', cleanedFormattedMessages);
    return {
        cleanedFormattedMessages: cleanedFormattedMessages,
        isActiveThread: isActiveThread
    };


    async function respondToSlackThread(context, slackMessageResponse, thread_ts) {
        const replyActivity = MessageFactory.text(slackMessageResponse);
    
        try {
            replyActivity.conversation = context.activity.conversation;
    
            if (!replyActivity.conversation.id.includes(thread_ts)) {
                replyActivity.conversation.id += ':' + thread_ts;
            }
    
            await context.sendActivity(replyActivity);
        } catch (error) {
            console.error('****SLACK.JS: An error occurred while trying to reply in the thread:', error);
        }
    }
}

module.exports = { handleSlackMessage, isFromSlack };