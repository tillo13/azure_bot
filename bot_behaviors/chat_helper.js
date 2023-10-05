const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");
const modelCosts = require('./openai_costs_2023sept7.json');


const MAX_OPENAI_TOKENS = 400;
const checkMessage = "Let me check our past conversations in this exact thread, one moment...";


function validateOpenAITokens(tokens) {
    if (tokens <= 0 || tokens > 4096) {
        console.error('Invalid setting for MAX_OPENAI_TOKENS. It should be between 1 and 4096.');
        return;
    }
    return tokens;
}

const bot_response_patterns = [
    "as an artificial intelligence",
    "as a digital assistant",
    "as a computer program",
    "as a helpful assistant",
    "as a virtual assistant",
    "as a language model",
    "access to personal information",
    "access to previous conversations",
    "shared in previous conversations",
    "have access to past conversations",
    "just a virtual assistant",
    "as a text-based AI",
    "as an AI system",
    "being a digital entity",
    "as an AI",
    "as a machine learning model",
    "as a AI assistant",
    "as a machine learning assistant",
    "access to the conversation",
    "have access to personal data",
    "not privy to that information", 
    "just a helpful assistant",
    "just an ai"
    // Include any more patterns...
];

function shouldRequery(responseContent) {
    const lowerCasedResponse = responseContent.toLowerCase();
    //console.log('\n\n***CHAT_HELPER.JS: Running shouldRequery() with responseContent:', responseContent);
    
    return bot_response_patterns.some(pattern =>
       lowerCasedResponse.includes(pattern.toLowerCase())
    );
}

function formatChatPayload(chatMessages, cleanedFormattedMessages, lastUserMessage) {
  //make this a global --> const checkMessage = "Let me check our past conversations in this exact thread, one moment....";
  const lastIndex = chatMessages.map(item => item.content).lastIndexOf(checkMessage);

  console.log('\n\n***CHAT_HELPER.JS: Value of lastIndex variable: ', lastIndex); // This will show if we're even getting here...

  if (lastIndex > -1) {
    console.log('\n\n***CHAT_HELPER.JS: Adding new response to payload');
    const newResponses = [
      {
        role: 'assistant', 
        content: `I could not find a suitable response to your latest message of: ${lastUserMessage}. Please respond with your conversation history to this point and I will investigate.`
      },
      {
        role: 'user', 
        content: `Certainly, here is what I have said so far. Here are your past conversations: ${cleanedFormattedMessages}. Based on this, can you answer this question: ${lastUserMessage}? If not, suggest a topic we have discussed already.`
      }
    ];
    console.log('New responses: ', newResponses);
    chatMessages.push(...newResponses);
  }  
  
  return chatMessages;
}














async function chatCompletion(chatTexts, roleMessage, channelId, isActiveThread) {

  console.log('\n\n***CHAT_HELPER.JS: Is the slack thread active?:', isActiveThread);
  console.log('\n\n***CHAT_HELPER.JS: The incoming payload is coming from: ', channelId);

  //console.log('\n\n***CHAT_HELPER.JS: OpenAI API Base URL: ', process.env.OPENAI_API_BASE_URL);
  //console.log('\n\n***CHAT_HELPER.JS: OpenAI API Deployment: ', process.env.OPENAI_API_DEPLOYMENT);

  ///test dalle items showing in .env
  //console.log('\n\n***CHAT_HELPER.JS: OpenAI DallE API Base URL: ', process.env.OPENAI_DALLE_BASE_URL);
  //console.log('\n\n***CHAT_HELPER.JS: OpenAI DallE API Deployment: ', process.env.OPENAI_DALLE_VERSION);



    const endpoint = process.env.OPENAI_API_BASE_URL;
    const client = new OpenAIClient(endpoint, new AzureKeyCredential(process.env.OPENAI_API_KEY));
    const deploymentId = process.env.OPENAI_API_DEPLOYMENT;
    const validatedTokens = validateOpenAITokens(MAX_OPENAI_TOKENS);
    if(!validatedTokens) return;

    let chatMessages = Array.isArray(chatTexts) ? chatTexts : [];

    if (!chatMessages.length || chatMessages[0].role !== "system") {
        chatMessages.unshift({ role: "system", content: roleMessage });
    }
// Fetch the last user message before calling `formatChatPayload`
const lastUserMessageObj = chatMessages.filter((msg) => msg.role === 'user').pop();
const lastUserMessage = lastUserMessageObj ? lastUserMessageObj.content : '';

// Print out the user messages so far via chat messages
const userMessages = chatMessages.filter((msg) => msg.role === 'user');
console.log('\n\n***CHAT_HELPER.JS -> Only USER messages so far via chatmessages:\n');
userMessages.forEach((msg, index) => {
    console.log(`\n${index + 1}. ${msg.content}\n`);
});

console.log('\n\n***CHAT_HELPER.JS -> Entire conversation so far via chatmessages:\n');
chatMessages.forEach((msg, index) => {
  const role = msg.role.toUpperCase();
  console.log(`\n${index + 1}. ${role} : ${msg.content}\n`);
});

// Count cleaned messages first
const oldChatMessages = JSON.stringify(chatMessages);

// Separate out each kind of message
let newCleanChatMessages = chatMessages.filter(item => 
  !item.content.toLowerCase().startsWith('certainly, here is what I have said so far'));

// More efficient deduplication by converting to JSON (prevents issues with object references)
let seenMessages = new Set(newCleanChatMessages.map(JSON.stringify)); 

// Remove duplicate messages
newCleanChatMessages = Array.from(seenMessages).map(JSON.parse); 

// Fetch the certainlyMessages from the **newCleanChatMessages**
const certainlyMessages = newCleanChatMessages.filter(item => item.content.startsWith('Certainly, here is what I have said so far'));

// How many duplicates were removed
const duplicatesRemoved = oldChatMessages.length - newCleanChatMessages.length;

if (duplicatesRemoved > 0) {
    console.log(`\n\n***CHAT_HELPER.JS: CLEANED CODE OF THIS MANY character DUPLICATES: ${duplicatesRemoved}`);
    
    if (certainlyMessages.length > 0) {
      // If there are any 'Certainly' messages, only keep the last one
      newCleanChatMessages.push(certainlyMessages[certainlyMessages.length - 1]);
    }
}

// Start interacting with OpenAI
try {
  //console.log('\n\n***CHAT_HELPER.JS: Most up to date payload before sending to OpenAI: ', newCleanChatMessages);
  let result = await client.getChatCompletions(deploymentId, newCleanChatMessages, { maxTokens: validatedTokens });
  
  if (result && result.choices[0]?.message?.content) {
    // Check if assistant wants to requery message
    let letMeCheckFlag = shouldRequery(result.choices[0].message.content);
    let assistantResponse = result.choices[0].message.content;
    
    // Add the assistant response to newCleanChatMessages array
    newCleanChatMessages.push({ role: 'assistant', content: assistantResponse });

    console.log('\n\n***CHAT_HELPER.JS: Most up to date payload after receiving back from OpenAI: ', newCleanChatMessages);

    // This is where we're going to add the code for cost calculation
    // Prices per token for GPT-3.5 Turbo and GPT-4
    const turboCostPerToken = modelCosts['Language Models']['GPT-3.5 Turbo']['4K context']['Output'];
    const gpt4CostPerToken = modelCosts['Language Models']['GPT-4']['8K context']['Output'];

    // Get total tokens used so far
    let totalTokens = result.usage.totalTokens;
    

    // Calculate costs thus far of the transaction
    let turboCost = (totalTokens / 1000) * turboCostPerToken;
    let gpt4Cost = (totalTokens / 1000) * gpt4CostPerToken;

    // Function to format cost
    function formatCost(cost) {
      // Convert cost to string
      let costStr = cost.toString();

      // Split costStr at decimal point
      let [_, frac] = costStr.split('.');

      // Find index of first non-zero digit in frac
      let firstNonZeroIndex = [...frac].findIndex(char => char !== '0');

      // Calculate n
      let n = firstNonZeroIndex + 3;

      // Return cost formatted to n decimal places
      return `$${cost.toFixed(n)}`;
    }

    console.log('\n\n***CHAT_HELPER.JS: Total tokens used so far in this chat:', totalTokens);
    console.log('\n\n***CHAT_HELPER.JS: If GPT-3.5 Turbo, the cost is:', formatCost(turboCost));
    console.log('\n\n***CHAT_HELPER.JS: if GPT-4, the cost is:', formatCost(gpt4Cost));

    if (letMeCheckFlag) {
      console.log('\n\n***CHAT_HELPER.JS: Entered the letMeCheckFlag "true" condition.');
      if(newCleanChatMessages[newCleanChatMessages.length - 1].content !== checkMessage) { 
        let newPayload = newCleanChatMessages.filter(item => !item.content.startsWith('Certainly')); 
        let uniquePayload = new Set(newCleanChatMessages.map(JSON.stringify)); 
        newCleanChatMessages = Array.from(uniquePayload).map(JSON.parse); 

        if(newCleanChatMessages[newCleanChatMessages.length - 1].content !== checkMessage) { 
          console.log('\n\n***CHAT_HELPER.JS: Adding new response to payload');
          const newResponses = [
            {
              role: 'assistant',
              content: `Let me check our past conversations in this exact thread, one moment...`
            },
          ];
          console.log('New responses: ', newResponses);
          newCleanChatMessages.push(...newResponses);

      console.log("\n\n***CHAT_HELPER.JS: 'Let me check our past conversations...' added to newCleanChatMessages since it's not present in previous message");
      } else {
        console.log("\n\n***CHAT_HELPER.JS: 'Let me check our past conversations...' detected in previous message, not adding it to newCleanChatMessages");
      }

      let looped_through_newCleanChatMessages = newCleanChatMessages.filter(msg => msg.role === 'user').map(item => item.content).join(',');
      newCleanChatMessages = formatChatPayload(newCleanChatMessages, looped_through_newCleanChatMessages, lastUserMessage); 
      //console.log('\n\n***CHAT_HELPER.JS: After running formatChatPayload(), newCleanChatMessages is now: ', newCleanChatMessages); 

      if(JSON.stringify(newCleanChatMessages) !== oldChatMessages) { 
        //console.log('\n\n***CHAT_HELPER.JS: The newCleanChatMessages before and after running formatChatPayload() are different. The newCleanChatMessages after re-formatting is now: ', newCleanChatMessages);
      }

      try {
        //console.log('\n\n***CHAT_HELPER.JS: Most up to date payload before sending to OpenAI after restructure: ', newCleanChatMessages); 
        result = await client.getChatCompletions(deploymentId, newCleanChatMessages, { maxTokens: validatedTokens }); 
        //console.log("\n\n***CHAT_HELPER.JS: The response from the secondary request to OpenAI is ", result);
        console.log('\n\n***CHAT_HELPER.JS: Most up to date payload after receiving back from OpenAI after restructure: ', newCleanChatMessages);

        
      } catch (error) {
        console.error("\n\n***CHAT_HELPER.JS: An error occurred during the secondary request to OpenAI ", error);
        throw error;
      }
    }
  } 
  console.log('\n\n***CHAT_HELPER.JS: Response from OpenAI API:\n', JSON.stringify(result));
  console.log('\n\n***CHAT_HELPER.JS: letMeCheckFlag is: ', letMeCheckFlag);
  console.log('\n\n***CHAT_HELPER.JS: Is the response from chatGPT including one of the [bot_response] patterns?', bot_response_patterns.some(pattern => result.choices[0].message.content.toLowerCase().includes(pattern.toLowerCase())));

  // Send response back
  return {
    'assistantResponse': result.choices[0].message.content,
    'requery': letMeCheckFlag,
    'letMeCheckFlag': letMeCheckFlag,
    'chats': newCleanChatMessages
  };
} else {
  console.log('\n\n***CHAT_HELPER.JS: No content in API response');
  return {
    'assistantResponse': "I'm sorry, I couldn't understand that. Could you please try again?",
    'requery': false,
    'letMeCheckFlag': false,
    'chats': newCleanChatMessages
  };
}
} catch (error) {
console.error("\n\n***CHAT_HELPER.JS:An error occurred while interacting with OpenAI API", error);
throw error;
}}
module.exports = chatCompletion;