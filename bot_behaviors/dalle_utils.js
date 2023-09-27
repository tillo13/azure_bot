require('dotenv').config({ path: '../.env' });
const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");

const fetch = require('node-fetch');
const fs = require('fs');
const util = require('util');
const url = require('url');
const FormData = require('form-data');
const moment = require('moment');
const sharp = require('sharp');

const OPENAI_DALLE_API_KEY = process.env.OPENAI_DALLE_API_KEY;
const OPENAI_DALLE_BASE_URL = process.env.OPENAI_DALLE_BASE_URL;
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const OPENAI_DALLE_VERSION = process.env.OPENAI_DALLE_VERSION || 'v1';

const dalleResponse = async (command_text, numImages) => {
    const response = await fetch(`${OPENAI_DALLE_BASE_URL}/${OPENAI_DALLE_VERSION}/images/dalle`, {
        method: 'POST',
        body: JSON.stringify({
            'prompt': command_text,
            'n': numImages,
        }),
        headers: {
            'Authorization': `Bearer ${OPENAI_DALLE_API_KEY}`,
            'Content-Type': 'application/json',
        },
    });
    
    if (!response.ok) {
        throw new Error(`Failed to get response from DALL·E: ${response.status}`);
    } else {
        const json = await response.json();
        return {
            'data': json.data,
            'n_images': numImages,
            'prompt': command_text,
        };
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