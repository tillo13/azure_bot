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
    return await context.sendActivity(completionMessage);
}

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
async function generateDogImage(context) {

    // Get start time
    let startTime = new Date();

    const headers = { "API-Key": process.env.OPENAI_DALLE_API_KEY, "Content-Type": "application/json"};
    const requestBody = { prompt: "a nice photo of a dog", size: "1024x1024", n: 1 };
    const submitUrlPath = "/openai/images/generations:submit?api-version=";

    console.log("\n\n*****SPECIAL_COMMANDS.JS: Starting generateDogImage...");

    const response = await fetch(
        `${OPENAI_DALLE_BASE_URL}${submitUrlPath}${OPENAI_DALLE_VERSION}`,
        { method: "POST", headers, body: JSON.stringify(requestBody) }
    );
    const initJob = await response.json();

    if(!initJob.id) {
        console.error('\n\n*****SPECIAL_COMMANDS.JS: Error occurred while submitting a job', initJob);
        return;
    }

    const jobId = initJob.id;
    const checkJobUrlPath = "/openai/operations/images/";
    console.log('\n*****SPECIAL_COMMANDS.JS: Dall-E job submitted, id: ', jobId);

    for (let i = 0; i < 5; i++) {
        await new Promise(resolve => setTimeout(resolve, 1500));

        const res = await fetch(
            `${OPENAI_DALLE_BASE_URL}${checkJobUrlPath}${jobId}?api-version=${OPENAI_DALLE_VERSION}`,
            { method: "GET", headers }
        );

        const job = await res.json();
        
        // Added the counter (i+1) to indicate the iteration number
        console.log('\n*****SPECIAL_COMMANDS.JS: Checking Dall-E job status...' + ' Attempt number: ' + (i+1));

        if (job.status === "succeeded") {
            const imageUrl = job.result.data[0]?.url;
            if (imageUrl) {
                console.log('\n*****SPECIAL_COMMANDS.JS: Dall-E image generated, url:', imageUrl);
                await context.sendActivity(`Here's a nice photo of a dog: ${imageUrl}`);
            }
            break;
        } 

        if(job.status !== 'running'){
            console.error('*****SPECIAL_COMMANDS.JS: Unknown job status:', job.status)
        }
    }

    // Get end time
    let endTime = new Date();

    // calculate time difference in milliseconds
    let difference = endTime - startTime;

    // calculate time difference in seconds
    let seconds = Math.floor(difference / 1000);

    console.log(`\n*****SPECIAL_COMMANDS.JS:dog image Time difference is ${difference} milliseconds`);
    console.log(`\n*****SPECIAL_COMMANDS.JS:dog image Time difference is ${seconds} seconds`);
}

const commands = {
	'$hamburger': addToppings,
	'$help': contactHelp,
	'$dalle': createDalleImages,
    '$dog': generateDogImage
};

module.exports = commands;