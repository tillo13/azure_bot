const { MessageFactory } = require('botbuilder');
const chatCompletion = require('./chat_helper');
const { getLast24HrInteractionPerUserFromDB } = require('./chatgpt_utils');

async function handleTeamsMessage(context, chatMessagesUser, isFirstInteraction, propertyAccessor, pathConfig) {
    console.log('\n*****MSTEAMS.JS: Preparing to handle a message from MS Teams');

    const username = context.activity.from.name;
    const aadObjectID = context.activity.from.aadObjectId;

    console.log('\n*****MSTEAMS.JS [DEBUG]: username data: ', username);
    console.log('\n*****MSTEAMS.JS [DEBUG]: aad of user: ',aadObjectID );

    try {
        chatMessagesUser = await getLast24HrInteractionPerUserFromDB(aadObjectID);
        //console.log('\n*****MSTEAMS.JS [DEBUG] last 24 hours:', chatMessagesUser);
    } catch (error) {
        console.error('\n*****MSTEAMS.JS [DEBUG] Failed to fetch interaction data:', error);
    }


    let assistantResponse = '';

    if (!chatMessagesUser.some(item => item.role === "user" && item.content === context.activity.text)) {
        chatMessagesUser.push({
            role: "user",
            content: context.activity.text
        });
    } else {
        console.log('\n*****MSTEAMS.JS: Duplicate user message found, not adding to the chatgpt thread...:', context.activity.text);
    }

    try {
        if (isFirstInteraction) {
            console.log('\n*****MSTEAMS.JS: This is the first user interaction');
            assistantResponse = `Hey [${username}]!\nType *$help* for more info!\n----------------------\n`;
            const chatResponse = await chatCompletion(chatMessagesUser, pathConfig.personality, context.activity.channelId);

            console.log('\n*****MSTEAMS.JS [DEBUG]: firstInteraction chatResponse data: ', chatResponse);

            assistantResponse += `${chatResponse.assistantResponse}`;
            chatMessagesUser = chatResponse.chats;
        }
        else {
            const chatResponse = await chatCompletion(chatMessagesUser, pathConfig.personality, context.activity.channelId, false);

            console.log('\n*****MSTEAMS.JS [DEBUG]: More than firstInteraction chatResponse data: ', chatResponse);

            assistantResponse = `${chatResponse.assistantResponse}`;
            chatMessagesUser = chatResponse.chats;

            if (chatResponse.letMeCheckFlag) {
                const checkMessage = "Just a moment, I'm collecting (checking chat history) my thoughts...";
                let checkMessageActivity = MessageFactory.text(checkMessage);

                await context.sendActivity(checkMessageActivity);

                chatMessagesUser.push({
                    role: "assistant",
                    content: checkMessage
                });

                const secondChatResponse = await chatCompletion(chatMessagesUser, pathConfig.personality, context.activity.channelId, true);

                console.log('\n*****MSTEAMS.JS [DEBUG]: letmecheck result --> secondChatResponse data: ', secondChatResponse);

                assistantResponse = `${secondChatResponse.assistantResponse}`;
                chatMessagesUser = secondChatResponse.chats;
            }
        }

    } catch (error) {
        console.error('\n*****MSTEAMS.JS [DEBUG] An error occurred while interacting with OpenAI API:', error);
        if (error.code === 'content_filter') {
            assistantResponse = `I'm sorry, your request was filtered due to violating Azure OpenAI's content management policy. Please try again with a different prompt.`;
        } else {
            assistantResponse = `I'm sorry, an error occurred while processing your request. Please try again later.`;
        }
        
        // Sending the error to the user
        await context.sendActivity(MessageFactory.text(assistantResponse));
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