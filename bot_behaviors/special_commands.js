const { MessageFactory } = require('botbuilder');
const generateImages = require('./dalle_utils');

let commandActions = {
    '$hamburger': addToppings,
    '$help': contactHelp,
    '$dalle': createDalleImages
}

async function handleCommand(command, context) {
    for (let key in commandActions) {
        if (command.startsWith(key)) {
            return commandActions[key](context);
        } 
    }
    return undefined;
}

async function addToppings(context) {
    return sendMessageResponse(context, 'Ketchup!');
}

async function contactHelp(context) {
    return sendMessageResponse(context, 'Please contact the Help Desk.');
}

async function sendMessageResponse(context, message) {
    let replyActivity = MessageFactory.text(message);
    modifyConversationId(context, replyActivity);
    return await context.sendActivity(replyActivity);
}

async function createDalleImages(context) {
    let messageText = extractText(context);
    let startTime = new Date().getTime();
    let splitMessage = messageText.split(" --");
    let { prompt, numImages } = processMessage(splitMessage);
    let filenameBase = createFilename(prompt);

    numImages = await verifyImages(context, numImages);
    await generateImages(context, prompt, numImages, filenameBase);
    await postProcessing(context, numImages, startTime);
}

function extractText(context) {
    return context.activity.text.replace('$dalle', '').trim();
}

function processMessage(splitMessage) {
    return {
        prompt: splitMessage[0] || "a nice photo of a dog",
        numImages: splitMessage[1] ? parseInt(splitMessage[1]) : 1
    }
}

function createFilename(prompt) {
    let filenameBase = prompt.replace(/[^a-z0-9_]/gi, '_').replace(/\s+/g, '').replace(/_+/g, "_").substring(0, 15);
    return filenameBase !== '_' ? filenameBase.trim('_') : filenameBase;
}

async function verifyImages(context, numImages) {
    if (numImages > 10) {
        await sendMessageResponse(context, `You've asked for more than 10 images. We are going to generate the maximum allowed of 10. Please wait...`);
        numImages = 10;
    }
    return numImages;
}

async function generateImages(context, prompt, numImages, filenameBase) {
    for(let i=0; i<numImages; i++){
        let filename = `${filenameBase}_${(i+1).toString().padStart(2, '0')}.png`;
        await sendMessageResponse(context, `Creating ${filename}...`);
        await postMessageAndType(context, () => getImage(prompt));
    }
}

function getImage(prompt) {
    return generateImages(prompt, 1, async (imageUrl) => {
        return MessageFactory.attachment({
            contentType: 'image/png',
            contentUrl: imageUrl,
        });
    });
}

async function postProcessing(context, numImages, startTime) {
    let endTime = new Date().getTime();
    let seconds = calculateSeconds(startTime, endTime);
    await sendMessageResponse(context, `We generated ${numImages} image(s) for you that took a total of ${seconds} seconds. Thank you.`);
}

function calculateSeconds(startTime, endTime) {
    return ((endTime - startTime) / 1000).toFixed(3);
}

function modifyConversationId(context, activity) {
    activity.conversation = context.activity.conversation;
    if (context.activity.channelData?.SlackMessage?.event?.thread_ts && activity.conversation.id.includes(thread_ts)) {
        activity.conversation.id += ':' + thread_ts;
    }
}

async function postMessageAndType(context, getMessage) {
    await context.sendActivity({ type: 'typing' });
    let message = await getMessage();
    modifyConversationId(context, message);
    await context.sendActivity(message);
}

const commands = new Proxy(commandActions, {
    get: function(target, property) {
        return target[property] || handleCommand;
    }
});

module.exports = commands;