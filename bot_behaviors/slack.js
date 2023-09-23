 //2023sep23 402pm PROD GOLDEN VERSION//

 const { MessageFactory } = require('botbuilder');
 const https = require('https');
 const activeThreads = {};
 
 async function executeHttpGetRequest(options) {
   return new Promise((resolve, reject) => {
     https
       .get(options, res => {
         let responsePayload = '';
         res.on('data', (d) => (responsePayload += d));
         res.on('end', () => resolve(JSON.parse(responsePayload)));
         res.on('error', reject);
       })
       .end();
   });
 }
 
 async function executeHttpPostRequest(options, data = '') {
     return new Promise((resolve, reject) => {
       const req = https.request(options, res => {
         let returnData = '';
         res.on('data', chunk => returnData += chunk);
         res.on('end', () => resolve(JSON.parse(returnData)));
         res.on('error', reject);
       });
       req.write(data);
       req.end();
     });
   }
 
 function processSlackResponseMessage(assistantResponse) {
     return `slack_chat_path: ${assistantResponse}`;
   }
 
 function isFromSlack(context) {
     return context.activity.channelId === 'slack';
   }
 
 async function getBotId(apiToken) {
   const options = {
     hostname: 'slack.com',
     path: '/api/auth.test',
     headers: {
       'Content-Type': 'application/x-www-form-urlencoded',
       'Authorization': `Bearer ${apiToken}`
     }
   };
   const response = await executeHttpPostRequest(options);
   return response.user_id;
 }
 
 async function postMessageToSlack(channel_id, thread_ts, message, apiToken) {
   const data = JSON.stringify({
     channel: channel_id,
     thread_ts: thread_ts,
     text: message
   });
 
   const options = {
     hostname: 'slack.com',
     path: '/api/chat.postMessage',
     method: 'POST',
     headers: {
       'Content-Type': 'application/json; charset=utf-8',
       'Authorization': `Bearer ${apiToken}`,
       'Content-Length': data.length
     }
   };
 
   return await executeHttpPostRequest(options, data);
 }
 
 async function fetchConversationHistory(channelId, thread_ts, apiToken) {
   const options = {
     hostname: 'slack.com',
     path: `/api/conversations.replies?channel=${channelId}&ts=${thread_ts}`,
     headers: {
       'Authorization': `Bearer ${apiToken}`
     }
   };
 
   return await executeHttpGetRequest(options);
 }
 
 async function postChatHistoryToSlack(channel_id, thread_ts, apiToken, botId) {
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
   let cleanedFormattedMessages;
   
   // Fetch conversation details from the current context
   const thread_ts = context.activity.channelData?.SlackMessage?.event?.thread_ts || context.activity.channelData?.SlackMessage?.event?.ts;
 
   if (context.activity.text.includes('@bot') || context.activity.text.includes('@atbot')) {
     activeThreads[thread_ts] = true;
   }
 
   if (!activeThreads[thread_ts] && !context.activity.conversation.isGroup) {
     console.log('\n\n***SLACK.JS: SLACK_PAYLOAD_WITHOUT_CALLING_BOT -- IGNORING! User said: ', context.activity.text);
     return;
   }
 
   // If 'letMeCheckFlag' is true, then fetch the chat history
   if (letMeCheckFlag && apiToken) {
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
       // Process the assistant response message for Slack
       let slackMessageResponse = processSlackResponseMessage(assistantResponse);
       const replyActivity = MessageFactory.text(slackMessageResponse);
 
       // Try to send as thread reply in Slack
       try {
         replyActivity.conversation = context.activity.conversation;
 
         // Verify if thread_ts is already in the conversation id
         if (!replyActivity.conversation.id.includes(thread_ts)) {
           replyActivity.conversation.id += ':' + thread_ts;
         }
 
         await context.sendActivity(replyActivity);
         console.log('\n\n***SLACK.JS: clean format regardless', cleanedFormattedMessages); 
         return cleanedFormattedMessages;
 
       } catch (error) {
         console.error('\n\n***SLACK.JS: An error occurred while trying to reply in the thread:', error);
       }
     } else if (thread_ts === "") {
       console.log('\n\n***SLACK.JS: Can\'t identify thread, not posting anything.***');
     } else {
       console.log('\n\n***SLACK.JS: Message is not invoking the bot, ignoring for now!***');
       }
     }
   };
 
 module.exports = { handleSlackMessage, isFromSlack };