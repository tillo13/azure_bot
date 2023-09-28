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
    let startTime = new Date().getTime();

    if (!messageText) {
        await context.sendActivity(`You did not ask for any image in particular, so get the default of a dog! Please wait a moment...`);
    }

    let splitMessage = messageText.split(" --");
    let prompt = splitMessage[0] || "a nice photo of a dog";
    let numImages = splitMessage[1] ? parseInt(splitMessage[1]) : 1;
    
    // Create filename-friendly version of the prompt
    let filenameBase = prompt.replace(/[^a-z0-9_]/gi, '').replace(/\s/g, '_').substring(0, 10);

    if (numImages >10) {
        await context.sendActivity(`You've asked for more than 10 images. We are going to generate the maximum allowed of 10. Please wait...`);
        numImages = 10;
    }

    const completionMessage = `You asked for "${prompt}". We are generating ${numImages} image(s) for you. Each image takes a few seconds to generate. Please wait...`;
    await context.sendActivity(completionMessage);
    await context.sendActivity({ type: 'typing' });

    for(let i=0; i<numImages; i++){
        let filename = `${filenameBase}_${(i+1).toString().padStart(2, '0')}.png`;
        await context.sendActivity(`Creating ${filename}...`);
        await generateImages(prompt, 1, async (imageUrl) => {
            const replyActivity = MessageFactory.attachment({
                contentType: 'image/png',
                contentUrl: imageUrl,
            });
            await context.sendActivity(replyActivity);
        });
    }

    let endTime = new Date().getTime();
    let difference = endTime - startTime;
    let seconds = (difference / 1000).toFixed(3);
    await context.sendActivity(`We generated ${numImages} image(s) for you that took a total of ${seconds} seconds. Thank you.`);
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