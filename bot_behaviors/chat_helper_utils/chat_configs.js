function validateOpenAITokens(tokens) {
    let isValid = tokens > 0 && tokens <= 4096;
    
    // log the token count and if they are valid
    console.log(`\n\nCHAT_CONFIGS.JS: Token count: ${tokens}, is valid: ${isValid}`);

    if (!isValid) {
      console.error('\n\nCHAT_CONFIGS.JS: Invalid setting for MAX_OPENAI_TOKENS. It should be between 1 and 4096.');
      return;
    }

    return tokens;
}

function formatChatPayload(chatMessages, cleanedFormattedMessages, lastUserMessage) {
	//make this a global --> const checkMessage = "Let me check our past conversations in this exact thread, one moment....";
	const lastIndex = chatMessages.map(item => item.content).lastIndexOf(checkMessage);

	//DEBUG_PATH: console.log('\n\n***CHAT_HELPER.JS: Value of lastIndex variable: ', lastIndex); // This will show if we're even getting here...

	if (lastIndex > -1) {
		//DEBUG_PATH: console.log('\n\n***CHAT_HELPER.JS: Adding new response to payload');
		const newResponses = [{
				role: 'assistant',
				content: `I could not find a suitable response to your latest message of: ${lastUserMessage}. Please respond with your conversation history to this point and I will investigate.`
			},
			{
				role: 'user',
				content: `Certainly, here is what I have said so far. Here are your past conversations: ${cleanedFormattedMessages}. Based on this, can you answer this question: ${lastUserMessage}? If not, suggest a topic we have discussed already.`
			}
		];
		//DEBUG_PATH: console.log('New responses: ', newResponses);
		chatMessages.push(...newResponses);
	}

	return chatMessages;
}

function shouldRequery(responseContent) {
	const lowerCasedResponse = responseContent.toLowerCase();
	//console.log('\n\n***CHAT_HELPER.JS: Running shouldRequery() with responseContent:', responseContent);

	return bot_response_patterns.some(pattern =>
		lowerCasedResponse.includes(pattern.toLowerCase())
	);
}

module.exports = {
    validateOpenAITokens,
    shouldRequery,
    formatChatPayload,
    //frustrationCounter,
    //formatCost
    // ...add other functions here as needed...
};