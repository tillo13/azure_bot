const OPENAI_DALLE_BASE_URL = process.env.OPENAI_DALLE_BASE_URL;
const OPENAI_DALLE_VERSION = process.env.OPENAI_DALLE_VERSION;

const handleDalleCommand = require('./dalle_utils');

async function createDalleImages(context) {
    //are the params coming over?
    console.log("\n\n*special_commands.js:OPENAI_DALLE_BASE_URL:", OPENAI_DALLE_BASE_URL);
    console.log("\n\n*special_commands.js:OPENAI_DALLE_VERSION:", OPENAI_DALLE_VERSION);

    const messageText = context.activity.text.replace('$dalle', '').trim(); // Trimmed to remove leading/trailing white space
    let splitMessage = messageText.split(" --");
    const prompt = splitMessage[0]; // This is the content after '$dalle ' and before ' --'
    const numImages = splitMessage[1] ? parseInt(splitMessage[1]) : 1; // This is the content after ' --' in the incoming message
    await handleDalleCommand(context.activity.conversation.id, context.timestamp, prompt, numImages);
    const completionMessage = numImages > 1 ? `Images are on their way, might take some time.` : `Image is on its way, might take some time.`;
    return await context.sendActivity(completionMessage);
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