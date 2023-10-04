const { OpenAiClient, AzureKeyCredential } = require("@azure/openai");

const ENDPOINT = process.env.OPENAI_API_BASE_URL;
const API_KEY = process.env.OPENAI_API_KEY;
const DEPLOYMENT_ID = process.env.OPENAI_API_DEPLOYMENT;

const MAX_OPENAI_TOKENS = 400;
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

/**
 * Validates token length
 * @param {number} tokens - Token length
 * @returns {number} - Returns token only if it's valid
 */
function validateOpenAiTokens(tokens) {
  if (tokens <= 0 || tokens > 4096) {
    console.error('Invalid setting for MAX_OPENAI_TOKENS. Should be between 1 and 4096.');
    return;
  }
  return tokens;
}

/**
 * Checks requery need in response
 * @param {string} responseContent 
 * @returns {boolean}
 */
function shouldRequery(responseContent) {
  const lowerCasedResponse = responseContent.toLowerCase();
  return bot_response_patterns.some(pattern => 
    lowerCasedResponse.includes(pattern.toLowerCase())
  );
}

/**
 * Formats chat payload
 * @param {object[]} chatMessages 
 * @param {string} cleanedFormattedMessages 
 * @param {string} lastUserMessage 
 * @returns {object[]} - Returns formatted chat payload
 */
function formatChatPayload(chatMessages, cleanedFormattedMessages, lastUserMessage) {
  const checkMessage = "Let me check our past conversations, one moment...";
  const lastIndex = chatMessages.map(item => item.content).lastIndexOf(checkMessage);
  if (lastIndex > -1) {
    const assistantMsg = {
      role: 'assistant',
      content: "I could not find a suitable response to your latest message. Please respond with your conversation history..."
    };
    const userMsg = { 
      role: 'user', 
      content: `Certainly, here is what I have said so far in this thread, with timestamps: ${cleanedFormattedMessages}...`
    };
    chatMessages.push(assistantMsg, userMsg);
  }  
  return chatMessages;
}

/**
 * Initiates chat completion
 * @param {object[]} chatTexts 
 * @param {string} roleMessage 
 * @param {number} channelId 
 * @param {boolean} isActiveThread 
 * @returns {object} - Returns assistant response, requery flag and letMeCheckFlag 
 */
async function chatCompletion(chatTexts, roleMessage, channelId, isActiveThread) {
  const validatedTokens = validateOpenAiTokens(MAX_OPENAI_TOKENS);
  if(!validatedTokens) return;

  let chatMessages = Array.isArray(chatTexts) ? chatTexts : [];
  if (!chatMessages.length || chatMessages[0].role !== "system") {
    chatMessages.unshift({ role: "system", content: roleMessage });
  }
  
  const lastUserMessageObj = chatMessages.filter((msg) => msg.role === 'user').pop();
  const lastUserMessage = lastUserMessageObj ? lastUserMessageObj.content : '';
  const oldChatMessages = JSON.stringify(chatMessages);

  let newCleanChatMessages = deduplicateMessages(chatMessages);
  try {
    let result = await getCompletions(newCleanChatMessages);
    let letMeCheckFlag = false;
    if (result && result.choices[0]?.message?.content) {
      letMeCheckFlag = shouldRequery(result.choices[0].message.content);
      if (letMeCheckFlag) {
        let looped_through_payload = newCleanChatMessages
          .filter(msg => msg.role === 'user')
          .map(item => item.content).join(', ');
        
        newCleanChatMessages = formatChatPayload(newCleanChatMessages, looped_through_payload, lastUserMessage);

        if(JSON.stringify(newCleanChatMessages) !== oldChatMessages)
          console.log('\n\n!!!IMPORTANT!!!! The new payload: \n', newCleanChatMessages);
          
        result = await getCompletions(newCleanChatMessages);
      }
      return { 'assistantResponse': result.choices[0].message.content, 'requery': letMeCheckFlag, 'letMeCheckFlag': letMeCheckFlag };
    } else {
      console.log('No content in API response');
      return { 'assistantResponse': "I'm sorry, I couldn't understand.", 'requery': false, 'letMeCheckFlag': false };
    }
  } catch (error) {
    console.error(" An error occurred while interacting with OpenAI API", error);
    throw error;
  }
}

/**
 * Deduplicates messages
 * @param {object[]} chatMessages 
 * @returns {object[]} - Returns deduplicated messages
 */
function deduplicateMessages(chatMessages) {
  const newCleanChatMessages = chatMessages.filter(item => !item.content.startsWith('Certainly'));
  const certainlyMessages = chatMessages.filter(item => item.content.startsWith('Certainly'));
  if (certainlyMessages.length > 0) newCleanChatMessages.push(certainlyMessages[certainlyMessages.length - 1]);
  const seenMessages = new Set(newCleanChatMessages.map(JSON.stringify));
  newCleanChatMessages = Array.from(seenMessages).map(JSON.parse);
  return newCleanChatMessages;
}

/**
 * Fetches completions
 * @param {object[]} chatMessages 
 * @returns {object} - Returns fetch completion
 */
async function getCompletions(chatMessages) {
  const client = new OpenAiClient(ENDPOINT, new AzureKeyCredential(API_KEY));
  return await client.getChatCompletions(DEPLOYMENT_ID, chatMessages, { maxTokens: MAX_OPENAI_TOKENS });
}

module.exports = chatCompletion;