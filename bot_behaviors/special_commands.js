const { MessageFactory } = require('botbuilder');
const generateImages = require('./dalle_utils');

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

async function createDalleImages(context) {
    const messageText = context.activity.text.replace('$dalle', '').trim();
    let splitMessage = messageText.split(" --");
    const prompt = splitMessage[0] || "a nice photo of a dog";
    let numImages = splitMessage[1] ? parseInt(splitMessage[1]) : 1;
    const imageUrls = await generateImages(prompt, numImages);
    
    for(let imageUrl of imageUrls){
        const replyActivity = MessageFactory.attachment({
            contentType: 'image/png',
            contentUrl: imageUrl,
        });
        await context.sendActivity(replyActivity);
    }
}

const commands = new Proxy({
    '$hamburger': addToppings,
    '$help': contactHelp,
    '$dalle': createDalleImages,
}, {
    get: function(target, property) {
        if (property in target) {
            return target[property];
        } else {
            for (let key in target) {
                if (property.startsWith(key)) {
                    return target[key];
                }
            }
        }
    }
});

module.exports = commands;