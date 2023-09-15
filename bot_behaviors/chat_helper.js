const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");

// Define the maximum tokens to be used for OpenAI
const MAX_OPENAI_TOKENS = 400;

function validateOpenAITokens(tokens) {
    if (tokens <= 0 || tokens > 4096) {
        console.error('Invalid setting for MAX_OPENAI_TOKENS. It should be between 1 and 4096.');
        return;
    }
    else {
        return tokens;
    }
}

function shouldRequery(responseContent) {
    let patterns = [
        "as an ai",
        "access to personal information",
        "I do not have access to previous conversations",
        "I don't have access to information shared in previous conversations",
        "I don't have information about",
        // More patterns...
    ];

    return patterns.some(pattern => responseContent.toLowerCase().includes(pattern));
}

async function chatCompletion(chatTexts, roleMessage) {
    //print to app log
    console.log('chatCompletion', chatTexts);

    const endpoint = process.env.OPENAI_API_BASE_URL;
    const client = new OpenAIClient(endpoint, new AzureKeyCredential(process.env.OPENAI_API_KEY));
    const deploymentId = process.env.OPENAI_API_DEPLOYMENT;

    // Validate the maximum tokens to be used
    const validatedTokens = validateOpenAITokens(MAX_OPENAI_TOKENS);
    if (!validatedTokens) return;

    // Ensure chatMessages is an array
    let chatMessages = Array.isArray(chatTexts) ? chatTexts : [];

    // Add system message as the first message in the conversation, if not present
    if (chatMessages.length === 0 || (chatMessages[0] && chatMessages[0].role !== "system")) {
        chatMessages.unshift({ role: "system", content: roleMessage });
    }

    console.log(`Sending request to OpenAI API with the following parameters:
      Endpoint: ${endpoint}
      Deployment Id: ${deploymentId}
      Messages: ${JSON.stringify(chatMessages)}
      Maximum Tokens: ${validatedTokens}
   `);

   try {
    let result = await client.getChatCompletions(deploymentId, chatMessages, { maxTokens: validatedTokens });
    //print to app log
    console.log('response from OpenAI API:', result);

    let requeryStatus = shouldRequery(result.choices[0].message.content);

    if (requeryStatus) {
        // If required, re-query the API
        for (let i = chatMessages.length - 1; i >= 0; i--) {
            if (chatMessages[i].role === "assistant") {
                chatMessages[i] = { role: "system", content: "Let me check our past conversations, one moment..." };
                break;
            }
        }
        result = await client.getChatCompletions(deploymentId, chatMessages, { maxTokens: validatedTokens });
    }
 
    console.log(`Received response from OpenAI API: ${JSON.stringify(result)}`);  
  
    return {
      'assistantResponse': result.choices[0].message.content,
      'requery': requeryStatus
    };

  } 
  catch (error) {
    console.error("An error occurred while interacting with OpenAI API", error);
    throw error;
  }
}

module.exports = chatCompletion;