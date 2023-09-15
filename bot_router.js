const { ActivityHandler, MessageFactory } = require('botbuilder');
const handleSlackMessage = require('./bot_behaviors/slack');
const chatCompletion = require('./bot_behaviors/chat_helper');

class EchoBot extends ActivityHandler {
   constructor() {
      super();

      this.onMessage(async (context, next) => {
         if (context.activity.channelId === 'slack') {
            await handleSlackMessage(context);
         } 
         else {
            // This line calls the chatCompletion function with the text of the
            // current activity and a standard roleMessage for non-Slack channels
            //this is a single-use conversation though, we will add memory next...
            const response = await chatCompletion(context.activity.text, "You are a helpful assistant. You will talk like a banjo.");
            await context.sendActivity(MessageFactory.text(`default_router: ${response}`));
         }
         await next();
      });

        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            const welcomeText = 'Hello and welcome to the at>ESS Chat bot!';
            for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    await context.sendActivity(MessageFactory.text(welcomeText, welcomeText));
                }
            }
            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }
}

module.exports.EchoBot = EchoBot;