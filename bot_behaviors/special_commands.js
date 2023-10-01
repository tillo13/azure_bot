const { MessageFactory } = require('botbuilder');
const generateImages = require('./dalle_utils');
const { addReaction, removeReaction } = require('./slack_utils');
const dalleMessageFormats = require('./dalle_message_formats');

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
    
        if (context.activity.channelId === 'slack') {
            const thread_ts = context.activity.channelData?.SlackMessage?.event?.thread_ts || 
                              context.activity.channelData?.SlackMessage?.event?.ts;
            if (!replyActivity.conversation.id.includes(thread_ts)) {
                replyActivity.conversation.id += ':' + thread_ts;
            }
        }
    } catch (error) {
        console.error('Error occurred while trying to reply in the thread:', error);
    }

    return await context.sendActivity(replyActivity);
}

function parseMessage(text) {
    const defaultPrompt = "a rembrandt-like painting of a dog in a field.";
    let prompt = defaultPrompt;
    let numImages = 3;
    let imageSize = "1024x1024";
    let defaultPromptUsed = true;

    // Split message by space and remove empty strings
    let splitMessage = text.replace('$dalle', '').trim().split(" ").filter(Boolean);

    // Parse arguments
    splitMessage.forEach((arg, index) => {
        if (arg.startsWith("--")) {
            let nextArg = splitMessage[index + 1];
            if (parseInt(arg.slice(2))) {
                // If a number follows "--", it's the number of images
                numImages = parseInt(arg.slice(2));
            } else if (["full", "medium", "small"].includes(arg.slice(2))) {
                // If "full", "medium", or "small" follow "--", it's the image size
                imageSize = arg.slice(2);
            }
        } else if (!arg.startsWith("--") && (!splitMessage[index - 1] || !splitMessage[index - 1].startsWith("--"))) {
            // If an argument does not start with "--" and is not directly following an argument that starts with "--", it's part of the prompt
            if (defaultPromptUsed) {
                prompt = arg;
                defaultPromptUsed = false;
            } else {
                prompt = `${prompt} ${arg}`;
            }
        }
    });

    // If prompt is still empty, set the default value back
    if (!prompt.trim()) {
        prompt = defaultPrompt;
    }

    // Process imageSize
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

    return { prompt, numImages, imageSize };
}

async function createDalleImages(context) {
    let startTime = new Date().getTime();  

    const { prompt, numImages, imageSize } = parseMessage(context.activity.text);
    
    await sendStartMessage(context, prompt, numImages, imageSize);
    
    const images = await generateDalleImages(context, prompt, numImages, imageSize);

    await sendFinishMessage(context, prompt, numImages, imageSize, images, startTime);  // Pass startTime to the function
}

async function sendStartMessage(context, prompt, numImages, imageSize) {
    const startMessage = `Summary: We are going to use DallE to create... 
    Prompt: ${prompt} 
    Number of images: ${numImages} 
    Size of images: ${imageSize}\nPlease hold while we create...`;

    await sendMessageResponse(context, startMessage);
}

async function generateDalleImages(context, prompt, numImages, imageSize) {
    const images = [];
    for (let i = 0; i < numImages; i++) {
        let filename = `${prompt}_${(i + 1).toString().padStart(2, '0')}.png`;
        await sendMessageResponse(context, `Creating ${filename}...`);

        try {
            // Keep the "typing" activity indication
            await context.sendActivity({ type: 'typing' });

            // Generate the image
            await generateImages(prompt, 1, imageSize, async (imageUrl) => {
                images.push(imageUrl);  // Add the image URL to the list

                // Create the reply activity with the image
                const replyActivity = MessageFactory.attachment({
                    contentType: 'image/png',
                    contentUrl: imageUrl,
                });

                // Send the reply activity
                await context.sendActivity(replyActivity);
            });
        } catch (error) {
            imgErrorHandler(context, error, filename);
        }
    }

    return images;
}

async function sendFinishMessage(context, prompt, numImages, imageSize, images, startTime) {
    let endTime = new Date().getTime();
    let difference = endTime - startTime;  // Use startTime here
    let seconds = (difference / 1000).toFixed(3);

    const finishMessage = `Summary: We used DallE to create... 
    Prompt: ${prompt} 
    Number of images: ${numImages} 
    Size of images: ${imageSize} 
    Time to complete: ${seconds} seconds. Thank you.`;

    await sendMessageResponse(context, finishMessage);
}
async function imgErrorHandler(context, error, filename) {
    const errMessage = `An error occurred while creating the image "${filename}".`;
    console.error(errMessage, error);
    await sendMessageResponse(context, errMessage);
}

module.exports = commands;