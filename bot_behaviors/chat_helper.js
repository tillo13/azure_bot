const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");

const MAX_OPENAI_TOKENS = 400;

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
    "just a helpful assistant"   
    // Include any more patterns...
];

function shouldRequery(responseContent) {
    const lowerCasedResponse = responseContent.toLowerCase();
    
    return bot_response_patterns.some(pattern =>
       lowerCasedResponse.includes(pattern.toLowerCase())
    );
}

function formatChatPayload(chatMessages, cleanedFormattedMessages, lastUserMessage) {

    const checkMessage = "Let me check our past conversations, one moment...";
    const lastIndex = chatMessages.map(item => item.content).lastIndexOf(checkMessage);

    if (lastIndex > -1) {
        chatMessages.push(
            { role: 'assistant', content: "I could not find a suitable response to your latest message. Please respond with your conversation history to this point and I will investigate." },
            { role: 'user', content: `Certainly, here is what I have said so far in this thread, with timestamps: ${cleanedFormattedMessages}.  Read these messages to see if you can answer my latest question of: ${lastUserMessage}.  If you cannot find a suitable response in what I have provided, state that you are sorry but couldn not find a match and suggest a topic related to what we have discussed.` }
        );
    }  
    return chatMessages;
}

async function chatCompletion(chatTexts, roleMessage, channelId, isActiveThread) {

  console.log('\n\n***CHAT_HELPER.JS: Is the slack thread active?:', isActiveThread);
  console.log('\n\n***CHAT_HELPER.JS: The incoming payload is coming from: ', channelId);

  console.log('\n\n***CHAT_HELPER.JS: OpenAI API Base URL: ', process.env.OPENAI_API_BASE_URL);
  console.log('\n\n***CHAT_HELPER.JS: OpenAI API Deployment: ', process.env.OPENAI_API_DEPLOYMENT);
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
console.log('\n\n***CHAT_HELPER.JS -> USER MESSAGES SO FAR via chatmessages:\n');
userMessages.forEach((msg, index) => {
    console.log(`\n${index + 1}. ${msg.content}\n`);
});

const oldChatMessages = JSON.stringify(chatMessages);

// Track original length of conversation
const originalLength = chatMessages.length;

// Separate out each kind of message
let newCleanChatMessages = chatMessages.filter(item => !item.content.startsWith('Certainly, here is what I have said so far'));
console.log('\n\n***CHAT_HELPER.JS: Sending Payload to OpenAI via first call: ', newCleanChatMessages);

const certainlyMessages = chatMessages.filter(item => item.content.startsWith('Certainly, here is what I have said so far'));

if (certainlyMessages.length > 0) {
  // If there are any 'Certainly' messages, only keep the last one
  newCleanChatMessages.push(certainlyMessages[certainlyMessages.length - 1]);
}

// More efficient deduplication by converting to JSON (prevents issues with object references)
let seenMessages = new Set(newCleanChatMessages.map(JSON.stringify));

// Remove duplicate messages
newCleanChatMessages = Array.from(seenMessages).map(JSON.parse);

// How many duplicates were removed
const duplicatesRemoved = originalLength - newCleanChatMessages.length;

if (duplicatesRemoved > 0) {
  console.log(`\n\n***CHAT_HELPER.JS: CLEANED CODE OF THIS MANY DUPLICATES: ${duplicatesRemoved}`);
  console.log('\n\n***CHAT_HELPER.JS: AFTER DUPLICATES REMOVED, CLEANED PAYLOAD: \n', newCleanChatMessages);
} else {
  console.log('\n\n***CHAT_HELPER.JS: CLEAN PAYLOAD, NO DUPLICATION.');
}

// Start interacting with OpenAI
try {
  let result = await client.getChatCompletions(deploymentId, newCleanChatMessages, { maxTokens: validatedTokens });

  if (result && result.choices[0]?.message?.content) {
    // Check if assistant wants to requery message
    let letMeCheckFlag = shouldRequery(result.choices[0].message.content);

    if (letMeCheckFlag) {
      // If so, update payload and requery
      let looped_through_payload = newCleanChatMessages.filter(msg => msg.role === 'user').map(item => item.content).join(', ');
      newCleanChatMessages = formatChatPayload(newCleanChatMessages, looped_through_payload, lastUserMessage);
      console.log('\n\n***CHAT_HELPER.JS: Sending Payload to OpenAI via 2nd branch: ', newCleanChatMessages);


      if(JSON.stringify(newCleanChatMessages) !== oldChatMessages)
        console.log('\n\n!!!IMPORTANT!!!! CHAT_HELPER.JS: *** Payload was updated after removing duplicates. This was triggered by the letMeCheckFlag from the handleSlackMessage() function in slack.js. The new payload: \n', newCleanChatMessages);

      result = await client.getChatCompletions(deploymentId, newCleanChatMessages, { maxTokens: validatedTokens });
    }

    console.log('\n\n***CHAT_HELPER.JS: Response from OpenAI API:\n', JSON.stringify(result));
    console.log('\n\n***CHAT_HELPER.JS: letMeCheckFlag is: ', letMeCheckFlag);

    // Send response back
    return {
      'assistantResponse': result.choices[0].message.content,
      'requery': letMeCheckFlag,
      'letMeCheckFlag': letMeCheckFlag
    };
  } else {
    console.log('\n\n***CHAT_HELPER.JS: No content in API response');
    return {
      'assistantResponse': "I'm sorry, I couldn't understand that. Could you please try again?",
      'requery': false,
      'letMeCheckFlag': false
    };
  }
} catch (error) {
  console.error("\n\n***CHAT_HELPER.JS:An error occurred while interacting with OpenAI API", error);
  throw error;
}
        }
module.exports = chatCompletion;