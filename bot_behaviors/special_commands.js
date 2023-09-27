const axios = require('axios');
const OPENAI_DALLE_BASE_URL = process.env.OPENAI_DALLE_BASE_URL;
const OPENAI_DALLE_VERSION = process.env.OPENAI_DALLE_VERSION;

const handleDalleCommand = require('./dalle_utils');

async function createDalleImages(context) {
    const messageText = context.activity.text.replace('$dalle', '').trim(); // Trimmed to remove leading/trailing white space
    let splitMessage = messageText.split(" --");
    // Set "a happy dog" as the default prompt if none is provided
    const prompt = splitMessage[0] || "a happy dog";
    // Set 3 as the default number of images if none is specified
    const numImages = splitMessage[1] ? parseInt(splitMessage[1]) : 3;
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

async function generateDogImage(context) {
    try {
        const response = await axios.post('https://api.openai.com/v1/dalle/images/generations:submit', {
            prompt: 'a nice photo of a dog',
            n: 1
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_DALLE_API_KEY}`
            }
        });

        const imageUrl = response.data.results[0]["id"];
        await context.sendActivity(`Here's a nice photo of a dog: ${imageUrl}`);
    } catch (error) {
        console.log(error.message);
    }
}

const commands = {
	'$hamburger': addToppings,
	'$help': contactHelp,
	'$dalle': createDalleImages,
    '$dog': generateDogImage
};

module.exports = commands;