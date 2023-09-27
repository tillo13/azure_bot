const axios = require('axios');
const { DefaultAzureCredential } = require('@azure/identity');

const OPENAI_DALLE_API_KEY = 'https://cognitiveservices.azure.com/.default'; // Replace with your resource
const OPENAI_DALLE_BASE_URL = process.env.OPENAI_DALLE_BASE_URL;
const OPENAI_DALLE_VERSION = process.env.OPENAI_DALLE_VERSION;
// include the other requires for sharp, fetch, etc.

const credential = new DefaultAzureCredential();
let openai_token = null;

const dalleResponse = async (command_text, numImages) => {
  await ensureOpenaiToken();

  const url = `${OPENAI_DALLE_BASE_URL}/openai/images/generations:submit?api-version=${OPENAI_DALLE_VERSION}`;
  const payload = JSON.stringify({
      'prompt': command_text,
      'size': '1024x1024',
      'n': numImages,
  });

  console.log(`URL: ${url}`);
  console.log(`Payload: ${payload}`);

  const response = await axios.post(url, payload, {
    headers: {
      'Authorization': `Bearer ${openai_token.token}`,
      'Content-Type': 'application/json',
    },
  });

    console.log(`URL: ${url}`);
    console.log(`Payload: ${payload}`);
    
    console.log('Response: ', response);
    console.log('Response status: ', response.status);
    console.log('Response headers: ', response.headers.raw());

    if(!response.ok) {
        const error = await response.text();
        console.log('Error: ', error);
        throw new Error("DALL·E error. Status: " + response.status + " Message: " + error);
    } else {
        const json = await response.json();
        return {
            'data': json.data,
            'n_images': json.n_images,
            'prompt': command_text,
        };
    }
};

async function ensureOpenaiToken() {
    if (!openai_token || openai_token.expiresOnTimestamp <= new Date().getTime() + 5 * 60 * 1000) {
        openai_token = await credential.getToken(OPENAI_DALLE_API_KEY);
    }
}
const downloadAndResize = async (imageData) => {
	const imageResponse = await fetch(imageData.url);
	const buffer = await imageResponse.buffer();

	let resizedBuffer = buffer;
	const fileSizeInMegabytes = buffer.length / (1024 * 1024);
	if (fileSizeInMegabytes > 3) {
		const img = sharp(buffer);
		let factor = 0.9;
		while (resizedBuffer.length / (1024 * 1024) > 3) {
			const { width, height } = await img.metadata();
			resizedBuffer = await img.resize(Math.round(width * factor), Math.round(height * factor)).toBuffer();
			factor *= 0.9;
		}
	}
	return resizedBuffer;
}

const uploadToSlack = async (channelId, timestamp, resizedBuffer, fileName, imageData, prompt, n_images) => {
	const data = new FormData();
	data.append('file', resizedBuffer, {
		filename: fileName,
		contentType: 'image/png',
	});
	data.append('channels', channelId);
	data.append('initial_comment', `Prompt: ${prompt}\nRequested ${n_images} images\nImage: ${imageData.url}`);
	data.append('thread_ts', timestamp);

	const response = await fetch("https://slack.com/api/files.upload", {
		method: 'POST',
		body: data,
		headers: {
			'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
		},
	});
	
	if (!response.ok) {
		throw new Error(`Failed to upload image to slack: ${response.status}`);
	}
}

const handleDalleCommand = async (channelId, timestamp, commandText, numImages) => {
    try {
            //are the params coming over?
    console.log("\n\ndalle_utils.js:OPENAI_DALLE_BASE_URL:", OPENAI_DALLE_BASE_URL);
    console.log("\n\n*dalle_utils.js:OPENAI_DALLE_VERSION:", OPENAI_DALLE_VERSION);
        const dalleData = await dalleResponse(commandText, numImages);
        const parsedData = dalleData.data;
        parsedData.forEach(async (data, index) => {
            const resizedBuffer = await downloadAndResize(data);
            await uploadToSlack(
                channelId,
                timestamp,
                resizedBuffer,
                `dalle_${dalleData.prompt}_${index + 1}_of_${dalleData.n_images}.png`,
                data,
                dalleData.prompt,
                dalleData.n_images
            );
        });
    } catch(err) {
        console.error(`Error occurred while handling DALL·E command: ${err.message}`);
    }
}

module.exports = handleDalleCommand;