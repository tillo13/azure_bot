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
            let current_thread_ts = context.activity.channelData && context.activity.channelData.SlackMessage && context.activity.channelData.SlackMessage.event ?
                context.activity.channelData.SlackMessage.event.thread_ts || context.activity.channelData.SlackMessage.event.ts : "";
            let chatMessagesUser = current_thread_ts === this.thread_ts ? await this.chatMessagesProperty.get(context, []) : [];
            this.thread_ts = current_thread_ts;
            chatMessagesUser.push({ role: "user", content: context.activity.text });
            console.log('******BOT_ROUTER.JS: Current content of chatMessagesUser:', chatMessagesUser);

            let chatResponse = await chatCompletion(chatMessagesUser, PERSONALITY_OF_BOT, context.activity.channelId);

            
            if (chatResponse.requery) {
                const requeryNotice = "Let me check our past conversations, one moment...";
                await context.sendActivity(MessageFactory.text(requeryNotice, requeryNotice));
                chatMessagesUser.push({ role: "assistant", content: requeryNotice });
                chatResponse = await chatCompletion(chatMessagesUser, PERSONALITY_OF_BOT, context.activity.channelId);
            }

            chatMessagesUser.push({ role: "assistant", content: chatResponse.assistantResponse });
            const cleanedFormattedMessages = await handleSlackMessage(context, chatResponse.assistantResponse, chatResponse.letMeCheckFlag, chatCompletion, isActiveThread);
            console.log('Is the thread active?:', isActiveThread);
            await chatCompletion(chatMessagesUser, PERSONALITY_OF_BOT, context.activity.channelId);
            await this.chatMessagesProperty.set(context, chatMessagesUser);
            console.log(`\n\n\n****BOT_ROUTER.JS current channelData:\n\n${JSON.stringify(context.activity.channelData, null, 2)}`);
            if (isFromSlack(context)) {
                console.log('\n***BOT_ROUTER.JS: letMeCheckFlag is: ', chatResponse.letMeCheckFlag);
            } else {
                const replyActivity = MessageFactory.text(`default_router: ${chatResponse.assistantResponse}`);
                await context.sendActivity(replyActivity);
            }
            await next();
        });
    }

    async run(context) {
        await super.run(context);
        await this.userState.saveChanges(context);
    }
}

module.exports.EchoBot = EchoBot;