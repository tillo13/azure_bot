const axios = require('axios').default;

const OPENAI_API_KEY = process.env['2023oct24_OPENAI_GPT4_API_KEY'];
const OPENAI_API_BASE_URL = process.env['2023oct24_OPENAI_GPT4_API_BASE_URL'];
const OPENAI_API_VERSION = process.env['2023oct24_OPENAI_GPT4_API_VERSION'];
const OPENAI_GPT4_ENGINE = process.env['2023oct24_OPENAI_GPT4_32K_API_ENGINE_DEPLOYMENT'];

async function invokeOpenaiGpt4(prompt) {
    console.log(`Using the following OpenAI settings: ${OPENAI_API_KEY}, ${OPENAI_API_BASE_URL}, ${OPENAI_API_VERSION}, ${OPENAI_GPT4_ENGINE}.`);

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
    
    console.log(`Hitting OpenAI API with URL: ${OPENAI_API_BASE_URL}/v1/engines/${OPENAI_GPT4_ENGINE}/completions and body:`, body);
    
    try {
        const response = await axios.post(`${OPENAI_API_BASE_URL}/v1/engines/${OPENAI_GPT4_ENGINE}/completions`, body, config);
        console.log('OpenAI API Response: ', response.data);
        return response.data.choices[0].text;
    } catch (error) {
        console.error(`Failed to call the OpenAI API: ${error.message}`);
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error(error.response.data);
            console.error(error.response.status);
            console.error(error.response.headers);
        } else if (error.request) {
            // The request was made but no response was received
            console.error(error.request);
        } 
        return null;
    }
}

module.exports = {
    invokeOpenaiGpt4
}