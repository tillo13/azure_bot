const { MessageFactory } = require('botbuilder');
const chatCompletion = require('./chat_helper');

const PERSONALITY_OF_BOT = "You talk like an old cowboy. You are a helpful chatbot from Teradata. As a crucial aspect of your function, ensure you always reference past user and assistant prompts in the thread for the best understanding in order to respond effectively.";

function isFromMSTeams(context) {
    return context.activity.channelId === 'msteams';
}

async function handleTeamsMessage(context, chatMessagesUser, isFirstInteraction) {
     
    let assistantResponse = '';

    if (isFirstInteraction) {
        assistantResponse = 'msteams_chat_path: Hello from @bot in MS Teams!';
    }
    else {
        const chatResponse = await chatCompletion(chatMessagesUser, PERSONALITY_OF_BOT, context.activity.channelId);
        assistantResponse = `MS_Teams_Chat_Path: ${chatResponse.assistantResponse}`;
    }

    return assistantResponse;
}

module.exports = { isFromMSTeams, handleTeamsMessage };