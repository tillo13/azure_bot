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

async function generateChatPayload(chatMessagesUser, aadObjectID, isFirstInteraction) {
	let chatPayload;
	if (!isFirstInteraction) {
		chatPayload = await getLast24HrInteractionPerUserFromDB(aadObjectID);
	} else {
		chatPayload = chatMessagesUser;
	}
	console.log("\n\n**MESSAGE_HANDLER.JS: The chatPayload variable is: ", chatPayload);
	return chatPayload;
}

async function processMessage(context, chatMessagesUser, chatPayload, isFirstInteraction, propertyAccessor, pathConfig){
	let botCalled = context.activity.text.includes('@bot') || context.activity.text.includes('@atbot');
	let assistantResponse = botCalled ? 
		await handleTeamsMessage(context, chatPayload, isFirstInteraction, propertyAccessor, pathConfig) :
		await chatCompletion(chatPayload, pathConfig.personality, context.activity.channelId);
	
	if (typeof assistantResponse === 'object' && assistantResponse !== null) {
		if(assistantResponse.assistantResponse) assistantResponse = assistantResponse.assistantResponse;
		else assistantResponse = JSON.stringify(assistantResponse); 
	}

	chatMessagesUser.push({role: "assistant", content: assistantResponse });
	await context.sendActivity(MessageFactory.text(assistantResponse));
}

async function handleMessageFromMSTeams(context, chatMessagesUser, isFirstInteraction, propertyAccessor, pathConfig) {
	if (!isFromMSTeams(context)) return false;
	console.log("\n\n**MESSAGE_HANDLER.JS: Message is from MS Teams, and we are about to handle it.");
	const aadObjectID = context.activity.from.aadObjectId;
	let chatPayload = await generateChatPayload(chatMessagesUser, aadObjectID, isFirstInteraction);
	await processMessage(context, chatMessagesUser, chatPayload, isFirstInteraction, propertyAccessor, pathConfig);
	return true;
}

async function handleMessageFromSlack(context, chatMessagesUser, savedThread_ts, botInvokedFlag, threadproperty, personality, pathConfig) {
	if (!isFromSlack(context)) return false;
	console.log("\n\n**MESSAGE_HANDLER.JS: Message is from Slack, and we are about to handle it.");
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
		console.log("\n\n**MESSAGE_HANDLER.JS: handleMessageFromSlack finished processing. Check if it properly handled the message.");
		return true;
	}

	console.log("\n\n**MESSAGE_HANDLER.JS: Message not handled by Slack handlers, falling through.");
	return false;
}

async function handleDefault(context, chatMessagesUser, personality) {
	if (!isFromSlack(context)) return false;

	console.log("\n\n**MESSAGE_HANDLER.JS: Message is from Slack, but handled in the default path.");

	if (context.activity.channelData?.SlackMessage?.event?.thread_ts) {
		const apiToken = context.activity.channelData?.ApiToken;
		const slack_channel_id = context.activity.channelData.SlackMessage.event.channel;
		const thread_ts = context.activity.channelData?.SlackMessage?.event?.thread_ts;
		
		const conversationHistory = await fetchConversationHistory(slack_channel_id, thread_ts, apiToken);
		const parentMessage = conversationHistory.messages[0];
		const botId = await getBotId(apiToken);
		const invokedViaBotThread = parentMessage.text.toLowerCase().includes(botId.toLowerCase());
		console.log("\n\n**MESSAGE_HANDLER.JS: invokedViaBotThread: ", invokedViaBotThread);
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