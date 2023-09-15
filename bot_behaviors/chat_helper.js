const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");

function shouldRequery(responseContent) {
    let patterns = [
        "as an ai",
        "access to personal information",
        "I do not have access to previous conversations",
        "I don't have access to information shared in previous conversations",
        "I don't have access to information about",
        // More patterns...
    ];
    
    return {
        'assistantContent': responseContent,
        'requery': patterns.some(pattern => responseContent && responseContent.toLowerCase().includes(pattern))
    };
}

async function chatCompletion(chatTexts, roleMessage) {
    const endpoint = process.env.OPENAI_API_BASE_URL;
    const client = new OpenAIClient(endpoint, new AzureKeyCredential(process.env.OPENAI_API_KEY));
    const deploymentId = process.env.OPENAI_API_DEPLOYMENT;

    // Ensure chatMessages is an array
    let chatMessages = Array.isArray(chatTexts) ? chatTexts : [];
    let response = {'assistantContent': "", 'requery': false};
    // Check if requery is possible
    if(chatMessages.length >= 2){
        response = shouldRequery(chatMessages[chatMessages.length - 2].content)
    }
    //check if requery necessary

    if (response.requery) {
        // Find the last assistant message in the conversation
        for(let i = chatMessages.length - 1; i >= 0; i--) {
            if(chatMessages[i].role === 'assistant') {
                // Replace the assistant's message with a generic system message
                chatMessages[i] = { role: "system", content: "Let me check our past conversations, one moment..."};
                break;
            }
        }
        // Retry the request
        let result = await client.getChatCompletions(deploymentId, chatMessages, { maxTokens: 128 });
        return { 'assistantResponse': result.choices[0].message.content, 'requery': response.requery };
    }
    }

    // Check if the system message has already been added
    if(chatMessages.length === 0 || (chatMessages[0] && chatMessages[0].role !== "system")) {
        // Add system message as the first message in the conversation
        chatMessages.unshift({ role: "system", content: roleMessage });
    }

    console.log(`Sending request to OpenAI API with the following parameters:
      Endpoint: ${endpoint}
      Deployment Id: ${deploymentId}
      Messages: ${JSON.stringify(chatMessages)}
   `);

    try {
        let result = await client.getChatCompletions(deploymentId, chatMessages, { maxTokens: 128 });
        console.log(`Received response from OpenAI API: ${JSON.stringify(result)}`);  
        return { 'assistantResponse': result.choices[0].message.content, 'requery': response.requery };
    } 
    catch (error) {
        console.error("An error occurred while interacting with OpenAI API", error);
        throw error;
    }
}

module.exports = chatCompletion;