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
            await next();
        });
        
        this.onMessage(async (context, next) => {
          // Retrieve the conversation
          let chatMessagesUser = await this.chatMessagesProperty.get(context, []);
          chatMessagesUser.push({role:"user", content:context.activity.text});
          
          // Get chat response
          let chatResponse = await chatCompletion(chatMessagesUser, "You talk like a cat. You are a helpful assistant that always checks any past conversations within this thread before responding to any new information received.");
          
          // Check requery
          if(chatResponse.requery){
              const requeryNotice = "Let me check our past conversations, one moment...";
              // Notify the user that the bot is checking past conversation before sending the response of requery
              await context.sendActivity(MessageFactory.text(requeryNotice, requeryNotice));
              // Re-fetch the response after requery
              chatResponse = await chatCompletion(chatMessagesUser, "You talk like a cat. You are a helpful assistant that always checks any past conversations within this thread before responding to any new information received..");
          }
          
          // Save bot's response
          chatMessagesUser.push({role:"assistant", content:chatResponse.assistantResponse});
          await this.chatMessagesProperty.set(context, chatMessagesUser);
          
          // Check the channel Id to differentiate between Slack and other platforms.
          if (context.activity.channelId === 'slack') {
              await handleSlackMessage(context);
          } else {
              await context.sendActivity(MessageFactory.text(`default_router: ${chatResponse.assistantResponse}`));
          }
          
          await next();
      });
    }

    //Override the ActivityHandler.run() method to save state changes after the bot logic completes.
    async run(context) {
        await super.run(context);
        // Save state changes
        await this.userState.saveChanges(context);
    }
}

module.exports.EchoBot = EchoBot;