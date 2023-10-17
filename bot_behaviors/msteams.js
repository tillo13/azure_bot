const { MessageFactory } = require('botbuilder');
const chatCompletion = require('./chat_helper');

async function handleTeamsMessage(context, chatMessagesUser, isFirstInteraction, propertyAccessor, pathConfig) {
    console.log('\n*****MSTEAMS.JS: Preparing to handle a message from MS Teams');
    
    // Debug logs
    // console.log('\n*****MSTEAMS.JS [DEBUG]: context data: ', context);
    // console.log('\n*****MSTEAMS.JS [DEBUG]: chatMessagesUser data: ', chatMessagesUser);
    // console.log('\n*****MSTEAMS.JS [DEBUG]: isFirstInteraction data: ', isFirstInteraction);

    if (!chatMessagesUser.some(item => item.role === "user" && item.content === context.activity.text)) {
        chatMessagesUser.push({
            role: "user",
            content: context.activity.text
        });
    } else {
        console.log('\n*****MSTEAMS.JS: Duplicate user message found, not adding to the chatgpt thread...:', context.activity.text);
    }
    
    const username = context.activity.from.name;
    const aadObjectID = context.activity.from.aadObjectId;
    
    // Debug log
    console.log('\n*****MSTEAMS.JS [DEBUG]: username data: ', username);
    console.log('\n*****MSTEAMS.JS [DEBUG]: aad of user: ',aadObjectID );
    
    let assistantResponse = '';
    
    if (isFirstInteraction) {
        console.log('\n*****MSTEAMS.JS: This is the first user interaction');
        assistantResponse = `Hey [${username}]!\nType *$help* for more info!\n----------------------\n`;
        const chatResponse = await chatCompletion(chatMessagesUser, pathConfig.personality, context.activity.channelId);
        
        // Debug log
        console.log('\n*****MSTEAMS.JS [DEBUG]: chatResponse data: ', chatResponse);

        assistantResponse += `${chatResponse.assistantResponse}`;
        chatMessagesUser = chatResponse.chats;
    }
    else {
        const chatResponse = await chatCompletion(chatMessagesUser, pathConfig.personality, context.activity.channelId, false);
        
        // Debug log
        //console.log('\n*****MSTEAMS.JS [DEBUG]: chatResponse data: ', chatResponse);

        assistantResponse = `${chatResponse.assistantResponse}`;
        chatMessagesUser = chatResponse.chats;
    
        if (chatResponse.letMeCheckFlag) {
            const checkMessage = "Let me check our past conversations in this exact thread via msteams.js, one moment...";
            let checkMessageActivity = MessageFactory.text(checkMessage);
        
            await context.sendActivity(checkMessageActivity);
            
            chatMessagesUser.push({
                role: "assistant",
                content: checkMessage
            });
    
            const secondChatResponse = await chatCompletion(chatMessagesUser, pathConfig.personality, context.activity.channelId, true);
            
            // Debug log
            console.log('\n*****MSTEAMS.JS [DEBUG]: secondChatResponse data: ', secondChatResponse);

            assistantResponse = `${secondChatResponse.assistantResponse}`;
            chatMessagesUser = secondChatResponse.chats; 
        }
    }

    if (isFirstInteraction) {
        propertyAccessor.set(context, false);
    }
    
    return assistantResponse;
}

function isFromMSTeams(context) {
    return context.activity.channelId === 'msteams';
}

module.exports = { isFromMSTeams, handleTeamsMessage };