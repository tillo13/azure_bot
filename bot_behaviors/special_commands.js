const { MessageFactory } = require('botbuilder');

async function ketchup(context) {
    return sendMessageInThread(context, 'Ketchup!');
}

async function contactHelp(context) {
    return sendMessageInThread(context, 'Please contact the Help Desk.');
}

async function sendMessageInThread(context, message) {
    const thread_ts = context.activity.channelData?.SlackMessage?.event?.thread_ts || context.activity.channelData?.SlackMessage?.event?.ts;
    const replyActivity = MessageFactory.text(message);
    try {
        replyActivity.conversation = context.activity.conversation;
        if (!replyActivity.conversation.id.includes(thread_ts)) {
            replyActivity.conversation.id += ':' + thread_ts;
        }
        await context.sendActivity(replyActivity);
    } catch (error) {
        console.error('Error occurred while trying to reply in the thread:', error);
    }
}

const commands = {
    '$hamburger': ketchup,
    '$help': contactHelp
    // Add new commands here as wel go...
};

module.exports = commands;