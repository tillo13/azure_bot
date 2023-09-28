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
    
    if (!messageText) {
        await context.sendActivity(`You didn't ask for any image in particular, so get the default of a dog! Please wait a moment...`);
    }

    let splitMessage = messageText.split(" --");
    const prompt = splitMessage[0] || "a nice photo of a dog";
    const numImages = splitMessage[1] ? parseInt(splitMessage[1]) : 1;
    
    const completionMessage = `You asked for "$dalle ${prompt}". We are generating ${numImages} image(s) for you. Each image takes a few seconds to generate. Please wait...`;
    await context.sendActivity(completionMessage);
    await context.sendActivity({ type: 'typing' });

    startTime = new Date();
    for(let i=0; i<numImages; i++){
      await generateImages(prompt, 1, async (imageUrl) => {
          const replyActivity = MessageFactory.attachment({
              contentType: 'image/png',
              contentUrl: imageUrl,
          });
          await context.sendActivity(replyActivity);
      });
    }

    let endTime = new Date();
    let difference = endTime - startTime;
    let seconds = Math.floor(difference / 1000);
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