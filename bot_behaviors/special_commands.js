const { MessageFactory } = require('botbuilder');
const generateImages = require('./dalle_utils');

async function createDalleImages(context) {
    const messageText = context.activity.text.replace('$dalle', '').trim();
    let splitMessage = messageText.split(" --");
    const prompt = splitMessage[0] || "a nice photo of a dog";
    const numImages = splitMessage[1] ? parseInt(splitMessage[1]) : 1;

    const completionMessage = numImages > 1 ? `Images are on their way, might take some time.` : `Image is on its way, might take some time.`;
    await context.sendActivity(completionMessage);
    await generateImages(prompt, numImages, async (imageUrl) => {
        const replyActivity = MessageFactory.attachment({
            contentType: 'image/png',
            contentUrl: imageUrl,
        });
        await context.sendActivity(replyActivity);
    });
}

async function addToppings(context) {
    return sendMessageResponse(context, 'Ketchup!');
}

async function contactHelp(context) {
    return sendMessageResponse(context, 'Please contact the Help Desk.');
}

async function sendMessageResponse(context, message) {
    const replyActivity = MessageFactory.text(message);
    
    try {
        replyActivity.conversation = context.activity.conversation;
        const thread_ts = context.activity.channelData?.SlackMessage?.event?.thread_ts || 
                          context.activity.channelData?.SlackMessage?.event?.ts;
        if (!replyActivity.conversation.id.includes(thread_ts)) {
            replyActivity.conversation.id += ':' + thread_ts;
        }
    } catch (error) {
        console.error('Error occurred while trying to reply in the thread:', error);
    }

    return await context.sendActivity(replyActivity);
}

const commands = {
    '$hamburger': addToppings,
    '$help': contactHelp,
    '$dalle': createDalleImages,
};

module.exports = commands;