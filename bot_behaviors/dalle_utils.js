const fetch = require('node-fetch');
const fs = require('fs');
const util = require('util');
const url =  require('url');
const FormData = require('form-data');
const moment = require('moment');
const sharp = require('sharp');
require('dotenv').config();

const OPENAI_DALLE_API_KEY = process.env.OPENAI_DALLE_API_KEY;
const OPENAI_DALLE_BASE_URL = process.env.OPENAI_DALLE_BASE_URL;
const OPENAI_DALLE_VERSION = process.env.OPENAI_DALLE_VERSION;
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;

//test to show the values
console.log("OPENAI_DALLE_API_KEY:", process.env.OPENAI_DALLE_API_KEY);
console.log("OPENAI_DALLE_BASE_URL:", process.env.OPENAI_DALLE_BASE_URL);
console.log("OPENAI_DALLE_VERSION:", process.env.OPENAI_DALLE_VERSION);
const dalleResponse = async (command_text) => {
	let n_images = 3;
	let prompt = command_text.trim();
	
	const command_parts = command_text.split(" ");
	command_parts.forEach((part, index) => {
		if (part.startsWith("--")) {
			try {
				n_images = Math.min(parseInt(part.replace("--", "")), 5);
				command_parts.splice(index, 1);
				prompt = command_parts.join(" ").trim();
			} catch (err) {
				console.error(`Error parsing --number from DALL·E command: ${err.message}`);
			}
		}
	});
	
	const response = await fetch(`${OPENAI_DALLE_BASE_URL}/${OPENAI_DALLE_VERSION}/images/dalle`, {
		method: 'POST',
		body: JSON.stringify({
			'prompt': prompt,
			'n': n_images,
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
			'n_images': n_images,
			'prompt': prompt,
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

const handleDalleCommand = async (channelId, timestamp, commandText) => {
	try {
		const dalleData = await dalleResponse(commandText);
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