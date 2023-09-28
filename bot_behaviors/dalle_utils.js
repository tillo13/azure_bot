const fetch = require('node-fetch');
const OPENAI_DALLE_BASE_URL = process.env.OPENAI_DALLE_BASE_URL;
const OPENAI_DALLE_VERSION = process.env.OPENAI_DALLE_VERSION;
const OPENAI_DALLE_API_KEY = process.env.OPENAI_DALLE_API_KEY;

async function generateImages(prompt = 'a nice photo of a dog', numImages = 1) {
    const headers = { "API-Key": OPENAI_DALLE_API_KEY, "Content-Type": "application/json"};
    const requestBody = { prompt, size: "1024x1024", n: numImages };
    const submitUrlPath = "/openai/images/generations:submit?api-version=";

    const response = await fetch(
        `${OPENAI_DALLE_BASE_URL}${submitUrlPath}${OPENAI_DALLE_VERSION}`,
        { method: "POST", headers, body: JSON.stringify(requestBody) }
    );
    const initJob = await response.json();

    if(!initJob.id) {
        console.error('Error occurred while submitting a job', initJob);
        return;
    }

    const jobId = initJob.id;
    const checkJobUrlPath = "/openai/operations/images/";

    const imageUrls = [];

    for (let i = 0; i < 5; i++) {
        await new Promise(resolve => setTimeout(resolve, 1500));

        const res = await fetch(
            `${OPENAI_DALLE_BASE_URL}${checkJobUrlPath}${jobId}?api-version=${OPENAI_DALLE_VERSION}`,
            { method: "GET", headers }
        );

        const job = await res.json();

        if (job.status === "succeeded") {
            job.result.data.forEach(imageData => {
                const imageUrl = imageData?.url;
                if (imageUrl) {
                    console.log('Dall-E image generated, url:', imageUrl);
                    imageUrls.push(imageUrl)
                }
            });
            break;
        } 

        if(job.status !== 'running'){
            console.error('Unknown job status:', job.status);
        }
    }
    
    return imageUrls;
}

module.exports = generateImages;