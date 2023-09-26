const { ActivityHandler, MessageFactory } = require('botbuilder');
const { handleSlackMessage, isFromSlack } = require('./bot_behaviors/slack');
const chatCompletion = require('./bot_behaviors/chat_helper');

const WELCOMED_USER = 'welcomedUserProperty';
const CHAT_MESSAGES = 'chatMessagesProperty';
const PERSONALITY_OF_BOT = "You talk like an old cowboy. You are a helpful assistant from Teradata that always checks any past conversations within this thread before responding to any new information received.";

class EchoBot extends ActivityHandler {
    constructor(userState) {
        super();
        this.welcomedUserProperty = userState.createProperty(WELCOMED_USER);
        this.chatMessagesProperty = userState.createProperty(CHAT_MESSAGES);
        this.thread_ts = "";
        this.userState = userState;

        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            const welcomeText = 'Hello and welcome to the memoried ATT-ESS Chat bot!';
            for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    await context.sendActivity(MessageFactory.text(welcomeText, welcomeText));
                }
            }
            await next();
        });
        this.onMessage(async (context, next) => {
            let chatMessagesUserState = await this.chatMessagesProperty.get(context, { messages: [], thread_ts: "" }) || { messages: [], thread_ts: "" };
            chatMessagesUserState.messages.push({ role: "user", content: context.activity.text });
        
            // Slack-specific handling
            if (isFromSlack(context)) {
                const current_thread_ts = context.activity.channelData && context.activity.channelData.SlackMessage && context.activity.channelData.SlackMessage.event ?
                    context.activity.channelData.SlackMessage.event.thread_ts || context.activity.channelData.SlackMessage.event.ts : "";
                if(chatMessagesUserState.thread_ts !== current_thread_ts){
                    chatMessagesUserState.messages = [{ role: "user", content: context.activity.text }]; // clear conversation history if it's a new thread
                }
                chatMessagesUserState.thread_ts = current_thread_ts;
        
                const chatResponse = await chatCompletion(chatMessagesUserState.messages, PERSONALITY_OF_BOT, context.activity.channelId);
                chatMessagesUserState.messages.push({ role: "assistant", content: chatResponse.assistantResponse});
        
                const result = await handleSlackMessage(context, chatResponse.assistantResponse, chatResponse.letMeCheckFlag, chatCompletion);
                if(chatResponse.requery && result.isActiveThread){
                    const requeryNotice = "Let me check our past conversations, one moment...";
                    await context.sendActivity(MessageFactory.text(requeryNotice, requeryNotice));
                    chatMessagesUserState.messages.push({ role: "assistant", content: requeryNotice });
                    let requeryResponse = await chatCompletion(chatMessagesUserState.messages, PERSONALITY_OF_BOT, context.activity.channelId, result.isActiveThread);
                    chatMessagesUserState.messages.push({ role: "assistant", content: requeryResponse.assistantResponse });
                }
        
            } else { // handling for non-slack platforms
                const chatResponse = await chatCompletion(chatMessagesUserState.messages, PERSONALITY_OF_BOT, context.activity.channelId);
                 chatMessagesUserState.messages.push({ role: "assistant", content: chatResponse.assistantResponse });
                 const replyActivity = MessageFactory.text(`default_router: ${chatResponse.assistantResponse}`);
                 await context.sendActivity(replyActivity);
            }
        
            await this.chatMessagesProperty.set(context, chatMessagesUserState);
        
            await next();
        });
    }

    async run(context) {
        await super.run(context);
        await this.userState.saveChanges(context);
    }
}

module.exports.EchoBot = EchoBot;