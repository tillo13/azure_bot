const { MessageFactory } = require('botbuilder');
const chatCompletion = require('./chat_helper');

const PERSONALITY_OF_BOT = "You talk like a pirate. You are a helpful chatbot from Teradata. As a crucial aspect of your function, ensure you always reference past user and assistant prompts in the thread for the best understanding in order to respond effectively.";

function isFromMSTeams(context) {
    return context.activity.channelId === 'msteams';
}

async function handleTeamsMessage(context, chatMessagesUser, isFirstInteraction) {
    console.log('\n*****MSTEAMS.JS: Preparing to handle a message from MS Teams');
    
    // Log the entire activity object
    console.log('\n*****MSTEAMS.JS: Teams Activity:', JSON.stringify(context.activity, null, 2));

    // Log Teams-specific data
    console.log('\n*****MSTEAMS.JS: Teams Channel Data:', JSON.stringify(context.activity.channelData, null, 2));
     
    // Get user's name from the Team's context
    const username = context.activity.from.name;
    
    let assistantResponse = '';
    
    if (isFirstInteraction) {
        console.log('*****MSTEAMS.JS: This is the first user interaction');
        assistantResponse = `msteams_chat_path: Hello ${username} from @bot in MS Teams!`;
    } else {
        console.log('*****MSTEAMS.JS: This is not the first interaction. Calling OpenAI...');
        const chatResponse = await chatCompletion(chatMessagesUser, PERSONALITY_OF_BOT, context.activity.channelId);
        console.log('*****MSTEAMS.JS: Received response from OpenAI');
        assistantResponse = `MS_Teams_Chat_Path: ${chatResponse.assistantResponse}`;
    }

    console.log('*****MSTEAMS.JS: Assistant Response: ', assistantResponse);
    return assistantResponse;
}

module.exports = { isFromMSTeams, handleTeamsMessage };