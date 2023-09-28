const fetch = require('node-fetch'); 
const OPENAI_DALLE_BASE_URL = process.env.OPENAI_DALLE_BASE_URL;
const OPENAI_DALLE_VERSION = process.env.OPENAI_DALLE_VERSION;
const handleDalleCommand = require('./dalle_utils');

async function createDalleImages(context) {
    const messageText = context.activity.text.replace('$dalle', '').trim();
    let splitMessage = messageText.split(" --");
    const prompt = splitMessage[0] || "a happy dog";
    const numImages = splitMessage[1] ? parseInt(splitMessage[1]) : 3;

    await handleDalleCommand(context.activity.conversation.id, context.timestamp, prompt, numImages);

    const completionMessage = numImages > 1 ? `Images are on their way, might take some time.` : `Image is on its way, might take some time.`;
    return context.sendActivity(completionMessage);
}

async function addToppings(context) {
    return sendMessageResponse(context, 'Ketchup!');
}

async function contactHelp(context) {
    return sendMessageResponse(context, 'Please contact the Help Desk.');
}

async function sendMessageResponse(context, message) {
    const replyActivity = MessageFactory.text(message);
    if (context.activity.channelId === 'slack') {
        const thread_ts = context.activity.channelData?.SlackMessage?.event?.thread_ts 
            || context.activity.channelData?.SlackMessage?.event?.ts;
        replyActivity.conversation = context.activity.conversation;
        if (!replyActivity.conversation.id.includes(thread_ts)) {
            replyActivity.conversation.id += ':' + thread_ts;
        }
    }

    return context.sendActivity(replyActivity);
}
async function generateDogImage(context) {
    const resultsTime = "Time taken for generateDogImage";    
    console.time(resultsTime);
    
    const headers = {
        "API-Key": process.env.OPENAI_DALLE_API_KEY, 
        "Content-Type": "application/json"
    };
    const requestBody = { prompt: "a nice photo of a dog", size: "1024x1024", n: 1 };

    let retryCount = 0;
    console.log("\n\n*****SPECIAL_COMMANDS.JS: Starting generateDogImage...");

    const initJob = await submitJob(headers, requestBody);
    if (!initJob.id) return;
    console.log('\n*****SPECIAL_COMMANDS.JS: Dall-E job submitted, id: ', initJob.id);

    while(retryCount < 5) {
        retryCount += 1;
        console.log(`\n*****SPECIAL_COMMANDS.JS: Checking Dall-E job status... attempt: ${retryCount}`);

        const job = await checkJobStatus(headers, initJob.id);
        if (job.status === "succeeded" && job.result.data[0]?.url) {
            console.log('*****SPECIAL_COMMANDS.JS: Dall-E image generated, url: ', job.result.data[0]?.url);
            await context.sendActivity(`Here's a nice photo of a dog: ${job.result.data[0]?.url}`);
            break;
        }
        
        if(job.status !== 'running') {
            console.error('*****SPECIAL_COMMANDS.JS: Unknown job status: ', job.status);
            break;
        }
        await new Promise(resolve => setTimeout(resolve, 1500));
    }
    console.timeEnd(resultsTime);
}

async function submitJob(headers, requestBody) {
    const response = await fetch(`${OPENAI_DALLE_BASE_URL}/images/generations:submit?api-version=${OPENAI_DALLE_VERSION}`, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody)
    });

    return await response.json();
}

async function checkJobStatus(headers, id) {
    const response = await fetch(
        `${OPENAI_DALLE_BASE_URL}/operations/images/${id}?api-version=${OPENAI_DALLE_VERSION}`, 
        { method: "GET", headers }
    );

    return await response.json();
}

const commands = {
	'$hamburger': addToppings,
	'$help': contactHelp,
	'$dalle': createDalleImages,
    '$dog': generateDogImage
};

module.exports = commands;