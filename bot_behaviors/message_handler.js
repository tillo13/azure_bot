const {
	MessageFactory
} = require('botbuilder');
const {
	handleSlackMessage,
	isFromSlack
} = require('./slack');
const {
	handleTeamsMessage,
	isFromMSTeams
} = require('./msteams');
const chatCompletion = require('./chat_helper');

async function handleMessageFromMSTeams(context, chatMessagesUser, isFirstInteraction, propertyAccessor, pathConfig) {
    if (isFromMSTeams(context)) {
        const assistantResponse = await handleTeamsMessage(context, chatMessagesUser, isFirstInteraction, propertyAccessor, pathConfig);
        // Add the assistant's response to chatMessagesUser
        chatMessagesUser.push({ role: "assistant", content: assistantResponse });
        await context.sendActivity(MessageFactory.text(assistantResponse));
        return true;
    }
    return false;
}


async function handleMessageFromSlack(context, chatMessagesUser, savedThread_ts, botInvokedFlag, threadproperty, personality, pathConfig) { 	
    const current_thread_ts = context.activity.channelData && context.activity.channelData.SlackMessage && context.activity.channelData.SlackMessage.event ?
        context.activity.channelData.SlackMessage.event.thread_ts || context.activity.channelData.SlackMessage.event.ts : "";
    console.log("\n\n**MESSAGE_HANDLER.JS: Current Slack thread timestamp: ", current_thread_ts);

    savedThread_ts = await threadproperty.get(context, "");

    const botCalled = context.activity.text.includes('@bot') || context.activity.text.includes('@atbot');
    let botInThread = await botInvokedFlag.get(context, false);

    // Reset messages on new thread init
    if (savedThread_ts !== current_thread_ts) {
        chatMessagesUser = [];
        await threadproperty.set(context, current_thread_ts);
    }

    if (botCalled) {
        console.log("\n\n**MESSAGE_HANDLER.JS: '@bot' or '@atbot' mentioned in the message. Bot Invoked: ", botCalled);

        botInThread = true;
        await botInvokedFlag.set(context, botInThread);
        chatMessagesUser.push({
            role: "user",
            content: context.activity.text
        });
    } 

    if (isFromSlack(context) && (botCalled || (botInThread && savedThread_ts === current_thread_ts))) {
  
        let chatResponse = await chatCompletion(chatMessagesUser, personality, context.activity.channelId); 
    
        // Add this check to determine if it's a Slack message before adding to payload
        if (context.activity.channelId === 'slack') {
            if (chatResponse.requery && chatResponse.isActiveThread) {
                const chatResponses = await chatCompletion(chatMessagesUser, personality, context.activity.channelId, result.isActiveThread);
                chatMessagesUser.push({ role: "assistant", content: chatResponses.assistantResponse });
            }
    
            chatMessagesUser.push({ role: "assistant", content: chatResponse.assistantResponse });
        }
    
        await handleSlackMessage(context, chatResponse.assistantResponse, chatResponse.letMeCheckFlag, pathConfig);
    
        return true;
    
    }
    return false;
}

async function handleDefault(context, chatMessagesUser, personality) {
    // Ignore if the message source is from Slack
    if (isFromSlack(context)) {
        console.log("\n\n**MESSAGE_HANDLER.JS: Message from Slack and bot was not called or is not in thread. Ignoring...");
        return false;
    }

    // Continue with the rest of the function
    const chatResponse = await chatCompletion(chatMessagesUser, personality, context.activity.channelId);
    console.log(`\n\n***MESSAGE_HANDLER.JS: assistant responded with: ${chatResponse.assistantResponse}`);

    // Add the assistant's response to chatMessagesUser
    chatMessagesUser.push({ role: "assistant", content: chatResponse.assistantResponse });

    await context.sendActivity(MessageFactory.text(`default_router: ${chatResponse.assistantResponse}`));

    return true;
}
        
module.exports = {
	handleMessageFromMSTeams,
	handleMessageFromSlack,
	handleDefault
};