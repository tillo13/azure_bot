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
        "just a virtual assistant",
        "as a text-based AI",
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
    console.log('\n\n****CHAT_HELPER.JS: looks to be undefined or blank still!');
} else {
    console.log('\n\n**********CHAT_HELPER.JS:******** PAYLOAD1 HIT:\n\n ', cleanedFormattedMessages);
    console.log('\n\n****CHAT_HELPER.JS: the payload we want to add to is:\n\n ', chatMessages);

    let lastUserMessage;
    for (let i = chatMessages.length - 1; i >= 0; i--) {
      if (chatMessages[i].role === 'user') {
        lastUserMessage = chatMessages[i].content;
        break;
      }
    }
    
    // find the index of the latest 'let me check' from the end of the convo to replace it...
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

    console.log('\n\n****CHAT_HELPER.JS: the payload1 we added to is now:\n\n ', chatMessages);
}

    console.log(`\n***CHAT_HELPER.JS: Sending request to OpenAI API with the following parameters:\n
    Endpoint: ${endpoint}
    Deployment Id: ${deploymentId}
    Messages: ${JSON.stringify(chatMessages)}
    Maximum Tokens: ${validatedTokens}
    `);

    try {
        // Check if parent has @bot or @atbot, if not, return
        let parentMessage = chatMessages[0] && chatMessages[0].content;
        if (parentMessage && !(parentMessage.includes('@bot') || parentMessage.includes('@atbot'))) {
            console.log('THIS MESSAGE FROM SLACK SPECIFICALLY DID NOT HAVE AN @BOT OR @ATBOT CALL IN PARENT MESSAGE, SO WILL NOT SEND ON TO OPENAI...');
            return;
        }

        // Make the request to OpenAI
        let result = await client.getChatCompletions(deploymentId, chatMessages, { maxTokens: validatedTokens });

    // Only proceed if result and result.choices[0] and result.choices[0].message and result.choices[0].message.content exist 
    if (result && result.choices[0] && result.choices[0].message && result.choices[0].message.content) {
        let requeryStatus = shouldRequery(result.choices[0].message.content);

        if (requeryStatus) {
            letMeCheckFlag = true;  // this is set if anything from shouldRequery function is hit...

            /* Start of loop code block */
            let looped_through_payload = '';
            for (let i = chatMessages.length - 1; i >= 0; i--) {
                if (
                    chatMessages[i].role === 'user' &&
                    !chatMessages[i].content.startsWith("Certainly, here is what I have said")
                ) {
                    looped_through_payload = chatMessages[i].content + ', ' + looped_through_payload;
                }
            }
            /* End of loop code block */

            // removes trailing comma and space, gross, but dont have access to cleanedFormattedMessages here...:
            looped_through_payload = looped_through_payload.replace(/,\s*$/, "");
        
            for (let i = chatMessages.length - 1; i >= 0; i--) {
                if (chatMessages[i].role === "assistant") {
                    chatMessages[i] = { role: "assistant", content: "Let me check our past conversations, one moment..." };
                    break;
                }
            }
        ///copied from path above...
            let lastUserMessage;
            for (let i = chatMessages.length - 1; i >= 0; i--) {
              if (chatMessages[i].role === 'user') {
                lastUserMessage = chatMessages[i].content;
                break;
              }
            }
            
            // find the index of the latest 'let me check' from the end of the convo to replace it...
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
                    { role: 'user', content: `Certainly, here is what I have said so far in this thread, with timestamps: ${looped_through_payload}.  Read these messages to see if you can answer my latest question of: ${lastUserMessage}.  If you cannot find a suitable response in what I have provided, state that you are sorry but couldn not find a match and suggest a topic related to what we have discussed.` }
                );
            }
            console.log('\n\n****CHAT_HELPER.JS: the payload2 we added to is now:\n\n ', chatMessages);

            // Check if parent has @bot or @atbot, if not, return
            let parentMessage = chatMessages[0] && chatMessages[0].content;
            if (parentMessage && !(parentMessage.includes('@bot') || parentMessage.includes('@atbot'))) {
                console.log('THIS MESSAGE FROM SLACK SPECIFICALLY DID NOT HAVE AN @BOT OR @ATBOT CALL IN THE PARENT MESSAGE, SO WILL NOT SEND ON TO OPENAI...');
                return;
            }
            //send to openai
            result = await client.getChatCompletions(deploymentId, chatMessages, { maxTokens: validatedTokens });
        }
        console.log('\n\n\n' + '******CHAT_HELPER.JS: Response in letmecheckflag path from OpenAI API:\n');
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