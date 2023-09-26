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
        let chatMessagesUserState = await this.chatMessagesProperty.get(context, { messages: [], thread_ts: "" }) || { messages: [], thread_ts: "" };
    
        chatMessagesUserState.messages.push({ role: "user", content: context.activity.text }); 
    
        if (isFromSlack(context)) { 
            console.log('\n\n****BOT_ROUTER.JS: message from Slack');
    
            const current_thread_ts = context.activity.channelData && context.activity.channelData.SlackMessage && context.activity.channelData.SlackMessage.event 
            ? context.activity.channelData.SlackMessage.event.thread_ts || context.activity.channelData.SlackMessage.event.ts
            : "";
                    
            if(chatMessagesUserState.thread_ts !== current_thread_ts){
                chatMessagesUserState.messages.length = 0; 
            }
            chatMessagesUserState.thread_ts = current_thread_ts;
    
            const botCalled = context.activity.text.includes('@bot') || context.activity.text.includes('@atbot');
            console.log('\n\n****BOT_ROUTER.JS: bot is specifically invoked in the message:', botCalled);
                                                      
            console.log(`\n\n****BOT_ROUTER.JS: channelId is: ${context.activity.channelId}`);
            console.log(`\n\n****BOT_ROUTER.JS: current thread_ts: ${current_thread_ts}`);
            
            if (botCalled || (chatMessagesUserState.thread_ts !== current_thread_ts)) {
                console.log('\n\n****BOT_ROUTER.JS: Bot is specifically invoked in the message OR this message is part of a new thread.');
            
                // Here botCalled || !isNewThread should also be checked and accordingly implemented if required as chatResponse might make 3rd party API call
                const chatResponse = await chatCompletion(chatMessagesUserState.messages, PERSONALITY_OF_BOT, context.activity.channelId);
                console.log('\n\n****BOT_ROUTER.JS: Successfully fetched and processed the chat response from OpenAI API.');
    
                chatMessagesUserState.messages.push({ role: "assistant", content: chatResponse.assistantResponse});
                console.log(`\n\n****BOT_ROUTER.JS: assistant responded with: ${chatResponse.assistantResponse}`);
                const result = await handleSlackMessage(context, chatResponse.assistantResponse, chatResponse.letMeCheckFlag, chatCompletion);
                console.log('\n\n****BOT_ROUTER.JS: Successfully processed and responded to the Slack message.');
    
                const isThreadActive = result.isActiveThread;
                        
                if(chatResponse.requery && isThreadActive){
                    console.log('\n\n****BOT_ROUTER.JS: The flag for a requery with OpenAI was set, and the bot is currently active within a Slack thread.');
    
                    const requeryNotice = "Let me check our past conversations, one moment...";
                    await context.sendActivity(MessageFactory.text(requeryNotice, requeryNotice));
                    chatMessagesUserState.messages.push({ role: "assistant", content: requeryNotice });
                    let chatResponse = await chatCompletion(chatMessagesUserState.messages, PERSONALITY_OF_BOT, context.activity.channelId, isThreadActive);
                    chatMessagesUserState.messages.push({ role: "assistant", content: chatResponse.assistantResponse });
                }
            
                console.log(`\n\n****BOT_ROUTER.JS: letMeCheckFlag is: ${chatResponse.letMeCheckFlag}`);
            } 
        } else {
            console.log('\n\n****BOT_ROUTER.JS: The received message did not originate from Slack.');
    
            const chatResponse = await chatCompletion(chatMessagesUserState.messages, PERSONALITY_OF_BOT, context.activity.channelId);
            console.log(`\n\n****BOT_ROUTER.JS: assistant responded with: ${chatResponse.assistantResponse}`);
            const replyActivity = MessageFactory.text(`default_router: ${chatResponse.assistantResponse}`);
            await context.sendActivity(replyActivity);
        }
    
        // Save the updated state back to the user state.
        await this.chatMessagesProperty.set(context, chatMessagesUserState);
        await next();
    });
    }

    async run(context) {
        await super.run(context);
        await this.userState.saveChanges(context);
    }
}

module.exports.EchoBot = EchoBot;