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
    let messageText = context.activity.text.replace('$dalle', '').trim();
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
        await sendMessageWithThread(context, `You did not ask for any image in particular, so get the default of [a rembrandt-like painting of a dog in a field]! Please wait a moment...`, thread_ts);
    }

    // Split message by space and remove empty strings
    let splitMessage = messageText.split(" ").filter(Boolean);

// Initialize default values
let prompt = "a rembrandt-like painting of a dog in a field.";
let defaultPromptUsed = true;
let numImages = 3;
let imageSize = "1024x1024";

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
    prompt = "a rembrandt-like painting of a dog in a field.";
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

    let filenameBase = prompt.replace(/[^a-z0-9_]/gi, '_').replace(/\s+/g, '').replace(/_+/g, "_").substring(0, 15);
    filenameBase = filenameBase !== '_' ? filenameBase.trim('_') : filenameBase;

    if (numImages > 10) {
        await sendMessageWithThread(context, `You've asked for more than 10 images. We are going to generate the maximum allowed of 10. Please wait...`, thread_ts);
        numImages = 10;
    }

      // Before generating images, notify the user about their specifications
      const initialMessage = `You have asked for ${numImages} image(s) of "${prompt}", at ${imageSize}. Please hold while we create...`;
      await sendMessageWithThread(context, initialMessage, thread_ts);
    

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
    const finishMessage = `We generated your ${numImages} image(s) @ ${imageSize} with a prompt of '${prompt}'.  This took a total of ${seconds} seconds. Thank you.`;
    await sendMessageWithThread(context, finishMessage, thread_ts);
  }}
async function sendMessageWithThread(context, message, thread_ts) {
    const newActivity = MessageFactory.text(message);
    newActivity.conversation = context.activity.conversation; 

    if (thread_ts && !newActivity.conversation.id.includes(thread_ts)) {
        newActivity.conversation.id += ':' + thread_ts;
    }

    await context.sendActivity(newActivity);
}

module.exports = commands;