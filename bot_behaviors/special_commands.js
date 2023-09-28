const { MessageFactory } = require('botbuilder');
const generateImages = require('./dalle_utils');

const commands = {
    '$hamburger': addToppings,
    '$help': contactHelp,
    '$dalle': createDalleImages
};

async function addToppings(context) {
    return sendMessageResponse(context, 'Ketchup!');
}

async function contactHelp(context) {
    return sendMessageResponse(context, 'Please contact the Help Desk.');
}

async function sendMessageResponse(context, message) {
    const replyActivity = MessageFactory.text(message);
    modifyConversationID(context, replyActivity);
    return await context.sendActivity(replyActivity);
}

function modifyConversationID(context, replyActivity) {
    try {
        replyActivity.conversation = context.activity.conversation;
        const thread_ts = context.activity.channelData?.SlackMessage?.event?.thread_ts || 
                            context.activity.channelData?.SlackMessage?.event?.ts;
        if (thread_ts && !replyActivity.conversation.id.includes(thread_ts)) {
            replyActivity.conversation.id += ':' + thread_ts;
        }
    } catch (error) {
        console.error('Error occurred while trying to reply in the thread:', error);
    }
}

async function createDalleImages(context) {
    const messageText = context.activity.text.replace('$dalle', '').trim();
    let startTime = new Date().getTime();

    let thread_ts;
    if (context.activity.channelId === 'slack') {
        thread_ts = context.activity.channelData?.SlackMessage?.event?.thread_ts ||
            context.activity.channelData?.SlackMessage?.event?.ts;
    }

    if (!messageText) {
        await sendMessageResponse(context, `You did not ask for any image in particular, so get the default of a dog! Please wait a moment...`);
        return;
    }

    let splitMessage = messageText.split(" --");
    let prompt = splitMessage[0] || "a nice photo of a dog";
    let numImages = splitMessage[1] ? parseInt(splitMessage[1]) : 1;
    let filenameBase = sanitizeFilename(prompt);

    if (numImages > 10) {
        await sendMessageResponse(context, `You've asked for more than 10 images. We are going to generate the maximum allowed of 10. Please wait...`);
        numImages = 10;
    }

    await sendMessageResponse(context, `You asked for "${prompt}". We are generating ${numImages} image(s) for you. Each image may take a few seconds to generate. Please wait...`);

    for(let i=0; i<numImages; i++){
        let filename = `${filenameBase}_${(i+1).toString().padStart(2, '0')}.png`;
        await sendMessageResponse(context, `Creating ${filename}...`);
        await context.sendActivity({ type: 'typing' });
        await generateAndSendImages(context, prompt, 1);
    }

    let endTime = new Date().getTime();
    let difference = endTime - startTime;
    let seconds = (difference / 1000).toFixed(3);
    await sendMessageResponse(context, `We generated ${numImages} image(s) for you that took a total of ${seconds} seconds. Thank you.`);
}

function sanitizeFilename(prompt) {
    let filenameBase = prompt.replace(/[^a-z0-9_]/gi, '_').replace(/\s+/g, '').replace(/_+/g, "_").substring(0, 15);
    return filenameBase !== '_' ? filenameBase.trim('_') : filenameBase;
}

async function generateAndSendImages(context, prompt, numImages) {
    await generateImages(prompt, numImages, async (imageUrl) => {
        const replyActivity = MessageFactory.attachment({
            contentType: 'image/png',
            contentUrl: imageUrl,
        });

        if (context.activity.channelId === 'slack') {
            replyActivity.conversation = replyActivity.conversation || context.activity.conversation;  
            let thread_ts = context.activity.channelData?.SlackMessage?.event?.thread_ts ||
                            context.activity.channelData?.SlackMessage?.event?.ts;

            if (thread_ts && !replyActivity.conversation.id.includes(thread_ts)) {
                replyActivity.conversation.id += ':' + thread_ts;
            }
        }
    
        await context.sendActivity(replyActivity);
    });
}

module.exports = commands;