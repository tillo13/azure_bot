const axios = require('axios');

const OPENAI_API_KEY = process.env['2023oct24_OPENAI_GPT4_API_KEY'];
const OPENAI_API_BASE_URL = process.env['2023oct24_OPENAI_GPT4_API_BASE_URL'];
const OPENAI_GPT4_ENGINE = process.env['2023oct24_OPENAI_GPT4_32K_API_ENGINE_DEPLOYMENT'];

// Create an instance of axios with default settings
const instance = axios.create({
  baseURL: OPENAI_API_BASE_URL,
  headers: {
    'Authorization': `Bearer ${OPENAI_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

async function invokeOpenaiGpt4(prompt) {
    console.log(`Using the following OpenAI settings: ${OPENAI_API_KEY}, ${OPENAI_API_BASE_URL}, ${OPENAI_GPT4_ENGINE}.`);

    const body = {
        model: OPENAI_GPT4_ENGINE,
        messages: [{
            "role": "system",
            "content": "You are an AI assistant that helps people find information."
        }, {
            "role": "user",
            "content": prompt
        }],
        max_tokens: 800,
        temperature: 0.9
    };

    console.log(`Hitting OpenAI API with URL: ${OPENAI_API_BASE_URL}/v1/engines/${OPENAI_GPT4_ENGINE}/completions and body:`, body);
    
    try {
        const response = await instance.post(`/v1/engines/${OPENAI_GPT4_ENGINE}/completions`, body);
        console.log('OpenAI API Response: ', response.data);
        return response.data.choices[0].message.content;
    } catch (error) {
        console.error(`Failed to call the OpenAI API: ${error.message}`);
        if (error.response) {
            console.error(error.response.data);
            console.error(error.response.status);
            console.error(error.response.headers);
        } else if (error.request) {
            console.error(error.request);
        } 
        return null;
    }
}

module.exports = {
    invokeOpenaiGpt4
}