const {
	MessageFactory
} = require('botbuilder');
const {
	handleSlackMessage,
	isFromSlack
} = require('./slack');
const {
	handleTeamsMessage,
	isFromMSTeams
} = require('./msteams');
const chatCompletion = require('./chat_helper');
const {
	fetchConversationHistory,
	getBotId
} = require('./slack_utils');
const {
	getLast24HrInteractionPerUserFromDB
} = require('./chatgpt_utils');

async function updateThreads(context, savedThread_ts, threadproperty) {
	const current_thread_ts = context.activity.channelData && context.activity.channelData.SlackMessage && context.activity.channelData.SlackMessage.event ?
		context.activity.channelData.SlackMessage.event.thread_ts || context.activity.channelData.SlackMessage.event.ts : "";
	if (savedThread_ts !== current_thread_ts) {
		await threadproperty.set(context, current_thread_ts);
	}
	console.log("\n\n**MESSAGE_HANDLER.JS: Current Slack thread timestamp: ", current_thread_ts);
	return current_thread_ts
}

function shouldInvokeBot(context) {
  return context.activity.text.includes('@bot') || context.activity.text.includes('@atbot');
}

function generateResponse(context, chatResponse) {
  return context.activity.channelId === 'slack' ? chatResponse.assistantResponse : `default_router: ${chatResponse.assistantResponse}`;
}

async function generateChatPayload(isFirstInteraction, chatMessagesUser, aadObjectID) {
  return !isFirstInteraction 
    ? await getLast24HrInteractionPerUserFromDB(aadObjectID)
    : chatMessagesUser;
}

async function retrieveSlackParentMessage(apiToken, slack_channel_id, thread_ts) {
  const conversationHistory = await fetchConversationHistory(slack_channel_id, thread_ts, apiToken);
  return conversationHistory.messages[0];
}

async function handleMessageFromMSTeams(context, chatMessagesUser, isFirstInteraction, propertyAccessor, pathConfig) {
  if (!isFromMSTeams(context)) return false;

  const aadObjectID = context.activity.from.aadObjectId;
  const chatPayload = await generateChatPayload(isFirstInteraction, chatMessagesUser, aadObjectID);
  const assistantResponse = await handleTeamsMessage(context, chatPayload, isFirstInteraction, propertyAccessor, pathConfig);
  chatMessagesUser.push({role: "assistant", content: assistantResponse});

  await context.sendActivity(MessageFactory.text(assistantResponse));
  return true;
}

async function handleMessageFromSlack(context, chatMessagesUser, savedThread_ts, botInvokedFlag, threadproperty, personality, pathConfig) {
	if (!isFromSlack(context)) return false;
  
	savedThread_ts = await threadproperty.get(context, "");
	let current_thread_ts = await updateThreads(context, savedThread_ts, threadproperty);
	const botCalled = context.activity.text.includes('@bot') || context.activity.text.includes('@atbot');
	let botInThread = await botInvokedFlag.get(context, false);
  
	if (botCalled) {
	  botInThread = true;
	  await botInvokedFlag.set(context, botInThread);
	  chatMessagesUser.push({role: "user", content: context.activity.text});
	}
  
	if (botInThread && savedThread_ts === current_thread_ts) {
	  const chatResponse = await chatCompletion(chatMessagesUser, personality, context.activity.channelId);
  
	  if (context.activity.channelId === 'slack') { 
		if (chatResponse.requery && chatResponse.isActiveThread) { 
		  const chatResponses = await chatCompletion(chatMessagesUser, personality, context.activity.channelId, result.isActiveThread); 
		  chatMessagesUser.push({ role: "assistant", content: chatResponses.assistantResponse }); 
		}
		chatMessagesUser.push({ role: "assistant", content: chatResponse.assistantResponse }); 
	  }
  
	  await handleSlackMessage(context, chatResponse.assistantResponse, chatResponse.letMeCheckFlag, pathConfig);
	  return true;
	}
	return false;
  }

async function handleDefault(context, chatMessagesUser, personality) {
	const chatResponse = await chatCompletion(chatMessagesUser, personality, context.activity.channelId);
	const response = generateResponse(context, chatResponse);

	chatMessagesUser.push({ role: "assistant", content: chatResponse.assistantResponse });
	await context.sendActivity(MessageFactory.text(response));

	return true;
}

module.exports = {
  handleMessageFromMSTeams,
  handleMessageFromSlack,
  handleDefault
};