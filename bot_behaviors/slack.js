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
  
    // Fetch conversation details from the current context
    const thread_ts = context.activity.channelData?.SlackMessage?.event?.thread_ts || context.activity.channelData?.SlackMessage?.event?.ts;
  
    const botKeywords = ['@bot', '@atbot'];

    const text = context.activity.text.trim();
    
    // Remove duplicate mentions
    const dedupedText = text.replace(new RegExp(`(${botKeywords.join('|')})+`, 'ig'), '$1'); 
    
    const isBotInvoked = new RegExp(botKeywords.join('|'), 'i').test(dedupedText);
  
    // Set initial value for activeThreads
    let isActiveThread = false;
  
    // Check if thread is already active
    if (activeThreads[thread_ts]) {
      isActiveThread = true;
    }
  
    // Handle based on bot invocation and active status
    if (!isBotInvoked && !isActiveThread) {
      console.log('THREAD NOT ACTIVE, NO BOT INVOCATION - NOT SENDING TO OPENAI');
      console.log('isBotInvoked:', isBotInvoked); 
console.log('isActiveThread before:', isActiveThread);
    } else if (isBotInvoked && !isActiveThread) {
      // Bot invoked for first time in thread
      activeThreads[thread_ts] = true;
      isActiveThread = true;
      console.log('BOT INVOKED, THREAD NOW ACTIVE - SENDING TO OPENAI');
      console.log('isActiveThread after:', isActiveThread);
    } else if (isActiveThread) {
      // Thread already active, send message
      console.log('THREAD ACTIVE - SENDING TO OPENAI'); 
    }
  
    // Only continue if thread active
    if (!isActiveThread) {
      return {
        cleanedFormattedMessages: null,
        isActiveThread: false  
      };
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
                return {
                    cleanedFormattedMessages: cleanedFormattedMessages,
                    isActiveThread: true
                 };


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