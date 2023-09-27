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
    const startRuntime = Date.now(); // Begin the count for runtime since the function is called
    console.log('\n\n*****SPECIAL_COMMANDS.JS: generateDogImage() Called...');

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

    console.log('\n\n*****SPECIAL_COMMANDS.JS: generateDogImage() - Making the POST request...');
    const response = await fetch(
        `${baseUrl}/images/generations:submit?api-version=${version}`,
        {
            method: "POST",
            headers,
            body: JSON.stringify(requestBody),
        }
    );

    const initJob = await response.json();
    console.log('\n\n*****SPECIAL_COMMANDS.JS: Post Request Response Body:', JSON.stringify(initJob));

    if(!initJob.id){
        console.log('\n\n*****SPECIAL_COMMANDS.JS: Error while submitting a job', initJob);
        return;
    } 

    const jobId = initJob.id;
    console.log('\n\n*****SPECIAL_COMMANDS.JS: Job submitted, id: ', jobId);

    for (let i = 0; i < 5; i++) {
        console.log('\n\n*****SPECIAL_COMMANDS.JS: Start iteration number:', i+1);

        await new Promise(resolve => setTimeout(resolve, 1500));
        console.log('\n\n*****SPECIAL_COMMANDS.JS: Completed wait, making the GET request...');

        const response = await fetch(
            `${baseUrl}/operations/images/${jobId}?api-version=${version}`,
            {
                method: "GET",
                headers,
            }
        );

        const job = await response.json();
        console.log('\n\n*****SPECIAL_COMMANDS.JS: GET Request Response Body:', JSON.stringify(job));

        console.log('\n\n*****SPECIAL_COMMANDS.JS: Got job status:', job.status);
        if (job.status === "succeeded") {
            const imageUrl = job?.result?.data[0]?.url;
            if (imageUrl) {
                console.log('\n\n*****SPECIAL_COMMANDS.JS: Image generated, url: ', imageUrl);
                await context.sendActivity(`Here's a nice photo of a dog: ${imageUrl}`);
            }
            break;
        } else if(job.status !== 'running'){
            console.log('\n\n*****SPECIAL_COMMANDS.JS: Unknown job status: ', job.status)
        }
    }

    const endRuntime = Date.now(); // End of the runtime when function finishes
    console.log(`\n\n*****SPECIAL_COMMANDS.JS: generateDogImage() completed. Run time: ${endRuntime - startRuntime} milliseconds`);
}

const commands = {
	'$hamburger': addToppings,
	'$help': contactHelp,
	'$dalle': createDalleImages,
    '$dog': generateDogImage
};

module.exports = commands;