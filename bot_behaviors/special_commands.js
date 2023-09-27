const handleDalleCommand = require('./dalle_utils');

async function createDalleImages(context) {
    //test to show the values
console.log("OPENAI_DALLE_API_KEY:", process.env.OPENAI_DALLE_API_KEY);
console.log("OPENAI_DALLE_BASE_URL:", process.env.OPENAI_DALLE_BASE_URL);
console.log("OPENAI_DALLE_VERSION:", process.env.OPENAI_DALLE_VERSION);
	const messageText = context.activity.text.replace('$dalle', '');
	await handleDalleCommand(context.activity.conversation.id, context.timestamp, messageText.trim());
	return await context.sendActivity(`Images are on their way, might take some time.`);
}

async function addToppings(context) {
    return sendMessageResponse(context, 'Ketchup!');
}

async function contactHelp(context) {
    return sendMessageResponse(context, 'Please contact the Help Desk.');
}
//t
async function sendMessageResponse(context, message) {
    const replyActivity = MessageFactory.text(message);
    
    if (context.activity.channelId === 'slack') {
        const thread_ts = context.activity.channelData?.SlackMessage?.event?.thread_ts || context.activity.channelData?.SlackMessage?.event?.ts;
        try {
            replyActivity.conversation = context.activity.conversation;
            if (!replyActivity.conversation.id.includes(thread_ts)) {
                replyActivity.conversation.id += ':' + thread_ts;
            }
        } catch (error) {
            console.error('Error occurred while trying to reply in the thread:', error);
        }
    }
    await context.sendActivity(replyActivity);
}

const commands = {
	'$hamburger': addToppings,
	'$help': contactHelp,
	'$dalle': createDalleImages, 
};
module.exports = commands;