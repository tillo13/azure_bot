const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");

const MAX_OPENAI_TOKENS = 400;

function validateOpenAITokens(tokens) {
    if (tokens <= 0 || tokens > 4096) {
        console.error('Invalid setting for MAX_OPENAI_TOKENS. It should be between 1 and 4096.');
        return;
    }
    return tokens;
}

const bot_response_patterns = ["as an", "artificial intelligence", "digital assistant", "computer program", "helpful assistant", 
"virtual assistant", "access to", "previous conversations", "shared in", "past conversations", "just a", "text-based AI"];
const bot_response_patternsRegex = new RegExp('\\b(' + bot_response_patterns.join('..*|') + '..*)\\b', 'gmi');

function shouldRequery(responseContent) {
    return responseContent && bot_response_patternsRegex.test(responseContent);
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

async function chatCompletion(chatTexts, roleMessage, cleanedFormattedMessages) {

    const endpoint = process.env.OPENAI_API_BASE_URL;
    const client = new OpenAIClient(endpoint, new AzureKeyCredential(process.env.OPENAI_API_KEY));
    const deploymentId = process.env.OPENAI_API_DEPLOYMENT;
    const validatedTokens = validateOpenAITokens(MAX_OPENAI_TOKENS);
    if (!validatedTokens) return;

    let chatMessages = Array.isArray(chatTexts) ? chatTexts : [];

    if (!chatMessages.length || chatMessages[0].role !== "system") {
        chatMessages.unshift({ role: "system", content: roleMessage });
    }

    const lastUserMessageObj = chatMessages.find((msg, index) => msg.role === 'user' && index > chatMessages.map(item => item.content).lastIndexOf("Let me check our past conversations, one moment..."));
    
    const lastUserMessage = lastUserMessageObj ? lastUserMessageObj.content : '';
    
    if(cleanedFormattedMessages)
        chatMessages = formatChatPayload(chatMessages, cleanedFormattedMessages, lastUserMessage);

            // Extrapolate user messages and log them
            let userMessages = chatMessages.filter(msg => msg.role === 'user' && msg.content !== lastUserMessage);
            let messagePayload = userMessages.map((msg, index) => `${index + 1}. ${msg.content}`).join(", ");
            console.log(`\n\n****CHAT_HELPER.JS: EXTRAPOLATED USER MESSAGES: ${messagePayload}`);

        console.log('\n\n*****CHAT_HELPER.JS: *** Sending request to OpenAI API with payload:', chatMessages);
    
        const oldChatMessages = JSON.stringify(chatMessages);
        try {
            let result = await client.getChatCompletions(deploymentId, chatMessages, { maxTokens: validatedTokens });
            if (result && result.choices[0]?.message?.content) {
                let letMeCheckFlag = shouldRequery(result.choices[0].message.content);
                if (letMeCheckFlag) {
                    let looped_through_payload = chatMessages.filter(msg => msg.role === 'user').map(item => item.content).join(', ');
                    chatMessages = formatChatPayload(chatMessages, looped_through_payload, lastUserMessage);
                    if(JSON.stringify(chatMessages) !== oldChatMessages)
                        console.log('\n\n&&&&CHAT_HELPER.JS: *** !Updated payload!!:', chatMessages);
                    result = await client.getChatCompletions(deploymentId, chatMessages, { maxTokens: validatedTokens });
                }
            console.log('\n\n*****CHAT_HELPER.JS: *** Response from OpenAI API:\n', JSON.stringify(result));
            console.log('\n\n*****CHAT_HELPER.JS: *** letMeCheckFlag is: ', letMeCheckFlag);
return {
    'assistantResponse': result.choices[0].message.content,
    'requery': letMeCheckFlag,
    'letMeCheckFlag': letMeCheckFlag
};
} else {
    console.log('\n\n*****CHAT_HELPER.JS: ***No content in API response');
return {
    'assistantResponse': "I'm sorry, I couldn't understand that. Could you please try again?",
    'requery': false,
    'letMeCheckFlag': false
};
}
} catch (error) {
console.error("\n\n*****CHAT_HELPER.JS:An error occurred while interacting with OpenAI API", error);
throw error;
}
}

module.exports = chatCompletion;