const modelCosts = require('./openai_costs_2023sept7.json'); 


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
const buildNewResponses = (lastUserMessage, cleanedFormattedMessages) => [{
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
    console.log('\n\n***CHAT_CONFIG.JS: Running shouldRequery() with responseContent:', responseContent);
    return bot_response_patterns.some(pattern => lowerCasedResponse.includes(pattern));
};

// Define the frustrationCounter function
const frustrationPrompts = [
    "you're not getting it",
    "you don't understand",
    "no",
    "not right",
    "incorrect",
    "wrong",
    "that's not correct",
    "try again",
    "you're not listening",
    "you're missing the point",
    "you're off the mark",
    "that's not right",
    "you're not making sense",
    "I didn't ask for this",
    "that doesn't help",
    "you're misunderstanding",
    "stop wasting my time",
    "you're clueless",
    "you're not helping",
    "this is frustrating"
    // Add more phrases as required...
];

function frustrationCounter(userMessage) {
    let frustrationCount = 0; // Initialize the variable
    const lowerCasedMessageWords = userMessage.toLowerCase().split(' ');

    for (let prompt of frustrationPrompts) {
        if (lowerCasedMessageWords.includes(prompt.toLowerCase())) {
            frustrationCount++;
            console.log(`\n\n***CHAT_CONFIGS.JS: FRUSTRATION COUNT prior to incoming message: ${frustrationCount}`);
            break;
        }
    }
    return frustrationCount;
}

function handleFrustration(frustrationCount) {
    if (frustrationCount === 3) {
        console.log("\n\n***CHAT_CONFIGS.JS: User has hit the Frustration Counter. Sending them a custom message...");
        const responseMessage = "It appears we've let you down. :sad_panda:\nYou've hit our fancy(?) frustrationCounter max of 3. I'm sorry, please consider typing `$idea` [and your issue here] and we'll have someone take a look at what is causing said frustration!";
        console.log("\n\n***CHAT_CONFIGS.JS: Sent the following message to the user:", responseMessage);
        return responseMessage;
    }
    return null;
}

function calculateCost(totalTokens) {
    const turboCostPerToken = modelCosts['Language Models']['GPT-3.5 Turbo']['4K context']['Output'];
    const gpt4CostPerToken = modelCosts['Language Models']['GPT-4']['8K context']['Output'];

    let turboCost = (totalTokens / 1000) * turboCostPerToken;
    let gpt4Cost = (totalTokens / 1000) * gpt4CostPerToken;

    console.log('\n\n***CHAT_CONFIGS.JS: Total tokens used so far in this chat:', totalTokens);
    console.log('\n\n***CHAT_CONFIGS.JS: If GPT-3.5 Turbo, the cost is:', formatCost(turboCost));
    console.log('\n\n***CHAT_CONFIGS.JS: if GPT-4, the cost is:', formatCost(gpt4Cost));

    return { turboCost, gpt4Cost };
}
// now format the cost it just calculated...
function formatCost(cost) {
    // Convert cost to string
    let costStr = cost.toString();

    // Split costStr at decimal point
    let [_, frac] = costStr.split('.');

    // Find index of first non-zero digit in frac
    let firstNonZeroIndex = [...frac].findIndex(char => char !== '0');

    // Calculate n
    let n = firstNonZeroIndex + 3;

    // Print n to console
    console.log("\n\nCHAT_CONFIGS.JS: Number of decimal places in formatCost:", n);

    // Return cost formatted to n decimal places
    return `$${cost.toFixed(n)}`;
}

module.exports = {
    validateOpenAITokens,
    shouldRequery,
    formatChatPayload,
    frustrationCounter,
    handleFrustration,
    formatCost,
    calculateCost
    //...other exports...
};