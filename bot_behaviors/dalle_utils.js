const fetch = require('node-fetch');
const OPENAI_DALLE_BASE_URL = process.env.OPENAI_DALLE_BASE_URL;
const OPENAI_DALLE_VERSION = process.env.OPENAI_DALLE_VERSION;
const OPENAI_DALLE_API_KEY = process.env.OPENAI_DALLE_API_KEY;

async function generateImages(prompt, numImages = 1) {
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
        throw new Error('Error occurred while submitting a job');
    }

    const jobId = initJob.id;
    const checkJobUrlPath = "/openai/operations/images/";
    const finalImageUrls = [];
    
    for (let i = 0; i < 40; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const res = await fetch(
            `${OPENAI_DALLE_BASE_URL}${checkJobUrlPath}${jobId}?api-version=${OPENAI_DALLE_VERSION}`,
            { method: "GET", headers }
        );
        

        const job = await res.json();
        if(job.status === 'succeeded'){
            job.result.data.forEach(imgData =>
                finalImageUrls.push(imgData.url)
            );
            break;
        } else if (job.status !== 'running'){
            throw new Error('Unknown job status: ' + job.status);
        }
    }
    return finalImageUrls;
}

module.exports = generateImages;