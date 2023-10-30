const axios = require('axios');

const OPENAI_API_KEY = process.env['2023oct24_OPENAI_GPT4_API_KEY'];
const OPENAI_API_BASE_URL = process.env['2023oct24_OPENAI_GPT4_API_BASE_URL'];
const OPENAI_API_VERSION = process.env['2023oct24_OPENAI_GPT4_API_VERSION'];
const API_ENGINE_DEPLOYMENT = process.env['2023oct24_OPENAI_GPT4_API_ENGINE_DEPLOYMENT'];

const axiosInstance = axios.create({
    baseURL: OPENAI_API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      'api-key': OPENAI_API_KEY
    }
});

const invokeOpenaiGpt4 = async (prompt) => {
    // Prepare payload
    const payload = {
        messages: [
            { role: "system", content: "You are an AI assistant."},
            { role: "user", content: prompt }
        ]
    };

    const endpoint = `/openai/deployments/${API_ENGINE_DEPLOYMENT}/chat/completions?api-version=${OPENAI_API_VERSION}`;

    console.log(`\n\n[DEBUG for gpt4_invoke.js]: Endpoint: ${axiosInstance.defaults.baseURL}${endpoint}`);
    console.log('\n\n[DEBUG for gpt4_invoke.js]: Sending payload to OpenAI:', payload);

    try {
        const response = await axiosInstance.post(endpoint, payload);
        console.log('\n\n[DEBUG for gpt4_invoke.js]: Full OpenAI API Response:', JSON.stringify(response.data, null, 2)); 
        console.log('\n\n[DEBUG for gpt4_invoke.js]: Response ID:', response.data.id);
        console.log('\n\n[DEBUG for gpt4_invoke.js]: Response Object:', response.data.object);
        console.log('\n\n[DEBUG for gpt4_invoke.js]: Timestamp of Creation:', response.data.created);
        console.log('\n\n[DEBUG for gpt4_invoke.js]: Model:', response.data.model);

        for (let i = 0; i < response.data.choices.length; i++) {
            console.log(`\n\n[DEBUG for gpt4_invoke.js]: Choice #${i}:`);
            console.log('Content:', response.data.choices[i].message.content);
            console.log('Finish Reason:', response.data.choices[i].finish_reason);
        }

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('\n\n[DEBUG for gpt4_invoke.js]: Error', error.message);
        if (error.response) {
            console.error('\n\n[DEBUG for gpt4_invoke.js]: Error Response Data', error.response.data);
            console.error('\n\n[DEBUG for gpt4_invoke.js]: Error Response Status', error.response.status);
            console.error('\n\n[DEBUG for gpt4_invoke.js]: Error Response Headers', error.response.headers);
        } else if (error.request) {
            console.error('\n\n[DEBUG for gpt4_invoke.js]: Error Request', error.request);
        }
        return null;
    }
};

module.exports = {
    invokeOpenaiGpt4
};