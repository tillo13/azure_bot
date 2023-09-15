const { MessageFactory } = require('botbuilder');
const chatCompletion = require('./chat_helper');

async function handleSlackMessage(context) {
  let chatMessagesUser = await context.slackChatMessagesProperty.get(context, []);
  let slackThreadId = context.activity.conversation.id + (context.activity.replyToId ? ':' + context.activity.replyToId : '');
  let slackThreadHistory = await context.slackChatThreadHistory.get(context, { id: slackThreadId, messages: [] });

  chatMessagesUser.push({ role: "user", content: context.activity.text });
  slackThreadHistory.messages.push({ role: "user", content: context.activity.text });

  let chatResponse = await chatCompletion(chatMessagesUser, SLACK_PERSONALITY_OF_BOT);

  if (chatResponse.requery) {
      const requeryNotice = "Let me check our past conversations, one moment...";
      await context.sendActivity(MessageFactory.text(requeryNotice, requeryNotice));
      chatResponse = await chatCompletion(slackThreadHistory.messages, SLACK_PERSONALITY_OF_BOT);
  }

  chatMessagesUser.push({ role: "assistant", content: chatResponse.assistantResponse });
  slackThreadHistory.messages.push({ role: "assistant", content: chatResponse.assistantResponse });
  await context.slackChatMessagesProperty.set(context, chatMessagesUser);
  await context.slackChatThreadHistory.set(context, slackThreadHistory);

  // Create the reply with the assistant response text from the response object
  const replyActivity = MessageFactory.text(`slack_chat_path: ${chatResponse.assistantResponse}`);

  // Try to send as thread reply in Slack
  try {
      // Copy the conversation object from original message
      replyActivity.conversation = context.activity.conversation;

      // Append the ID of the parent message to post our message as a reply.
      if (context.activity.replyToId) {
          replyActivity.conversation.id += ":" + context.activity.channelData.SlackMessage.event.ts;
      }
  } catch (error) {
      console.error("An error occurred while trying to reply in thread", error);
  }

  await context.sendActivity(replyActivity);
}

module.exports = handleSlackMessage;