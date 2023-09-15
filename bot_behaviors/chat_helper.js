const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");

async function chatCompletion(chatMessages, roleMessage) {
   const endpoint = process.env.OPENAI_API_BASE_URL;
   const client = new OpenAIClient(endpoint, new AzureKeyCredential(process.env.OPENAI_API_KEY));

   const deploymentId = process.env.OPENAI_API_DEPLOYMENT;

   // Add system message to the conversation history
   chatMessages.unshift({ role: "system", content: roleMessage });

   console.log(`Sending request to OpenAI API with the following parameters:
      Endpoint: ${endpoint}
      Deployment Id: ${deploymentId}
      Messages: ${JSON.stringify(chatMessages)}
   `);

   try {
      const result = await client.getChatCompletions(deploymentId, chatMessages, { maxTokens: 128 });
   
      console.log(`Received response from OpenAI API: ${JSON.stringify(result)}`);
  
      return result.choices[0].message.content;
   } 
   catch (error) {
      console.error("An error occurred while interacting with OpenAI API", error);
      throw error;
   }
}

module.exports = chatCompletion;