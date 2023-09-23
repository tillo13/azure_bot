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
    //console.log('\n***CHAT_HELPER.JS: chatCompletion only', chatTexts);
    
    let letMeCheckFlag = false;

    const endpoint = process.env.OPENAI_API_BASE_URL;
    const client = new OpenAIClient(endpoint, new AzureKeyCredential(process.env.OPENAI_API_KEY));
    const deploymentId = process.env.OPENAI_API_DEPLOYMENT;
    const validatedTokens = validateOpenAITokens(MAX_OPENAI_TOKENS);
    if (!validatedTokens) return;
    let chatMessages = Array.isArray(chatTexts) ? chatTexts : [];

    if (chatMessages.length === 0 || (chatMessages[0] && chatMessages[0].role !== "system")) {
        chatMessages.unshift({ role: "system", content: roleMessage });
    }

//show the passed value to add to openai here: 
console.log('\n\n****CHAT_HELPER.JS: this will be undefined if the letmecheckflag is false: ', cleanedFormattedMessages);

if (!cleanedFormattedMessages || cleanedFormattedMessages.trim() === "") {
    console.log('****CHAT_HELPER.JS: NO PAYLOAD');
} else {
    console.log('\n\n**********CHAT_HELPER.JS:******** PAYLOAD HIT:\n\n ', cleanedFormattedMessages);
    console.log('\n\n****CHAT_HELPER.JS: the payload we want to add to is:\n\n ', chatMessages);

    let lastUserMessage;
    for (let i = chatMessages.length - 1; i >= 0; i--) {
      if (chatMessages[i].role === 'user') {
        lastUserMessage = chatMessages[i].content;
        break;
      }
    }
    
    // find the index of the latest 'let me check' from the end
    const checkMessage = "Let me check our past conversations, one moment...";
    let lastIndex;
    for (let i = chatMessages.length - 1; i >= 0; i--) {
        if (chatMessages[i].content === checkMessage && chatMessages[i].role === 'assistant') {
            lastIndex = i;
            break;
        }
    }
    
    // if check message found, remove all messages after it and add new messages
    if (lastIndex !== undefined) {
        chatMessages.splice(lastIndex + 1);
        chatMessages.push(
            { role: 'assistant', content: "I could not find a suitable response to your latest message. Please respond with your conversation history to this point and I will investigate." },
            { role: 'user', content: `Certainly, here is what I have said so far in this thread, with timestamps: ${cleanedFormattedMessages}.  Read these messages to see if you can answer my latest question of: ${lastUserMessage}.  If you cannot find a suitable response in what I have provided, state that you are sorry but couldn not find a match and suggest a topic related to what we have discussed.` }
        );
    }

    console.log('\n\n****CHAT_HELPER.JS: the payload we added to is now:\n\n ', chatMessages);
}

    console.log(`\n***CHAT_HELPER.JS: Sending request to OpenAI API with the following parameters:\n
    Endpoint: ${endpoint}
    Deployment Id: ${deploymentId}
    Messages: ${JSON.stringify(chatMessages)}
    Maximum Tokens: ${validatedTokens}
    `);

   try {
    let result = await client.getChatCompletions(deploymentId, chatMessages, { maxTokens: validatedTokens });

    // Only proceed if result and result.choices[0] and result.choices[0].message and result.choices[0].message.content exist 
    if (result && result.choices[0] && result.choices[0].message && result.choices[0].message.content) {
        let requeryStatus = shouldRequery(result.choices[0].message.content);

        if (requeryStatus) {
            letMeCheckFlag = true;  // this is set if anything from shouldRequery function is hit...
        
            for (let i = chatMessages.length - 1; i >= 0; i--) {
                if (chatMessages[i].role === "assistant") {
                    chatMessages[i] = { role: "assistant", content: "Let me check our past conversations, one moment..." };
                    break;
                }
            }
        
            result = await client.getChatCompletions(deploymentId, chatMessages, { maxTokens: validatedTokens });
        }
        // split this into 2 lines: console.log(`\n\n\n***CHAT_HELPER.JS: Response from OpenAI API:\n ${JSON.stringify(result)}`);
        console.log('\n\n\n' + '***CHAT_HELPER.JS: Response from OpenAI API:' + '\n');
        console.log(JSON.stringify(result));


        console.log('\n***CHAT_HELPER.JS: letMeCheckFlag is: ', letMeCheckFlag);
        return {
            'assistantResponse': result.choices[0].message.content,
            'requery': requeryStatus,
            'letMeCheckFlag': letMeCheckFlag
        };
    } else {
        console.log("No content in API response");
        return {
            'assistantResponse': "I'm sorry, I couldn't understand that. Could you please try again?",
            'requery': false,
            'letMeCheckFlag': letMeCheckFlag
        };
    }
} 
catch (error) {
   console.error("An error occurred while interacting with OpenAI API", error);
   throw error;
}
}

module.exports = chatCompletion;