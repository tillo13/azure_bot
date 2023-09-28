const { ActivityHandler, MessageFactory } = require('botbuilder');
const { handleSlackMessage, isFromSlack } = require('./bot_behaviors/slack');
const { handleTeamsMessage, isFromMSTeams } = require('./bot_behaviors/msteams');

const specialCommands = require('./bot_behaviors/special_commands');

const chatCompletion = require('./bot_behaviors/chat_helper');

const WELCOMED_USER = 'welcomedUserProperty';
const CHAT_MESSAGES = 'chatMessagesProperty';
const THREAD_TS = 'thread_ts';
const PERSONALITY_OF_BOT = "You talk like an old cowboy. You are a helpful chatbot from Teradata. As a crucial aspect of your function, ensure you always reference past user and assistant prompts in the thread for the best understanding in order to respond effectively.";

function isFromMsTeams(context) {
    return context.activity.channelId === 'msteams';
}

class EchoBot extends ActivityHandler {
    // Define the resetState function
    resetState(context) {
        // Sets all the state properties to their default values
        this.welcomedUserProperty.set(context, false);
        this.chatMessagesProperty.set(context, []);
        this.threadproperty.set(context, "");
        this.botInvokedFlag.set(context, false);
        this.isFirstInteraction.set(context, false);
        // Add your own properties to reset, if any
    }

    constructor(userState) {
        super();
        this.welcomedUserProperty = userState.createProperty(WELCOMED_USER);
        this.chatMessagesProperty = userState.createProperty(CHAT_MESSAGES);
        this.threadproperty = userState.createProperty(THREAD_TS);
        this.botInvokedFlag = userState.createProperty('botInvokedFlag');
        this.userState = userState;
        // During bot initialization via msteams addition
        this.isFirstInteraction = userState.createProperty('isFirstInteraction');

        this.onMembersAdded(async (context, next) => {
            console.log("\n\n**BOT_ROUTER.JS: A member(s) has been added to the chat");
            console.log("\n\n**BOT_ROUTER.JS: The ids of the added members are: ", context.activity.membersAdded.map(member => member.id));
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

            const messageContent = context.activity.text.trim();
            console.log('\n\n**BOT_ROUTER.JS: onMessage triggered');
            console.log('\n\n**BOT_ROUTER.JS: Bot received a message');
            console.log("\n\n**BOT_ROUTER.JS: Message content: ", context.activity.text);
            
                    
            if (specialCommands[messageContent]) {
                // If the command exists in our special commands, execute it
                await specialCommands[messageContent](context);
            } else {
                let chatMessagesUser = await this.chatMessagesProperty.get(context, []) || [];
                chatMessagesUser.push({ role: "user", content: context.activity.text });
            
            const current_thread_ts = context.activity.channelData && context.activity.channelData.SlackMessage && context.activity.channelData.SlackMessage.event ?
                context.activity.channelData.SlackMessage.event.thread_ts || context.activity.channelData.SlackMessage.event.ts : "";
                console.log("\n\n**BOT_ROUTER.JS: Current Slack thread timestamp: ", current_thread_ts);

            
            let savedThread_ts = await this.threadproperty.get(context, "");
                    
            const botCalled = context.activity.text.includes('@bot') || context.activity.text.includes('@atbot');
            let botInThread = await this.botInvokedFlag.get(context, false);
            
            // Reset messages on new thread init
            if(savedThread_ts !== current_thread_ts) {
                chatMessagesUser = []; 
                await this.threadproperty.set(context, current_thread_ts);
            }
            
            if (botCalled) {
                console.log("\n\n**BOT_ROUTER.JS: '@bot' or '@atbot' mentioned in the message. Bot Invoked: ", botCalled);
            
                botInThread = true;
                await this.botInvokedFlag.set(context, botInThread);
                chatMessagesUser.push({ role: "user", content: context.activity.text }); 
            }
            

            let isFirstInteraction = await this.isFirstInteraction.get(context, true);

            if (isFromMSTeams(context)) {
                const assistantResponse = await handleTeamsMessage(context, chatMessagesUser, isFirstInteraction);
                await context.sendActivity(MessageFactory.text(assistantResponse));
                await this.isFirstInteraction.set(context, false);
            } 
            else if (isFromSlack(context) && (botCalled || (botInThread && savedThread_ts === current_thread_ts))) {
                // Code for handling Slack Interaction
                console.log("\n\n**BOT_ROUTER.JS: Message from Slack and bot was either called or is already in thread. Processing...");
                // Rest of the code for handling Slack Messages...
            } else {
                // Code for handling default interaction
                const chatResponse = await chatCompletion(chatMessagesUser, PERSONALITY_OF_BOT, context.activity.channelId);
                console.log(`\n\n***BOT_ROUTER.JS: assistant responded with: ${chatResponse.assistantResponse}`);
                            
                await context.sendActivity(MessageFactory.text(`default_router: ${chatResponse.assistantResponse}`));
            }
            
            await this.chatMessagesProperty.set(context, chatMessagesUser);
            await next();
    }});
    }
    async onTurn(turnContext) {
        // Add resetState to turnState so it can be accessed in commands
        turnContext.turnState.set('resetState', this.resetState);
        await super.onTurn(turnContext);
    }
    async run(context) {
        console.log('\n\n**BOT_ROUTER.JS: Running the bot...');
        await super.run(context);
        await this.userState.saveChanges(context);
        console.log('\n\n**BOT_ROUTER.JS: State changes have been saved.');
    }
}
module.exports.EchoBot = EchoBot;