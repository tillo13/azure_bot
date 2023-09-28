const { MessageFactory } = require('botbuilder');
const generateImages = require('./dalle_utils');
const { addReaction, removeReaction } = require('./slack_utils');


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

    let thread_ts;
    const apiToken = context.activity.channelData?.ApiToken;
    const channelId = context.activity.channelData?.SlackMessage?.event?.channel;

    if (context.activity.channelId === 'slack') {
        thread_ts = context.activity.channelData?.SlackMessage?.event?.thread_ts ||
        context.activity.channelData?.SlackMessage?.event?.ts;

        // Add the :hourglass: emoji to the parent message
        await addReaction(channelId, thread_ts, 'hourglass_flowing_sand', apiToken);
    }

    if (!messageText) {
        await sendMessageWithThread(context, `You did not ask for any image in particular, so get the default of a dog! Please wait a moment...`, thread_ts);
    }

    let splitMessage = messageText.split(" --");
    let prompt = splitMessage[0] || "a nice photo of a dog";
    let numImages = splitMessage[1] ? parseInt(splitMessage[1]) : 1;
    let imageSize = splitMessage[2] || "1024x1024";

    switch (imageSize) {
        case 'full':
            imageSize = "1024x1024";
            break;
        case 'medium':
            imageSize = "512x512";
            break;
        case 'small':
            imageSize = "256x256";
            break;
        default:
            imageSize = "1024x1024";
            break;
    }

    let filenameBase = prompt.replace(/[^a-z0-9_]/gi, '_').replace(/\s+/g, '').replace(/_+/g, "_").substring(0, 15);
    filenameBase = filenameBase !== '_' ? filenameBase.trim('_') : filenameBase;

    if (numImages > 10) {
        await sendMessageWithThread(context, `You've asked for more than 10 images. We are going to generate the maximum allowed of 10. Please wait...`, thread_ts);
        numImages = 10;
    }

    const completionMessage = `You asked for "${prompt}". We are generating ${numImages} image(s) for you in ${imageSize} size. Please wait...`;
    await sendMessageWithThread(context, completionMessage, thread_ts);

    for(let i=0; i<numImages; i++){
        let filename = `${filenameBase}_${(i+1).toString().padStart(2, '0')}.png`;
        await sendMessageWithThread(context, `Creating ${filename}...`, thread_ts);

        await context.sendActivity({ type: 'typing' });
        await generateImages(prompt, 1, imageSize, async (imageUrl) => {
            const replyActivity = MessageFactory.attachment({
                contentType: 'image/png',
                contentUrl: imageUrl,
            });

            if (context.activity.channelId === 'slack') {
                
                replyActivity.conversation = replyActivity.conversation || context.activity.conversation;  
                if (thread_ts && !replyActivity.conversation.id.includes(thread_ts)) {
                    replyActivity.conversation.id += ':' + thread_ts;
                }
            }
        
            await context.sendActivity(replyActivity);
        });
    }


    if (context.activity.channelId === 'slack') {
        // Upon completion, remove the :hourglass: emoji and add the :white_check_mark: emoji to the parent message
        await removeReaction(channelId, thread_ts, 'hourglass_flowing_sand', apiToken);
        await addReaction(channelId, thread_ts, 'white_check_mark', apiToken);
    }
    let endTime = new Date().getTime();
    let difference = endTime - startTime;
    let seconds = (difference / 1000).toFixed(3);
    await sendMessageWithThread(context, `We generated ${numImages} image(s) @ ${imageSize} for you that took a total of ${seconds} seconds. Thank you.`, thread_ts);
}
async function sendMessageWithThread(context, message, thread_ts) {
    const newActivity = MessageFactory.text(message);
    newActivity.conversation = context.activity.conversation; 

    if (thread_ts && !newActivity.conversation.id.includes(thread_ts)) {
        newActivity.conversation.id += ':' + thread_ts;
    }

    await context.sendActivity(newActivity);
}

module.exports = commands;