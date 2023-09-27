const fetch = require('node-fetch'); // make sure to install this with npm install node-fetch

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
    console.log('generateDogImage() - About to generate a new dog image...');

    const baseUrl = process.env.OPENAI_DALLE_BASE_URL;
    const version = process.env.OPENAI_DALLE_VERSION;
    const headers = {
        "API-Key": process.env.OPENAI_DALLE_API_KEY,
        "Content-Type": "application/json",
    };

    const requestBody = {
        prompt: "a nice photo of a dog",
        size: "1024x1024",
        n: 1,
    };

    console.log('generateDogImage() - Making the POST request...');
    const response = await fetch(
        `${baseUrl}/images/generations:submit?api-version=${version}`,
        {
            method: "POST",
            headers,
            body: JSON.stringify(requestBody),
        }
    );

    const initJob = await response.json();
    if(!initJob.id){
        console.log('Error while submitting a job', initJob);
        return;
    } 

    const jobId = initJob.id;
    console.log('Job submitted, id: ', jobId);

    for (let i = 0; i < 5; i++) {
        console.log('generateDogImage() - Start iteration number:', i+1);

        // Wait 1.5 seconds after a request
        await new Promise(resolve => setTimeout(resolve, 1500));
        console.log('generateDogImage() - Completed wait, making the GET request...');

        const response = await fetch(
            `${baseUrl}/operations/images/${jobId}?api-version=${version}`,
            {
                method: "GET",
                headers,
            }
        );

        const job = await response.json();

        console.log('generateDogImage() - Got job status:', job.status);
        if (job.status === "succeeded") {
            const imageUrl = job?.result?.data[0]?.url;
            if (imageUrl) {
                console.log('Image generated, url: ', imageUrl);
                await context.sendActivity(`Here's a nice photo of a dog: ${imageUrl}`);
            }
            // exit the for-loop early since we have what we wanted
            break;
        } else if(job.status !== 'running'){
            console.log('Unknown job status: ', job.status)
        }
    }
}

const commands = {
	'$hamburger': addToppings,
	'$help': contactHelp,
	'$dalle': createDalleImages,
    '$dog': generateDogImage
};

module.exports = commands;