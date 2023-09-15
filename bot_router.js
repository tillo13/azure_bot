const { ActivityHandler, MessageFactory } = require('botbuilder');
const handleSlackMessage = require('./bot_behaviors/slack');
const chatCompletion = require('./bot_behaviors/chat_helper');

// Welcomed User property name
const WELCOMED_USER = 'welcomedUserProperty';
const CHAT_MESSAGES = 'chatMessagesProperty';

class EchoBot extends ActivityHandler {
   constructor(userState) {
      super();

      // Creates a new user property accessor.
      this.welcomedUserProperty = userState.createProperty(WELCOMED_USER);
      this.chatMessagesProperty = userState.createProperty(CHAT_MESSAGES);
      this.userState = userState;

      this.onMessage(async (context, next) => {
         const didBotWelcomedUser = await this.welcomedUserProperty.get(context, false);
         const chatMessagesUser = await this.chatMessagesProperty.get(context, []);

        if (didBotWelcomedUser === false) {
            if (context.activity.channelId === 'slack') {
                await handleSlackMessage(context);
            } else {
                const response = await chatCompletion(context.activity.text, "You are a helpful assistant. You will talk like a child.");
                await context.sendActivity(MessageFactory.text(`default_router: ${response}`));
                await this.welcomedUserProperty.set(context, true);
            }
        } else {
            if (context.activity.channelId === 'slack') {
                await handleSlackMessage(context);
            } else {
                chatMessagesUser.push({role:"user", content:context.activity.text});
                await this.chatMessagesProperty.set(context, chatMessagesUser);

                const response = await chatCompletion(chatMessagesUser, "You are a helpful assistant. You will talk like a child.");
                await context.sendActivity(MessageFactory.text(`default_router: ${response}`));
                chatMessagesUser.push({role:"assistant", content:response});
                await this.chatMessagesProperty.set(context, chatMessagesUser);
            }
        }
        await next();
      });

        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            const welcomeText = 'Hello and welcome to the memory'd ATT-ESS Chat bot!';
            for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    await context.sendActivity(MessageFactory.text(welcomeText, welcomeText));
                }
            }
            await next();
        });
    }

    /**
     * Override the ActivityHandler.run() method to save state changes after the bot logic completes.
     */
    async run(context) {
        await super.run(context);
        // Save state changes
        await this.userState.saveChanges(context);
    }
}

module.exports.EchoBot = EchoBot;