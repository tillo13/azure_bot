const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');
const sharp = require('sharp');

const OPENAI_DALLE_API_KEY = process.env.OPENAI_DALLE_API_KEY;
const OPENAI_DALLE_BASE_URL = process.env.OPENAI_DALLE_BASE_URL;
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const OPENAI_DALLE_VERSION = process.env.OPENAI_DALLE_VERSION;

const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${OPENAI_DALLE_API_KEY}`,
};

const dalleResponse = async (prompt, numImages) => {
    const url = `${OPENAI_DALLE_BASE_URL}/openai/images/generations:submit?api-version=${OPENAI_DALLE_VERSION}`;
    const payload = JSON.stringify({
        'prompt': prompt,
        'n': numImages,
        'size': '1024x1024'
    });
    
    const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: payload
    });
    
    if (!response.ok) {
        throw new Error(`Failed to get response from DALL·E: ${response.status}`);
    }
    
    const json = await response.json();
    return json;
}

const downloadAndResize = async (imageUrl) => {
    const response = await fetch(imageUrl);
    const buffer = await response.buffer();

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

const uploadToSlack = async (channelId, timestamp, resizedBuffer, fileName, imageUrl, prompt) => {
    const data = new FormData();
    data.append('file', resizedBuffer, {
        filename: fileName,
        contentType: 'image/png',
    });
    data.append('channels', channelId);
    data.append('initial_comment', `Prompt: ${prompt}\nImage: ${imageUrl}`);
    data.append('thread_ts', timestamp);
}

const handleDalleCommand = async (channelId, timestamp, commandText, numImages) => {
    try {
        const dalleData = await dalleResponse(commandText, numImages);
        const imagesData = dalleData.data;
        
        for (let [index, imageData] of imagesData.entries()) {
            const resizedBuffer = await downloadAndResize(imageData.url);
            await uploadToSlack(
                channelId,
                timestamp,
                resizedBuffer,
                `dalle_${commandText.replace(/ /g, '_')}_${index + 1}.png`,
                imageData.url,
                commandText
            );
        }
        
    } catch (error) {
        console.error(`Error occurred while handling DALL·E command: ${error.message}`);
    }
}

module.exports = handleDalleCommand;