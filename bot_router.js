const { ActivityHandler, MessageFactory } = require('botbuilder');
const handleSlackMessage = require('./bot_behaviors/slack');
const chatCompletion = require('./bot_behaviors/chat_helper');

// Welcomed User property name
const WELCOMED_USER = 'welcomedUserProperty';
const CHAT_MESSAGES = 'chatMessagesProperty';

// Define the personality of the bot
const PERSONALITY_OF_BOT = "You talk like a cat. You are a helpful assistant that always checks any past conversations within this thread before responding to any new information received.";

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
          let chatMessagesUser = await this.chatMessagesProperty.get(context, []);
          chatMessagesUser.push({role:"user", content:context.activity.text});

          let chatResponse = await chatCompletion(chatMessagesUser, PERSONALITY_OF_BOT);

          if(chatResponse.requery){
              const requeryNotice = "Let me check our past conversations, one moment...";
              await context.sendActivity(MessageFactory.text(requeryNotice, requeryNotice));
              chatResponse = await chatCompletion(chatMessagesUser, PERSONALITY_OF_BOT);
          }

          chatMessagesUser.push({role:"assistant", content:chatResponse.assistantResponse});
          await this.chatMessagesProperty.set(context, chatMessagesUser);

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