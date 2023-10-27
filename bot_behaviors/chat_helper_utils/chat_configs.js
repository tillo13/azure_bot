const MAX_TOKENS = 4096;

const validateOpenAITokens = (tokens) => {
    const isValid = tokens > 0 && tokens <= MAX_TOKENS;    
    console.log(`\n\nCHAT_CONFIGS.JS: Token count: ${tokens}, is valid: ${isValid}`);

    if (!isValid) {
        console.error('\n\nCHAT_CONFIGS.JS: Invalid setting for MAX_OPENAI_TOKENS. It should be between 1 and ${MAX_TOKENS}.');
        return;
    }
    return tokens;
};

const formatChatPayload = (chatMessages, cleanedFormattedMessages, lastUserMessage) => {
    const checkMessage = "Let me check our past conversations in this exact thread, one moment....";
    const lastIndex = chatMessages.map(item => item.content).lastIndexOf(checkMessage);
    console.log('\n\n***CHAT_CONFIGS.JS: Value of lastIndex variable: ', lastIndex);

	if (lastIndex > -1) {
		const newResponses = buildNewResponses(lastUserMessage, cleanedFormattedMessages);
		chatMessages.push(...newResponses);
	}
	return chatMessages;
};

//isolating function for building response
const buildNewResponses = (lastUserMessage, cleanedFormattedMessages) => [
	{
		role: 'assistant',
		content: `I could not find a suitable response to your latest message of: ${lastUserMessage}. Please respond with your conversation history to this point and I will investigate.`
	},
	{
		role: 'user',
		content: `Certainly, here is what I have said so far. Here are your past conversations: ${cleanedFormattedMessages}. Based on this, can you answer this question: ${lastUserMessage}? If not, suggest a topic we have discussed already.`
	}
];

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
].map(pattern => pattern.toLowerCase()); //convert all patterns to lower case once

const shouldRequery = (responseContent) => {
	const lowerCasedResponse = responseContent.toLowerCase();
	return bot_response_patterns.some(pattern => lowerCasedResponse.includes(pattern));
};

module.exports = {
	validateOpenAITokens,
	shouldRequery,
	formatChatPayload
	//...other exports...
};