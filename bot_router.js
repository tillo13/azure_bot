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

const activeThreads = {};
this.onMessage(async (context, next) => {
    let chatMessagesUser = await this.chatMessagesProperty.get(context, []) || [];
    chatMessagesUser.push({ role: "user", content: context.activity.text });
    let chatResponse;

    if (isFromSlack(context)) {
        const botCalled = context.activity.text.includes('@bot') || context.activity.text.includes('@atbot');

        // Logic to check for active thread
        let current_thread_ts = context.activity.channelData.SlackMessage.event.thread_ts || context.activity.channelData.SlackMessage.event.ts;

        // Function to print to console
        function logToConsole(message) {
            console.log(`\n\n***BOT_ROUTER.JS: ${message}`);
        }

        if(botCalled || activeThreads[current_thread_ts]) {
            chatResponse = await chatCompletion(chatMessagesUser, PERSONALITY_OF_BOT, context.activity.channelId);
            logToConsole(`THREAD_TS/CHANNEL_ID ${current_thread_ts}/${context.activity.channelId} is active, processing payload ${JSON.stringify(chatResponse, null, 2)} sending to openai.`);
        } else {
            if(current_thread_ts) {
                // Threaded message without calling bot
                logToConsole(`threaded slack message, no bot invocation, not sending to openai.`);
            } else {
                // Main message without calling bot
                logToConsole(`main thread, no bot invocation, not sending to openai.`);
            }
            return;
        }

        // Set the thread as active when bot is invoked
        if (botCalled) {
            activeThreads[current_thread_ts] = true;
        }

        const result = await handleSlackMessage(context, chatResponse.assistantResponse, chatResponse.letMeCheckFlag, chatCompletion);
        const cleanedFormattedMessages = result.cleanedFormattedMessages;
        const isActiveThread = result.isActiveThread;

        // If a requery is needed and the thread is active
        if (chatResponse.requery && isActiveThread) {
            const requeryNotice = "Let me check our past conversations, one moment...";
            await context.sendActivity(MessageFactory.text(requeryNotice, requeryNotice));
            chatMessagesUser.push({ role: "assistant", content: requeryNotice });
            chatResponse = await chatCompletion(chatMessagesUser, PERSONALITY_OF_BOT, context.activity.channelId, isActiveThread);
            chatMessagesUser.push({ role: "assistant", content: chatResponse.assistantResponse });
        }

        logToConsole(`letMeCheckFlag is: ${chatResponse.letMeCheckFlag}`);
    } else {
        // If the request is from other channels than slack, handle it separately
        chatResponse = await chatCompletion(chatMessagesUser, PERSONALITY_OF_BOT, context.activity.channelId);
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
