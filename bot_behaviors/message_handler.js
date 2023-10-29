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

async function handleMessageFromMSTeams(context, chatMessagesUser, isFirstInteraction, propertyAccessor, pathConfig) {
	if (!isFromMSTeams(context)) return false;
	console.log("\n\n**MESSAGE_HANDLER.JS: Incoming message is from MSTeams, processing...");


	const aadObjectID = context.activity.from.aadObjectId;
	const chatPayload = !isFirstInteraction
		? await getLast24HrInteractionPerUserFromDB(aadObjectID)
		: chatMessagesUser;

	const assistantResponse = await handleTeamsMessage(context, chatPayload, isFirstInteraction, propertyAccessor, pathConfig);

	chatMessagesUser.push({
		role: "assistant",
		content: assistantResponse
	});

	await context.sendActivity(MessageFactory.text(`msteams_router: ${assistantResponse}`));
	return true;
}

async function handleMessageFromSlack(context, chatMessagesUser, savedThread_ts, botInvokedFlag, threadproperty, personality, pathConfig) {
	if (!isFromSlack(context)) return false;
	console.log("\n\n**MESSAGE_HANDLER.JS: Incoming message is from Slack, processing...");

	savedThread_ts = await threadproperty.get(context, "");
	const current_thread_ts = context.activity.channelData?.SlackMessage?.event?.thread_ts
		|| context.activity.channelData?.SlackMessage?.event?.ts
		|| "";

	if (savedThread_ts !== current_thread_ts) {
		chatMessagesUser = [];
		await threadproperty.set(context, current_thread_ts);
	}

	const botCalled = context.activity.text.includes('@bot') || context.activity.text.includes('@atbot');
	let botInThread = await botInvokedFlag.get(context, false);

	if (botCalled) {
		botInThread = true;
		await botInvokedFlag.set(context, botInThread);
		chatMessagesUser.push({
			role: "user",
			content: context.activity.text
		});
	}

	if (botCalled || (botInThread && savedThread_ts === current_thread_ts)) {
		const chatResponse = await chatCompletion(chatMessagesUser, personality, context.activity.channelId);

		if (context.activity.channelId === 'slack') {
			if (chatResponse.requery && chatResponse.isActiveThread) {
				const chatResponses = await chatCompletion(chatMessagesUser, personality, context.activity.channelId, result.isActiveThread);
				chatMessagesUser.push({
					role: "assistant",
					content: chatResponses.assistantResponse
				});
			}

			chatMessagesUser.push({
				role: "assistant",
				content: chatResponse.assistantResponse
			});
		}

		await handleSlackMessage(context, chatResponse.assistantResponse, chatResponse.letMeCheckFlag, pathConfig);

		return true;
	}

	return false;
}

async function handleDefault(context, chatMessagesUser, personality) {
	const chatResponse = await chatCompletion(chatMessagesUser, personality, context.activity.channelId);
	console.log("\n\n**MESSAGE_HANDLER.JS: Incoming message is from Default, processing...");

	chatMessagesUser.push({
		role: "assistant",
		content: chatResponse.assistantResponse
	});

	await context.sendActivity(MessageFactory.text(`default_router: ${chatResponse.assistantResponse}`));
	return true;
}

module.exports = {
	handleMessageFromMSTeams,
	handleMessageFromSlack,
	handleDefault
};