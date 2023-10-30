const axios = require('axios');

const OPENAI_API_KEY = process.env['2023oct24_OPENAI_GPT4_API_KEY'];
const OPENAI_API_BASE_URL = process.env['2023oct24_OPENAI_GPT4_API_BASE_URL'];
const OPENAI_GPT4_ENGINE = process.env['2023oct24_OPENAI_GPT4_32K_API_ENGINE_DEPLOYMENT'];

axios.defaults.baseURL = OPENAI_API_BASE_URL;
axios.defaults.headers['Content-Type'] = 'application/json';
axios.defaults.headers['Authorization'] = `Bearer ${OPENAI_API_KEY}`;

console.log(`Using the following OpenAI settings: ${OPENAI_API_KEY}, ${OPENAI_API_BASE_URL}, ${OPENAI_GPT4_ENGINE}.`);

const invokeOpenaiGpt4 = async (prompt) => {
    const payload = {
        model: OPENAI_GPT4_ENGINE,
        messages: [
            {"role": "system", "content": "You are a cutting edge AI."},
            {"role": "user", "content": prompt}
        ],
        max_tokens: 800,
        temperature: 0.7
    };

    try {
        const response = await axios.post(`/v1/engines/${OPENAI_GPT4_ENGINE}/completions`, payload);
        console.log('OpenAI API Response: ', response.data);
        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('Error', error.message);
        if (error.response) {
            console.error('Error Response Data', error.response.data);
            console.error('Error Response Status', error.response.status);
            console.error('Error Response Headers', error.response.headers);
        } else if (error.request) {
            console.error('Error Request', error.request);
        } 
        return null;
    }
};

module.exports = {
    invokeOpenaiGpt4
};