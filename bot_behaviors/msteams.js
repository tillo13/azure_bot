const { MessageFactory } = require('botbuilder');
const chatCompletion = require('./chat_helper');

async function handleTeamsMessage(context, chatMessagesUser, isFirstInteraction, propertyAccessor, pathConfig) {
    console.log('\n*****MSTEAMS.JS: Preparing to handle a message from MS Teams');
    
    if (!chatMessagesUser.some(item => item.role === "user" && item.content === context.activity.text)) {
        chatMessagesUser.push({
            role: "user",
            content: context.activity.text
        });
    } else {
        console.log('\n*****MSTEAMS.JS: Duplicate user message found, not adding to the chatgpt thread...:', context.activity.text);
    }
    
    const username = context.activity.from.name;
    
    let assistantResponse = '';
    
    if (isFirstInteraction) {
        console.log('\n*****MSTEAMS.JS: This is the first user interaction');
        assistantResponse = `Welcome [${username}] from @bot in MS Teams! Type *$help* for more info!\n----------------------\n`;
        const chatResponse = await chatCompletion(chatMessagesUser, pathConfig.personality, context.activity.channelId);
        assistantResponse += `${chatResponse.assistantResponse}`;
        chatMessagesUser = chatResponse.chats; // 
    }
    else {
        const chatResponse = await chatCompletion(chatMessagesUser, pathConfig.personality, context.activity.channelId, false);

        console.log('\n****MSTEAMS.JS: chatResponse:', {
            assistantResponse: chatResponse.assistantResponse,
            requery: chatResponse.requery,
            letMeCheckFlag: chatResponse.letMeCheckFlag
        });
    
        assistantResponse = `${chatResponse.assistantResponse}`;
        chatMessagesUser = chatResponse.chats;
    
        if (chatResponse.letMeCheckFlag) {
            const checkMessage = "Let me check our past conversations in this exact thread vis msteams.js, one moment...";
            let checkMessageActivity = MessageFactory.text(checkMessage);
    
            //console.log('\n*****MSTEAMS.JS: Sending Check Message:', checkMessageActivity); 
    
            await context.sendActivity(checkMessageActivity);
            
            chatMessagesUser.push({
                role: "assistant",
                content: checkMessage
            });
    
            const secondChatResponse = await chatCompletion(chatMessagesUser, pathConfig.personality, context.activity.channelId, true);
            assistantResponse = `${secondChatResponse.assistantResponse}`;
            chatMessagesUser = secondChatResponse.chats; 
        }
    }

    if (isFirstInteraction) {
        propertyAccessor.set(context, false);
    }
    
    //console.log('\n*****MSTEAMS.JS: Assistant Response: ', assistantResponse);
    return assistantResponse;
}
function isFromMSTeams(context) {
    return context.activity.channelId === 'msteams';
}
module.exports = { isFromMSTeams, handleTeamsMessage };