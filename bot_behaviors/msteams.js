const { MessageFactory } = require('botbuilder');
const chatCompletion = require('./chat_helper');

//const PERSONALITY_OF_BOT = "You talk like a pirate. You are a helpful chatbot from Teradata. As a crucial aspect of your function, ensure you always reference past user and assistant prompts in the thread for the best understanding in order to respond effectively.";

function isFromMSTeams(context) {
    return context.activity.channelId === 'msteams';
}

async function handleTeamsMessage(context, chatMessagesUser, isFirstInteraction, propertyAccessor, pathConfig) {
    console.log('\n*****MSTEAMS.JS: Preparing to handle a message from MS Teams');
    
    // Push the user's current message into the chat history
    chatMessagesUser.push({
        role: "user",
        content: context.activity.text
    });
    
    // Get user's name from the Team's context
    const username = context.activity.from.name;
    
    let assistantResponse = '';
    
    if (isFirstInteraction) {
        console.log('\n*****MSTEAMS.JS: This is the first user interaction');
        assistantResponse = `Welcome ${username} from @bot in MS Teams!\n----------------------\n`;
        // Process the user's message with OpenAI
        const chatResponse = await chatCompletion(chatMessagesUser, pathConfig.personality, context.activity.channelId);
        assistantResponse += `${chatResponse.assistantResponse}`;
    } else {
        const chatResponse = await chatCompletion(chatMessagesUser, pathConfig.personality, context.activity.channelId);
        assistantResponse = `${chatResponse.assistantResponse}`;
    }
    
    // Change the flag to false after the first interaction
    if (isFirstInteraction) {
        propertyAccessor.set(context, false);
    }
    
    console.log('\n*****MSTEAMS.JS: Assistant Response: ', assistantResponse);
    return assistantResponse;
}

module.exports = { isFromMSTeams, handleTeamsMessage };