const { MessageFactory } = require('botbuilder');
const chatCompletion = require('./chat_helper');

async function handleSlackMessage(context, slackChatMessagesProperty, slackChatThreadHistory, slackChatResponse) {
  let slackChatMessagesUser = await slackChatMessagesProperty.get(context, []);
  let slackThreadId = context.activity.conversation.id + (context.activity.replyToId ? ':' + context.activity.replyToId : '');
  let slackThreadHistory = await slackChatThreadHistory.get(context, {id: slackThreadId, messages: []});

  const slackReplyActivity = MessageFactory.text(`slack_chat_path: ${slackChatResponse.assistantResponse}`);
  slackReplyActivity.conversation = context.activity.conversation;
  if (context.activity.replyToId) {
      slackReplyActivity.conversation.id += ":" + context.activity.channelData.SlackMessage.ts;
  }

  await context.sendActivity(slackReplyActivity);

  slackChatMessagesUser.push({role:"assistant", content: slackChatResponse.assistantResponse});
  slackThreadHistory.messages.push({role:"assistant", content: slackChatResponse.assistantResponse});
  await slackChatMessagesProperty.set(context, slackChatMessagesUser);
  await slackChatThreadHistory.set(context, slackThreadHistory);
}

module.exports = handleSlackMessage;