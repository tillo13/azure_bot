 //2023sept21 242pm test GOLDEN VERSION//

 const { MessageFactory } = require('botbuilder');
 const chatCompletion = require('./chat_helper');
 const https = require('https');
 
 function isFromSlack(context) {
   return context.activity.channelId === 'slack';
 }
 
 function processSlackResponseMessage(assistantResponse) {
     return `slack_chat_path: ${assistantResponse}`;
 }
 
 function getBotId(apiToken) {
   const options = {
     hostname: 'slack.com',
     path: '/api/auth.test',
     method: 'POST',
     headers: {
       'Content-Type': 'application/x-www-form-urlencoded',
       'Authorization': `Bearer ${apiToken}`
     }
   };
 
   let userId = '';
 
   return new Promise((resolve, reject) => {
     const req = https.request(options, res => {
       res.setEncoding('utf8');
       res.on('data', chunk => {
         userId += chunk;
       });
 
       res.on('end', () => {
         userId = JSON.parse(userId).user_id; 
         resolve(userId);
       });
     });
 
     req.on('error', (e) => {
       console.error(`problem with request: ${e.message}`);
       reject(e);
     });
 
     req.end();
   });
 }
 
 // Isolate the postMessageToSlack as a tasks method in broken_slack.js and 
 // make it an independent function in the new_slack.js like this.
 
 async function postMessageToSlack(channel_id, thread_ts, message, apiToken) {
   console.log("\n\n***SLACK.JS: Post message to Slack.");
 
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
 
   return new Promise((resolve, reject) => {
     const req = https.request(options, (res) => {
       let data = '';
 
       res.on('data', (chunk) => {
         data += chunk;
       });
 
       res.on('end', () => {
         console.log("\n\n***SLACK.JS: RESPONSE message payload from Slack:\n", JSON.parse(data)); // Log the response from Slack
         resolve(data);
       });
     });
 
     req.on('error', (error) => {
       console.error("Failed to post message to Slack: ", error);
       reject(error);
     });
     req.write(data);
     req.end();
   });
 }
 
 async function postChatHistoryToSlack(channel_id, thread_ts, apiToken, botId) {
   const options = {
     hostname: 'slack.com',
     path: `/api/conversations.replies?channel=${channel_id}&ts=${thread_ts}`,
     method: 'GET',
     headers: {
       'Authorization': `Bearer ${apiToken}`
     }
   };
 
   let responsePayload = '';
 
   return new Promise((resolve, reject) => {
     const req = https.request(options, res => {
       res.on('data', d => {
         responsePayload += d;
       });
 
       res.on('end', () => {
        let messages = [];
        let responseParsed = JSON.parse(responsePayload);
        if (responseParsed.messages) {
          messages = responseParsed.messages.filter(msg => !msg.hasOwnProperty('bot_id'));
        }
 
         // Format the messages
         let formattedMessages = "\n***SLACK.JS: letMeCheckFlag invoked!\nUSER MESSAGES IN THIS THREAD**\n";
         messages.forEach((msg, idx) => {
           formattedMessages += `\n${idx + 1}. [${msg.ts}] ${msg.text}\n`;
         });
         formattedMessages += "\n***END OF USER MESSAGES***";
         //adding these 2 lines to print to the console, regardless
         console.log(formattedMessages); 
 
         //clean the payload and prepare it for openai
         let cleanedFormattedMessages;
 
         try {
           // Remove all stars
           cleanedFormattedMessages = formattedMessages.replace(/\*/g, '');
         
           // Remove specific phrases
           cleanedFormattedMessages = cleanedFormattedMessages
             .replace(/SLACK.JS: letMeCheckFlag invoked!/i, '')
             .replace(/USER MESSAGES IN THIS THREAD/i, '')
             .replace(/END OF USER MESSAGES/i, '')
             .replace(/\n/g, ' ') // remove newline characters
             .trim();
         
           cleanedFormattedMessages = "Here is what the user said so far in this thread, with timestamps: " + cleanedFormattedMessages;
         
         } catch (err) {
           console.error('Error while parsing the message: ', err);
           cleanedFormattedMessages = "Here is what the user said so far in this thread, with timestamps: " + formattedMessages;
         }
         
         console.log('\n\n****SLACK.JS: cleaned payload ready for Openai: ', cleanedFormattedMessages);
         
         resolve(cleanedFormattedMessages);
 
         // Call chat.postMessage API
         let postOptions = {
           hostname: 'slack.com',
           path: '/api/chat.postMessage',
           method: 'POST',
           headers: {
             'Content-Type': 'application/json; charset=utf-8',
             'Authorization': `Bearer ${apiToken}`
           }
         };
 
         let postReq = https.request(postOptions, res => {
           res.on('end', () => {
             console.log('\n\n****SLACK.JS: Successful postChatHistoryToSlack()');
             // to pass cleanMessage payload resolve();
           });
         });
 
         postReq.on('error', error => {
           console.error('\n\n****SLACK.JS: Error during postChatHistoryToSlack() post request:', error);
           reject(error);
         });
 
         postReq.write(JSON.stringify({
           channel: channel_id,
           text: formattedMessages,
           thread_ts: thread_ts,
         }));
 
         postReq.end();
       });
     });
 
     req.on('error', error => {
       console.error("\n\n****SLACK.JS: Error in postChatHistoryToSlack(): ", error);
       reject(error);
     });
 
     req.end();
   });
 };
 
 let activeThreads = {};
 async function handleSlackMessage(context, assistantResponse, letMeCheckFlag) {
  console.log('\n\n***SLACK.JS: handleSlackMessage called with assistantResponse:', assistantResponse);
  console.log('\n\n***SLACK.JS: letMeCheckFlag is:', letMeCheckFlag);

  let cleanedFormattedMessages;  // Declare it here

  let thread_ts = ""; 
  if (context.activity.channelData && context.activity.channelData.SlackMessage && context.activity.channelData.SlackMessage.event) {
    thread_ts = context.activity.channelData.SlackMessage.event.thread_ts || context.activity.channelData.SlackMessage.event.ts;
  }

  if (context.activity.channelData && context.activity.channelData.ApiToken && context.activity.channelData.SlackMessage && context.activity.channelData.SlackMessage.event.channel) {
      const apiToken = context.activity.channelData.ApiToken;
      const channel_id = context.activity.channelData.SlackMessage.event.channel;
      const botId = await getBotId(apiToken);
      cleanedFormattedMessages = await postChatHistoryToSlack(channel_id, thread_ts, apiToken, botId); 
  }

   // Process the response message
   if (context.activity.text && activeThreads[thread_ts]) {
    if (context.activity.channelId === 'slack' && thread_ts !== "") {
       // Post the OpenAI response
       await postMessageToSlack(context.activity.channelData.SlackMessage.event.channel, thread_ts, assistantResponse, context.activity.channelData.ApiToken);
    }
  }

  // Check conditions and query conversation history
  if (context.activity.channelData && context.activity.channelData.ApiToken && context.activity.channelData.SlackMessage && context.activity.channelData.SlackMessage.event.channel) {
     let apiToken = context.activity.channelData.ApiToken;
     let channel_id = context.activity.channelData.SlackMessage.event.channel;
     cleanedFormattedMessages = await postChatHistoryToSlack(channel_id, thread_ts, apiToken, botId); 
  }

 return cleanedFormattedMessages;
};

module.exports = { handleSlackMessage, isFromSlack };