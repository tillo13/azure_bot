const axios = require('axios').default;

const OPENAI_API_KEY = process.env['2023oct24_OPENAI_GPT4_API_KEY'];
const OPENAI_API_BASE_URL = process.env['2023oct24_OPENAI_GPT4_API_BASE_URL'];
const OPENAI_API_VERSION = process.env['2023oct24_OPENAI_GPT4_API_VERSION'];
const OPENAI_GPT4_ENGINE = process.env['2023oct24_OPENAI_GPT4_32K_API_ENGINE_DEPLOYMENT'];

async function invokeOpenaiGpt4(prompt) {
    const config = {
        headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
        }
    };

    const body = {
        engine: OPENAI_GPT4_ENGINE,
        prompt: prompt,
        max_tokens: 800,
        temperature: 0.9
    };
    
    try {
        const response = await axios.post(`${OPENAI_API_BASE_URL}/v1/engines/${OPENAI_GPT4_ENGINE}/completions`, body, config);
        return response.data.choices[0].text;
    } catch (error) {
        console.error(`Failed to call the OpenAI API: ${error.message}`);
        return null;
    }
}

module.exports = {
    invokeOpenaiGpt4
}