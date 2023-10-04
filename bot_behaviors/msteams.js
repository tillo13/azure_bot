const { MessageFactory } = require('botbuilder');
const chatCompletion = require('./chat_helper');

//const PERSONALITY_OF_BOT = "You talk like a pirate. You are a helpful chatbot from Teradata. As a crucial aspect of your function, ensure you always reference past user and assistant prompts in the thread for the best understanding in order to respond effectively.";

function isFromMSTeams(context) {
    return context.activity.channelId === 'msteams';
}

async function handleTeamsMessage(context, chatMessagesUser, isFirstInteraction, propertyAccessor, pathConfig) {


    console.log('\n*****MSTEAMS.JS: Preparing to handle a message from MS Teams');

    // Log the entire activity object
    console.log('\n*****MSTEAMS.JS: Teams Activity:', JSON.stringify(context.activity, null, 2));
        // Log the entire activity object
        console.log('\n*****MSTEAMS.JS: Teams Activity:', JSON.stringify(context.activity, null, 2));

    // Log Teams-specific data
    console.log('\n*****MSTEAMS.JS: Teams Channel Data:', JSON.stringify(context.activity.channelData, null, 2));
     
    // Get user's name from the Team's context
    const username = context.activity.from.name;
    
    let assistantResponse = '';
    
    if (isFirstInteraction) {
        console.log('\n*****MSTEAMS.JS: This is the first user interaction');
        assistantResponse = `${pathConfig.messagePrefix}: Welcome ${username} from @bot in MS Teams!`;
    
        // set isFirstInteraction to false, after responding on user's first message
        propertyAccessor.set(context, false);
    } else {
        console.log('\n*****MSTEAMS.JS: This is not the first interaction. Calling OpenAI...');
        const chatResponse = await chatCompletion(chatMessagesUser, pathConfig.personality, context.activity.channelId);
        console.log('\n*****MSTEAMS.JS: Received response from OpenAI');
        assistantResponse = `${pathConfig.messagePrefix}:${chatResponse.assistantResponse}`;
    }
    
    if (typeof assistantResponse !== 'undefined') {
        console.log('\n*****MSTEAMS.JS: Assistant Response: ', assistantResponse);
        return assistantResponse;
    } else {
        // Return Void here instead of assistantResponse 
        return;
    }
}

module.exports = { isFromMSTeams, handleTeamsMessage };