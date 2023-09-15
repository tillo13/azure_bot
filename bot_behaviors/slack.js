const { MessageFactory } = require('botbuilder');
const chatCompletion = require('./chat_helper');

// check if the message is indeed from slack
function isFromSlack(context) {
  return context.activity.channelId === 'slack';
}

module.exports.isFromSlack = isFromSlack;

// Function for processing the assistant response message specific to Slack
function processSlackResponseMessage(assistantResponse) {
    return `slack_chat_path: ${assistantResponse}`;
}

async function handleSlackMessage(context, assistantResponse) {
    // check if the channelId in context is Slack
    if (context.activity.channelId === 'slack') {
        // process the assistant response message for Slack
        let slackMessageResponse = processSlackResponseMessage(assistantResponse);
        const replyActivity = MessageFactory.text(slackMessageResponse);

        // try sending the message as a thread reply
        try {
            replyActivity.conversation = context.activity.conversation;
            replyActivity.conversation.id += ":" + context.activity.channelData.SlackMessage.event.ts;
        } catch (error) {
            console.error("An error occurred while trying to reply in thread", error);
        }

        await context.sendActivity(replyActivity);
    } else {
        // for other channelIds, send the message as it was received
        const replyActivity = MessageFactory.text(`default_router: ${assistantResponse}`);
        await context.sendActivity(replyActivity);
    }
};

module.exports = handleSlackMessage;