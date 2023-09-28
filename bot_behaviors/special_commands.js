const { MessageFactory } = require('botbuilder');
const { generateImages, processImagesGeneration } = require('./dalle_utils');

const commands = new Proxy({
    '$hamburger': addToppings,
    '$help': contactHelp,
    '$dalle': createDalleImages,
}, {
    get: function(target, property) {
        if (property in target) {
            return target[property];
        }
        for (let key in target) {
            if (property.startsWith(key)) {
                return target[key];
            }
        }
    }
});

async function sendMessage(context, message) {
    try {
        const reply = MessageFactory.text(message);
        reply.conversation = context.activity.conversation;
        const thread_ts = context.activity.channelData?.SlackMessage?.event?.thread_ts || 
                          context.activity.channelData?.SlackMessage?.event?.ts;
        reply.conversation.id = thread_ts ? reply.conversation.id + ':' + thread_ts : reply.conversation.id;
        await context.sendActivity(reply);
    } catch (error) {
        console.error('Error occurred while trying to reply in the thread:', error);
    }
}

async function addToppings(context) {
    await sendMessage(context, 'Ketchup!');
}

async function contactHelp(context) {
    await sendMessage(context, 'Please contact the Help Desk.');
}

async function createDalleImages(context) {
    const raw = context.activity.text.replace('$dalle', '').trim();
    const [text, count] = raw.split(" --");
    const prompt = text || "a nice photo of a dog";
    let numImages = parseInt(count) || 1;
    numImages = numImages > 10 ? 10 : numImages;

    await sendMessage(context, `You asked for "${prompt}". Generating ${numImages} image(s)...`);
    await context.sendActivity({ type: 'typing' });

    const { images, generationTime } = await processImagesGeneration(prompt, numImages);

    await sendMessage(context, `We generated ${numImages} image(s) for you in ${seconds} seconds.`);
}

module.exports = commands;