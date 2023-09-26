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
            const chatMessagesUser = await this.chatMessagesProperty.get(context, []) || [];
            chatMessagesUser.push({ role: "user", content: context.activity.text });
            if (isFromSlack(context)) {
                const botCalled = context.activity.text.includes('@bot') || context.activity.text.includes('@atbot');
                const current_thread_ts = context.activity.channelData && context.activity.channelData.SlackMessage && context.activity.channelData.SlackMessage.event ?
                    context.activity.channelData.SlackMessage.event.thread_ts || context.activity.channelData.SlackMessage.event.ts : "";

                // Logic to check for active thread
                let isNewThread = current_thread_ts !== this.thread_ts;
                this.thread_ts = current_thread_ts;

                if (botCalled || !isNewThread) {
                    chatMessagesUser.length = isNewThread ? 0 : chatMessagesUser.length; // clear conversation history if its a new thread
                    const chatResponse = await chatCompletion(chatMessagesUser, PERSONALITY_OF_BOT, context.activity.channelId);
                    chatMessagesUser.push({ role: "assistant", content: chatResponse.assistantResponse});
                    const result = await handleSlackMessage(context, chatResponse.assistantResponse, chatResponse.letMeCheckFlag, chatCompletion);
                    const isThreadActive = result.isActiveThread;
                    
                    if(chatResponse.requery && isThreadActive){
                        const requeryNotice = "Let me check our past conversations, one moment...";
                        await context.sendActivity(MessageFactory.text(requeryNotice, requeryNotice));
                        chatMessagesUser.push({ role: "assistant", content: requeryNotice });
                        let chatResponse = await chatCompletion(chatMessagesUser, PERSONALITY_OF_BOT, context.activity.channelId, isThreadActive);
                        chatMessagesUser.push({ role: "assistant", content: chatResponse.assistantResponse });
                    }

                    console.log(`\n\nBOT_ROUTER.JS: letMeCheckFlag is: ${chatResponse.letMeCheckFlag}`);
                } 
            } else {
                const chatResponse = await chatCompletion(chatMessagesUser, PERSONALITY_OF_BOT, context.activity.channelId);
                const replyActivity = MessageFactory.text(`default_router: ${chatResponse.assistantResponse}`);
                await context.sendActivity(replyActivity);
            }

            await this.chatMessagesProperty.set(context, chatMessagesUser);
            await next();
        });
    }

    async run(context) {
        await super.run(context);
        await this.userState.saveChanges(context);
    }
}

module.exports.EchoBot = EchoBot;