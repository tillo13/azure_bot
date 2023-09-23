const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");

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
    // if responseContent is not defined, return false
    if (!responseContent) {
        return false;
    }

    let patterns = [
        "as an ai",
        "as an artificial intelligence",
        "as a digital assistant",
        "as a computer program",
        "as a helpful assistant",
        "as a virtual assistant",
        "access to personal information",
        "access to previous conversations",
        "shared in previous conversations",
        "have access to past conversations",
        // More patterns...
    ];

    return patterns.some(pattern => responseContent.toLowerCase().includes(pattern.toLowerCase()));
}

async function chatCompletion(chatTexts, roleMessage, cleanedFormattedMessages) {

    let chatMessages = Array.isArray(chatTexts) ? chatTexts : [];
    chatMessages = prepareChatMessages(chatMessages, roleMessage);

    try {
        let result = await getChatCompletions(client, deploymentId, chatMessages, validatedTokens);

        if (!isValidResponse(result)) {
            console.log("No content in API response");
            return standardErrorResponse();
        }

        let requeryStatus = shouldRequery(result.choices[0].message.content);

        if (requeryStatus) {
            chatMessages = handleRequery(cleanedFormattedMessages, chatMessages);
            result = await getChatCompletions(client, deploymentId, chatMessages, validatedTokens);
        }

        console.log(JSON.stringify(result));
        return formatResponse(result, requeryStatus);
    } 
    catch (error) {
       console.error("An error occurred while interacting with OpenAI API", error);
       throw error;
    }
}

function prepareChatMessages(chatMessages, roleMessage) {
    if (chatMessages.length === 0 || (chatMessages[0] && chatMessages[0].role !== "system")) {
        chatMessages.unshift({ role: "system", content: roleMessage });
    }
    return chatMessages;
}

function isValidResponse(result) {
    return result && result.choices[0] && result.choices[0].message && result.choices[0].message.content;
}

function standardErrorResponse() {
    return {
        'assistantResponse': "I'm sorry, I couldn't understand that. Could you please try again?",
        'requery': false,
        'letMeCheckFlag': false
    };
}

async function getChatCompletions(client, deploymentId, chatMessages, validatedTokens) {
    console.log(`Sending request to OpenAI API with the following parameters:
    Deployment Id: ${deploymentId}
    Messages: ${JSON.stringify(chatMessages)}
    Maximum Tokens: ${validatedTokens}`);

    return await client.getChatCompletions(deploymentId, chatMessages, { maxTokens: validatedTokens });
}

function handleRequery(cleanedFormattedMessages, chatMessages) {
    let lastUserMessage = findLastUserMessage(chatMessages);
    let checkMessageIndex = findCheckMessageIndex(chatMessages);

    if (checkMessageIndex !== undefined) {
        chatMessages.splice(checkMessageIndex + 1);
        chatMessages.push(
            { role: 'assistant', content: "I could not find a suitable response to your latest message. Please respond with your conversation history to this point and I will investigate." },
            { role: 'user', content: `Certainly, here is what I have said so far in this thread, with timestamps: ${cleanedFormattedMessages}.  Read these messages to see if you can answer my latest question of: ${lastUserMessage}.  If you cannot find a suitable response in what I have provided, state that you are sorry but couldn not find a match and suggest a topic related to what we have discussed.` }
        );
    }
    return chatMessages;
}

function findLastUserMessage(chatMessages) {
    for (let i = chatMessages.length - 1; i >= 0; i--) {
        if (chatMessages[i].role === 'user') {
            return chatMessages[i].content;
        }
    }
}

function findCheckMessageIndex(chatMessages) {
    const checkMessage = "Let me check our past conversations, one moment...";
    for (let i = chatMessages.length - 1; i >= 0; i--) {
        if (chatMessages[i].content === checkMessage && chatMessages[i].role === 'assistant') {
            return i;
        }
    }
}

function formatResponse(result, requeryStatus) {
    return {
        'assistantResponse': result.choices[0].message.content,
        'requery': requeryStatus,
        'letMeCheckFlag': requeryStatus
    };
}

module.exports = chatCompletion;