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
          let slackChatMessagesUser = await this.slackChatMessagesProperty.get(context, []);
          let slackThreadId = context.activity.conversation.id + (context.activity.channelData.thread_ts ? ':' + context.activity.channelData.thread_ts : '');
          let slackThreadHistory = await this.slackChatThreadHistory.get(context, {id: slackThreadId, messages: []});
      
          slackChatMessagesUser.push({role:"user", content:context.activity.text});
          slackThreadHistory.messages.push({role:"user", content:context.activity.text});
      
          let slackChatResponse = await chatCompletion(slackChatMessagesUser, SLACK_PERSONALITY_OF_BOT);
      
          if(slackChatResponse.requery){
              const requeryNotice = "Let me check our past conversations, one moment...";
              await context.sendActivity(MessageFactory.text(requeryNotice, requeryNotice));
              slackChatResponse = await chatCompletion(slackThreadHistory.messages, SLACK_PERSONALITY_OF_BOT);
          }
      
          if (context.activity.channelId === 'slack') {
              // Check if 'thread_ts' exists. If so, this is a reply to a thread. 
              const thread_ts = context.activity.channelData.thread_ts;
              await handleSlackMessage(context, this.slackChatMessagesProperty, this.slackChatThreadHistory, slackChatResponse.assistantResponse, thread_ts);
          } else {
              await context.sendActivity(MessageFactory.text(`default_router: ${slackChatResponse.assistantResponse}`));
              slackChatMessagesUser.push({role:"assistant", content: slackChatResponse.assistantResponse});
              await this.slackChatMessagesProperty.set(context, slackChatMessagesUser);
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