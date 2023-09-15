const { MessageFactory } = require('botbuilder');
const chatCompletion = require('./chat_helper');

async function handleSlackMessage(context, slackChatMessagesProperty, slackChatThreadHistory, slackChatResponse, thread_ts) {
    let slackChatMessagesUser = await slackChatMessagesProperty.get(context, []);
    let slackThreadId = context.activity.conversation.id + (context.activity.replyToId ? ':' + context.activity.replyToId : '');
    let slackThreadHistory = await slackChatThreadHistory.get(context, {id: slackThreadId, messages: []});

    slackChatMessagesUser.push({role:"user", content:context.activity.text});
    slackThreadHistory.messages.push({role:"user", content:context.activity.text});

    const slackReplyActivity = MessageFactory.text(`slack_chat_path: ${slackChatResponse.assistantResponse}`);
    slackReplyActivity.conversation = context.activity.conversation;

    if (thread_ts) { // If thread_ts exists, add it to the conversation ID
        slackReplyActivity.conversation.id += ':' + thread_ts;
    }

    await context.sendActivity(slackReplyActivity);

    slackChatMessagesUser.push({role:"assistant", content: slackChatResponse.assistantResponse});
    slackThreadHistory.messages.push({role:"assistant", content: slackChatResponse.assistantResponse});
    await slackChatMessagesProperty.set(context, slackChatMessagesUser);
    await slackChatThreadHistory.set(context, slackThreadHistory);
};

module.exports = handleSlackMessage;