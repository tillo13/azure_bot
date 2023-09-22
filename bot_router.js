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

        this.onMessage(async (context, next) => {
          //Reset chatMessagesUser if it's a new thread.
          let current_thread_ts = context.activity.channelData && context.activity.channelData.SlackMessage && context.activity.channelData.SlackMessage.event ?
                                  context.activity.channelData.SlackMessage.event.thread_ts || context.activity.channelData.SlackMessage.event.ts : "";
          let chatMessagesUser = [];
          console.log('\n\n******BOT_ROUTER.JS: Initialized chatMessagesUser');

          if(current_thread_ts === this.thread_ts) {
               chatMessagesUser = await this.chatMessagesProperty.get(context, []);
          }
          this.thread_ts = current_thread_ts;

          chatMessagesUser.push({role:"user", content:context.activity.text});
          console.log('******BOT_ROUTER.JS: Current content of chatMessagesUser:', chatMessagesUser);

        // Get chatResponse without immediately adding assistant's message and send the cleaned payload
        let chatResponse = await chatCompletion(chatMessagesUser, PERSONALITY_OF_BOT);
        console.log('\n\n******BOT_ROUTER.JS: chatResponse after first chatCompletion call:', chatResponse);

        if(chatResponse.requery){
          const requeryNotice = "Let me check our past conversations, one moment...";
          await context.sendActivity(MessageFactory.text(requeryNotice, requeryNotice));  
            
          // Add 'Let me check...' message to the array
          chatMessagesUser.push({role:"assistant", content:requeryNotice});
        
          chatResponse = await chatCompletion(chatMessagesUser, PERSONALITY_OF_BOT);
      }
    
        // Now add the assistant's message to chatMessagesUser
        chatMessagesUser.push({role:"assistant", content:chatResponse.assistantResponse});
    
        let cleanedFormattedMessages = await handleSlackMessage(context, chatResponse.assistantResponse, chatResponse.letMeCheckFlag);
        console.log('\n\n*****BOT_ROUTER.JS: cleanedFormattedMessages after handleSlackMessage call:', cleanedFormattedMessages);

        console.log(`cleanedFormattedMessages before calling chatCompletion: ${cleanedFormattedMessages}`);
    
        console.log('\n\n****BOT_ROUTER.JS: cleaned payload ready for Openai: ', cleanedFormattedMessages);
        
        // now when chatCompletion is called the 3rd time, pass cleanedFormattedMessages in
        await chatCompletion(chatMessagesUser, PERSONALITY_OF_BOT, cleanedFormattedMessages); // cleanedFormattedMessages is passed here
    
        await this.chatMessagesProperty.set(context, chatMessagesUser);
        console.log("\n\n***BOT_ROUTER.JS: Running_OpenAI payload after saving latest response from OpenAI:\n", chatMessagesUser);

          if (isFromSlack(context)) {
            //await handleSlackMessage(context, chatResponse.assistantResponse, chatResponse.letMeCheckFlag);
            console.log('\n***BOT_ROUTER.JS: letMeCheckFlag is: ', chatResponse.letMeCheckFlag);

          } else {
              const replyActivity = MessageFactory.text(`default_router: ${chatResponse.assistantResponse}`);
              await context.sendActivity(replyActivity);
          }

          //console.log("\n\n\n****BOT_ROUTER.JS current channelData:\n\n", JSON.stringify(context.activity.channelData, null, 2));
          console.log(`\n\n\n****BOT_ROUTER.JS current channelData:\n\n${JSON.stringify(context.activity.channelData, null, 2)}`);

          await next();
        });
    }

    async run(context) {
      await super.run(context);
      await this.userState.saveChanges(context);
  }
}

module.exports.EchoBot = EchoBot;