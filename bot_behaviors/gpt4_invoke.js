const axios = require('axios');

// Get environment variables
const OPENAI_API_KEY = process.env['2023oct24_OPENAI_GPT4_API_KEY'];
const OPENAI_API_BASE_URL = process.env['2023oct24_OPENAI_GPT4_API_BASE_URL'];
const OPENAI_GPT4_ENGINE = process.env['2023oct24_OPENAI_GPT4_32K_API_ENGINE_DEPLOYMENT'];

// Set axios defaults
axios.defaults.baseURL = OPENAI_API_BASE_URL;
axios.defaults.headers.common['Content-Type'] = 'application/json';
axios.defaults.headers.common['Authorization'] = `Bearer ${OPENAI_API_KEY}`;

// Function to call OpenAI API
const invokeOpenaiGpt4 = async (prompt) => {
    // Prepare payload
    const payload = {
        messages: [
            { role: "system", content: "You are an AI assistant."},
            { role: "user", content: prompt }
        ]
    };

    // Print payload
    console.log('\n\n[DEBUG for gpt4_invoke.js]: Sending payload to OpenAI:', payload);

    // Define endpoint
    const endpoint = `/openai/deployments/${OPENAI_GPT4_ENGINE}/chat/completions?api-version=2023-07-01-preview`;

    // Print endpoint
    console.log(`\n\n[DEBUG for gpt4_invoke.js]: Endpoint: ${axios.defaults.baseURL}${endpoint}`);

    // Make request and handle response
    try {
        const response = await axios.post(endpoint, payload);
        console.log('\n\n[DEBUG for gpt4_invoke.js]: OpenAI API Chat Response:', response.data);
        // you may need to change the following line depending on the structure of the response data
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