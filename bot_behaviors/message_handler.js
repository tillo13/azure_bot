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
	console.log("\n\n**MESSAGE_HANDLER.JS: In `updateThreads` function");
	const current_thread_ts = context.activity.channelData && context.activity.channelData.SlackMessage && context.activity.channelData.SlackMessage.event ?
		context.activity.channelData.SlackMessage.event.thread_ts || context.activity.channelData.SlackMessage.event.ts : "";
    if (savedThread_ts !== current_thread_ts) {
		await threadproperty.set(context, current_thread_ts);
	}
	return current_thread_ts
}

async function generateChatPayload(chatMessagesUser, aadObjectID, isFirstInteraction) {
	console.log("\n\n**MESSAGE_HANDLER.JS: In `generateChatPayload` function");
	let chatPayload;
	if (!isFirstInteraction) {
		chatPayload = await getLast24HrInteractionPerUserFromDB(aadObjectID);
	} else {
		chatPayload = chatMessagesUser;
	}
	return chatPayload;
}

async function processMessage(context, chatMessagesUser, chatPayload, isFirstInteraction, propertyAccessor, pathConfig){
	console.log("\n\n**MESSAGE_HANDLER.JS: In `processMessage` function");
	let botCalled = context.activity.text.includes('@bot') || context.activity.text.includes('@atbot');
	let assistantResponse = botCalled ? 
	  await handleTeamsMessage(context, {...chatPayload}, isFirstInteraction, propertyAccessor, pathConfig) :
	  await chatCompletion([...chatMessagesUser], pathConfig.personality, context.activity.channelId);
	chatMessagesUser.push({role: "assistant", content: assistantResponse });
	await context.sendActivity(MessageFactory.text(assistantResponse));
  }

async function handleMessageFromMSTeams(context, chatMessagesUser, isFirstInteraction, propertyAccessor, pathConfig) {
	console.log("\n\n**MESSAGE_HANDLER.JS: In `handleMessageFromMSTeams` function");
	if (!isFromMSTeams(context)) return false;
	const aadObjectID = context.activity.from.aadObjectId;
	let chatPayload = await generateChatPayload(chatMessagesUser, aadObjectID, isFirstInteraction);
	await processMessage(context, chatMessagesUser, chatPayload, isFirstInteraction, propertyAccessor, pathConfig);
	return true;
}

async function handleMessageFromSlack(context, chatMessagesUser, savedThread_ts, botInvokedFlag, threadproperty, personality, pathConfig) {
	console.log("\n\n**MESSAGE_HANDLER.JS: In `handleMessageFromSlack` function");
	if (!isFromSlack(context)) return false;
	savedThread_ts = await threadproperty.get(context, "");
	let current_thread_ts = await updateThreads(context, savedThread_ts, threadproperty)
	let botCalled = context.activity.text.includes('@bot') || context.activity.text.includes('@atbot');
	let botInThread = await botInvokedFlag.get(context, false);

	if (botCalled) {
		botInThread = true;
		await botInvokedFlag.set(context, botInThread);
		chatMessagesUser.push({role: "user", content: context.activity.text});
	}

	if (botInThread && savedThread_ts === current_thread_ts) {
		let chatResponse = await chatCompletion(chatMessagesUser, personality, context.activity.channelId);
		chatMessagesUser.push({role: "assistant", content: chatResponse.assistantResponse});
		await handleSlackMessage(context, chatResponse.assistantResponse, chatResponse.letMeCheckFlag, pathConfig);
		return true;
	}

	return false;
}

async function handleDefault(context, chatMessagesUser, personality) {
	console.log("\n\n**MESSAGE_HANDLER.JS: In `handleDefault` function");

	if (!isFromSlack(context)) return false;

	if (isFromSlack(context) && context.activity.channelData?.SlackMessage?.event?.thread_ts) {
		const apiToken = context.activity.channelData?.ApiToken;
		const slack_channel_id = context.activity.channelData.SlackMessage.event.channel;
		const thread_ts = context.activity.channelData?.SlackMessage?.event?.thread_ts;
		
		const conversationHistory = await fetchConversationHistory(slack_channel_id, thread_ts, apiToken);
		const parentMessage = conversationHistory.messages[0];
		const botId = await getBotId(apiToken);
		const invokedViaBotThread = parentMessage.text.toLowerCase().includes(botId.toLowerCase());
	}

	let chatResponse = await chatCompletion(chatMessagesUser, personality, context.activity.channelId);
	chatMessagesUser.push({role: "assistant", content: chatResponse.assistantResponse});
	await context.sendActivity(MessageFactory.text(`default_router: ${chatResponse.assistantResponse}`));
	return true;
}

module.exports = {
	handleMessageFromMSTeams,
	handleMessageFromSlack,
	handleDefault
};