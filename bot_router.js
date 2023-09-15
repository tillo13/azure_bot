const { ActivityHandler, MessageFactory } = require('botbuilder');
const handleSlackMessage = require('./bot_behaviors/slack');
const chatCompletion = require('./bot_behaviors/chat_helper');

const WELCOMED_USER = 'welcomedUserProperty';
const SLACK_CHAT_MESSAGES = 'slackChatMessagesProperty';
const SLACK_CHAT_THREAD_HISTORY = 'slackChatThreadHistoryProperty';  // New thread history property

const SLACK_PERSONALITY_OF_BOT = "You talk like an elf. You are a helpful assistant from Teradata that always checks any past conversations within this thread before responding to any new information received.";

class EchoBot extends ActivityHandler {
    constructor(userState) {
        super();
        this.welcomedUserProperty = userState.createProperty(WELCOMED_USER);
        this.slackChatMessagesProperty = userState.createProperty(SLACK_CHAT_MESSAGES);
        this.slackChatThreadHistory = userState.createProperty(SLACK_CHAT_THREAD_HISTORY);
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
            let slackChatMessages = await this.slackChatMessagesProperty.get(context, []);
            let slackThreadId = context.activity.conversation.id + (context.activity.replyToId ? ':' + context.activity.replyToId : '');
            let slackThreadHistory = await this.slackChatThreadHistory.get(context, {id: slackThreadId, messages: []});
        
            slackChatMessages.push({role: "user", content: context.activity.text});
            slackThreadHistory.messages.push({role: "user", content: context.activity.text});

            let chatResponse = await chatCompletion(slackChatMessages, SLACK_PERSONALITY_OF_BOT);

            if(chatResponse.requery){
                const requeryNotice = "Let me check our past conversations, one moment...";
                await context.sendActivity(MessageFactory.text(requeryNotice, requeryNotice));
                chatResponse = await chatCompletion(slackThreadHistory.messages, SLACK_PERSONALITY_OF_BOT);
            }

            slackChatMessages.push({role: "assistant", content:chatResponse.assistantResponse});
            slackThreadHistory.messages.push({role: "assistant", content: chatResponse.assistantResponse});
            await this.slackChatMessagesProperty.set(context, slackChatMessages);
            await this.slackChatThreadHistory.set(context, slackThreadHistory);

            if (context.activity.channelId === 'slack') {
                await handleSlackMessage(context);
            } else {
                await context.sendActivity(MessageFactory.text(`default_router: ${chatResponse.assistantResponse}`));
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