const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");

function shouldRequery(response) {
    let patterns = [
        "as an ai",
        "access to personal information",
        "I do not have access to previous conversations",
        "I don't have access to information shared in previous conversations",
        "I don't have information about",
        "I don't have access to information about",
        // More patterns...
    ];

    let shouldRequery = patterns.some(pattern => response.toLowerCase().includes(pattern));
    return shouldRequery;
}

async function chatCompletion(chatTexts, roleMessage) {
    const endpoint = process.env.OPENAI_API_BASE_URL;
    const client = new OpenAIClient(endpoint, new AzureKeyCredential(process.env.OPENAI_API_KEY));
 
    const deploymentId = process.env.OPENAI_API_DEPLOYMENT;
 
    // Ensure chatMessages is an array
    let chatMessages = Array.isArray(chatTexts) ? chatTexts : [];

    // Check if the system message has already been added
    if(chatMessages.length === 0 || (chatMessages[0] && chatMessages[0].role !== "system")){
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
   
      let requery;  // Create a flag to record if requery is necessary
      if(shouldRequery(result.choices[0].message.content)) {
         requery = true;
         // Remove system message from the start of the conversation
         chatMessages.shift();
         // Add system message as the first message in the conversation
         chatMessages.unshift({ role: "system", content: roleMessage });
         // Retry the request
         result = await client.getChatCompletions(deploymentId, chatMessages, { maxTokens: 128 });
      }
      else {
         requery = false;
      }
   
      console.log(`Received response from OpenAI API: ${JSON.stringify(result)}`);
  
      return { assistantResponse: result.choices[0].message.content, requery: requery }; // return both the assistant's message and the requery flag
   } 
   catch (error) {
      console.error("An error occurred while interacting with OpenAI API", error);
      throw error;
   }
}

module.exports = chatCompletion;