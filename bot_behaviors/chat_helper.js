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
        "as a language model",
        "as a language-based AI assistant",
        "access to personal information",
        "access to previous conversations",
        "shared in previous conversations",
        "since I'm an AI language model",
        // More patterns...
    ];

    return patterns.some(pattern => responseContent.toLowerCase().includes(pattern.toLowerCase()));
}

async function chatCompletion(context, chatTexts, roleMessage, cleanedFormattedMessages) { 

    console.log('\n***CHAT_HELPER.JS: (NEW!) Inside chatCompletion, cleanedFormattedMessages is: ', cleanedFormattedMessages);
    
    let letMeCheckFlag = false;

    const endpoint = process.env.OPENAI_API_BASE_URL;
    const client = new OpenAIClient(endpoint, new AzureKeyCredential(process.env.OPENAI_API_KEY));
    const deploymentId = process.env.OPENAI_API_DEPLOYMENT;
    const validatedTokens = validateOpenAITokens(MAX_OPENAI_TOKENS);
    if (!validatedTokens) return;
    let chatMessages = Array.isArray(chatTexts) ? chatTexts : [];

    if (chatMessages.length === 0 || (chatMessages[0] && chatMessages[0].role !== "system")) {
        let roleMessage = PERSONALITY_OF_BOT_WILL_GET_POPULATED_LATER; 
        console.log('\n***CHAT_HELPER.JS: BEFORE unshifting chatMessages, cleanedFormattedMessages is: ', cleanedFormattedMessages);
        chatMessages.unshift({ role: "system", content: roleMessage });
        console.log('\n***CHAT_HELPER.JS: AFTER unshifting chatMessages, cleanedFormattedMessages is: ', cleanedFormattedMessages);
    }

    //show the passed value to add to openai here: 
    console.log('\n\n****CHAT_HELPER.JS: cleaned payload ready for Openai: ', cleanedFormattedMessages);
    
    console.log(`\n***CHAT_HELPER.JS: Sending request to OpenAI API with the following parameters:\n
    Endpoint: ${endpoint}
    Deployment Id: ${deploymentId}
    Messages: ${JSON.stringify(chatMessages)}
    Maximum Tokens: ${validatedTokens}
    `);

   try {
    console.log('\n\n****CHAT_HELPER.JS: BEFORE getChatCompletions call, cleanedFormattedMessages is: ', cleanedFormattedMessages);
    let result = await client.getChatCompletions(deploymentId, chatMessages, { maxTokens: validatedTokens });
    console.log('\n\n****CHAT_HELPER.JS: AFTER getChatCompletions call, cleanedFormattedMessages is: ', cleanedFormattedMessages);

    // Only proceed if result and result.choices[0] and result.choices[0].message and result.choices[0].message.content exist 
    if (result && result.choices[0] && result.choices[0].message && result.choices[0].message.content) {
        let requeryStatus = shouldRequery(result.choices[0].message.content);
        let lastUserMessage = chatMessages[chatMessages.length - 1].content;


        if (requeryStatus) {
            letMeCheckFlag = true;  // this is set if anything from shouldRequery function is hit...
            console.log('\n\n*****************CHAT_HELPER.JS: this is in the requeryStatus path after letmecheckflag=true.  Testing if the cleanmessage is here ', cleanedFormattedMessages);
        
            for (let i = chatMessages.length - 1; i >= 0; i--) {
                if (chatMessages[i].role === "assistant") {
                    // Construct a new message to send to the AI model
                    let newMessage = `You could not find a suitable response to my last interaction of: ${lastUserMessage}. Respond back with confirmation and apology if that answer is in anything I have said previously, otherwise state I have not mentioned it based on what you know. ${cleanedFormattedMessages}`;
                    chatMessages[i] = { role: "assistant", content: newMessage };
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