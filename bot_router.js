const { ActivityHandler, MessageFactory } = require('botbuilder');
const { handleSlackMessage, isFromSlack } = require('./bot_behaviors/slack');
const chatCompletion = require('./bot_behaviors/chat_helper');

const WELCOMED_USER = 'welcomedUserProperty';
const CHAT_MESSAGES = 'chatMessagesProperty';
const THREAD_TS = 'thread_ts';
const PERSONALITY_OF_BOT = "You talk like an old cowboy. You are a helpful assistant from Teradata that always checks any past conversations within this thread before responding to any new information received.";

class EchoBot extends ActivityHandler {
    constructor(userState) {
        super();
        this.welcomedUserProperty = userState.createProperty(WELCOMED_USER);
        this.chatMessagesProperty = userState.createProperty(CHAT_MESSAGES);
        this.threadproperty = userState.createProperty(THREAD_TS);
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
            console.log('\n\n****BOT_ROUTER.JS: onMessage triggered');
            let chatMessagesUser = await this.chatMessagesProperty.get(context, []) || [];
            chatMessagesUser.push({ role: "user", content: context.activity.text });
            const current_thread_ts = context.activity.channelData && context.activity.channelData.SlackMessage && context.activity.channelData.SlackMessage.event ?
                  context.activity.channelData.SlackMessage.event.thread_ts || context.activity.channelData.SlackMessage.event.ts : "";
            const savedThread_ts = await this.threadproperty.get(context, "");

            if (isFromSlack(context)) {
                console.log('\n\n****BOT_ROUTER.JS: message from Slack');
                console.log(`\n\n****BOT_ROUTER.JS: current thread_ts: ${current_thread_ts}`);

                if(savedThread_ts !== current_thread_ts) {
                    chatMessagesUser = []; 
                    await this.threadproperty.set(context, current_thread_ts);
                }

                const botCalled = context.activity.text.includes('@bot') || context.activity.text.includes('@atbot');
                console.log('\n\n****BOT_ROUTER.JS: bot is specifically invoked in the message:', botCalled);

                if (botCalled || savedThread_ts === current_thread_ts) {
                    console.log('\n\n****BOT_ROUTER.JS: Bot is specifically invoked in the message OR this message is part of an existing thread.');
                    let chatResponse = await chatCompletion(chatMessagesUser, PERSONALITY_OF_BOT, context.activity.channelId);
                    console.log('\n\n****BOT_ROUTER.JS: Successfully fetched and processed the chat response from OpenAI API.');
                    chatMessagesUser = chatResponse.requery ?  [{ role: "assistant", content: chatResponse.assistantResponse}] : chatMessagesUser;
                    chatMessagesUser.push({ role: "assistant", content: chatResponse.assistantResponse });
                    const result = await handleSlackMessage(context, chatResponse.assistantResponse, chatResponse.letMeCheckFlag, chatCompletion);
                    console.log('\n\n****BOT_ROUTER.JS: Successfully processed and responded to the Slack message.');

                    if(chatResponse.requery && result.isActiveThread) {
                        console.log('\n\n****BOT_ROUTER.JS: The flag for a requery with OpenAI was set, and the bot is currently active within a Slack thread.');

                        const requeryNotice = "Let me check our past conversations, one moment...";
                        await context.sendActivity(MessageFactory.text(requeryNotice, requeryNotice));
                        const chatResponses = await chatCompletion(chatMessagesUser, PERSONALITY_OF_BOT, context.activity.channelId, result.isActiveThread);
                        chatMessagesUser.push({ role: "assistant", content: chatResponses.assistantResponse });
                    }
                    console.log(`\n\n****BOT_ROUTER.JS: letMeCheckFlag is: ${chatResponse.letMeCheckFlag}`);
                } 
            } else {
                console.log('\n\n****BOT_ROUTER.JS: The received message did not originate from Slack.');
                const chatResponse = await chatCompletion(chatMessagesUser, PERSONALITY_OF_BOT, context.activity.channelId);
                console.log(`\n\n****BOT_ROUTER.JS: assistant responded with: ${chatResponse.assistantResponse}`);
                await context.sendActivity(MessageFactory.text(`default_router: ${chatResponse.assistantResponse}`));
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