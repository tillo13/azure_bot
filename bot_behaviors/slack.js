 //2023sep23 402pm PROD GOLDEN VERSION//
 const { MessageFactory } = require('botbuilder');
 const { fetchConversationHistory, getBotId, executeHttpPostRequest, postMessageToSlack } = require('./slack_utils');
 const activeThreads = {};
 
 function processSlackResponseMessage(assistantResponse) {
     return `slack_chat_path: ${assistantResponse}`;
 }
 
 function isFromSlack(context) {
     return context.activity.channelId === 'slack';
 }
 
 async function postChatHistoryToSlack(channel_id, thread_ts, apiToken) {
     // Fetch the conversation history
     const conversationHistory = await fetchConversationHistory(channel_id, thread_ts, apiToken);
 
     // Extract the messages from the conversation
     const messages = conversationHistory.messages.filter(msg => !msg.hasOwnProperty('bot_id'));
 
     // Format the messages
     let chatRecord = '\n***SLACK.JS: letMeCheckFlag invoked!\nUSER MESSAGES IN THIS THREAD**\n';
     chatRecord += messages.map((msg, idx) => `\n${idx + 1}. [${msg.ts}] ${msg.text}\n`).join('\n');
     chatRecord += '\n***END OF USER MESSAGES***';
 
     console.log(chatRecord);
 
     // Clean the chat record and prepare it for OpenAI
     const cleanedChatRecord = cleanChatRecord(chatRecord);
 
     console.log('\n\n****SLACK.JS: cleaned payload ready for Openai: ', cleanedChatRecord);
 
     // Post the chat record back to Slack
     await postMessageToSlack(channel_id, thread_ts, chatRecord, apiToken);
 
     return cleanedChatRecord;
 }
 
 function cleanChatRecord(chatRecord) {
     try {
         return chatRecord.replace(/\*/g, '')
             .replace(/SLACK.JS: letMeCheckFlag invoked!/i, '')
             .replace(/USER MESSAGES IN THIS THREAD/i, '')
             .replace(/END OF USER MESSAGES/i, '')
             .replace(/\n/g, ' ') // remove newline characters
             .trim();
     } catch (error) {
         console.error('Error while cleaning the chat record: ', error);
     }
 }
 
 async function handleSlackMessage(context, assistantResponse, letMeCheckFlag) {
    const apiToken = context.activity.channelData?.ApiToken;
    let cleanedFormattedMessages = null;
    let isActiveThread = false;
  
    // Fetch conversation details from the current context
    const thread_ts = context.activity.channelData?.SlackMessage?.event?.thread_ts || context.activity.channelData?.SlackMessage?.event?.ts;
  
    if ((context.activity.text.includes('@bot') || context.activity.text.includes('@atbot')) && (!thread_ts || !activeThreads[thread_ts])) {
      console.log('Valid invoke of bot, continue');
      activeThreads[thread_ts] = true;
      isActiveThread = true;
    } else if(context.activity.conversation.isGroup) {
      console.log('No bot invocation in main channel message. Dropped due to no invoke of bot.');
    } else {
      console.log('Thread message or new thread without bot invocation');
    }
  
    // If 'letMeCheckFlag' is true, then fetch the chat history
    if (letMeCheckFlag && apiToken && activeThreads[thread_ts]) {
        cleanedFormattedMessages = await postChatHistoryToSlack(
            context.activity.channelData.SlackMessage.event.channel,
            thread_ts,
            apiToken,
            await getBotId(apiToken),
        );
        console.log('\n\n*&*&*& SLACK.JS bug check --> Cleaned formatted messages after postChatHistoryToSlack', cleanedFormattedMessages);
    }
  
    if (context.activity.text && activeThreads[thread_ts]) {
        console.log('\n\n***SLACK.JS: Latest user posted message:', context.activity.text); // Always log user message in the console.
    
        if (context.activity.channelId === 'slack' && thread_ts !== "") {
            let slackMessageResponse = processSlackResponseMessage(assistantResponse);
            const replyActivity = MessageFactory.text(slackMessageResponse);
    
            try {
                replyActivity.conversation = context.activity.conversation;
    
                if (!replyActivity.conversation.id.includes(thread_ts)) {
                    replyActivity.conversation.id += ':' + thread_ts;
                }
    
                await context.sendActivity(replyActivity);
                console.log('THREAD_TS/CHANNEL_ID is active, processing payload sending to OpenAI'); 
            } catch (error) {
                console.error('An error occurred while trying to reply in the thread:', error);
            }
        } else if (thread_ts === "") {
            console.log('Can\'t identify thread, not posting anything.');
        } else {
            console.log('Message is not invoking the bot, ignoring for now!');
        }
    }
    return {
        cleanedFormattedMessages: cleanedFormattedMessages,
        isActiveThread: isActiveThread
    };
  };
 
 module.exports = { handleSlackMessage, isFromSlack };