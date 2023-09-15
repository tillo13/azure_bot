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

      this.onMembersAdded(async (context, next) => {
        const membersAdded = context.activity.membersAdded;
        const welcomeText = 'Hello and welcome to the memoried ATT-ESS Chat bot!';
        for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
            if (membersAdded[cnt].id !== context.activity.recipient.id) {
                await context.sendActivity(MessageFactory.text(welcomeText, welcomeText));
            }
        }
        // This signals that this middleware's turn handling code is complete.
        // Calls the next middleware in the pipeline.
        await next();
    });
    
    this.onMessage(async (context, next) => {
        // Retrieve the conversation
        let chatMessagesUser = await this.chatMessagesProperty.get(context, []);
    
        chatMessagesUser.push({role:"user", content:context.activity.text});
        await this.chatMessagesProperty.set(context, chatMessagesUser);
    
        // Then run your bot's normal logic
        const response = await chatCompletion(chatMessagesUser, "You are a helpful assistant. You will talk like a child.");
        await context.sendActivity(MessageFactory.text(`default_router: ${response}`));
        chatMessagesUser.push({role:"assistant", content:response});
        await this.chatMessagesProperty.set(context, chatMessagesUser);
    
        await next();
    });

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