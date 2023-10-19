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
	// Debug logs
	console.log("\n\n**MESSAGE_HANDLER.JS: In `handleMessageFromMSTeams`, checking if the message is from MS Teams. The context activity channel Id is: ", context.activity.channelId);
	console.log("\n\n**MESSAGE_HANDLER.JS: IS the message from MS Teams? ", isFromMSTeams(context));

	console.log("\n\n**MESSAGE_HANDLER.JS: If we got here, the message is from MS Teams, and we are about to handle it.");

	const aadObjectID = context.activity.from.aadObjectId;
	//DEBUG_PATH: console.log('\n*****MESSAGE_HANDLER.JS [DEBUG]: aad of user: ',aadObjectID );

	if (isFromMSTeams(context)) {
		let chatPayload;
		if (!isFirstInteraction) {
			chatPayload = await getLast24HrInteractionPerUserFromDB(aadObjectID);
			//DEBUG_PATH: console.log("\n\n**MESSAGE_HANDLER.JS: This is NOT first interactiong using getLast24Hrs, meaning it will have a payload regardless, from first interaction...")
		} else {
			chatPayload = chatMessagesUser;
			//DEBUG_PATH:  console.log("\n\n**MESSAGE_HANDLER.JS: This IS first interactiong using chatMessageUser as normal...")
		}
		// const chatResponse = await chatCompletion(chatPayload, pathConfig.personality, context.activity.channelId);
		const assistantResponse = await handleTeamsMessage(context, chatPayload, isFirstInteraction, propertyAccessor, pathConfig); // chatPayload used instead of chatMessagesUser.

		// Add the assistant's response to chatMessagesUser
		chatMessagesUser.push({
			role: "assistant",
			content: assistantResponse
		});
		await context.sendActivity(MessageFactory.text(assistantResponse));

		//DEBUG_PATH:  console.log("\n\n**MESSAGE_HANDLER.JS (handleMessageFromMSTeams) payload: ",{context, chatMessagesUser, isFirstInteraction, propertyAccessor, pathConfig});
		console.log("\n\n**MESSAGE_HANDLER.JS: The chatPayload variable is: ", chatPayload);

		return true;
	}
	return false;
}
async function handleMessageFromSlack(context, chatMessagesUser, savedThread_ts, botInvokedFlag, threadproperty, personality, pathConfig) {
	//debug 
	console.log("\n\n**MESSAGE_HANDLER.JS: In `handleMessageFromSlack`, checking if the message is from Slack. The context activity channel Id is: ", context.activity.channelId);
	console.log("\n\n**MESSAGE_HANDLER.JS: IS the message from Slack? ", isFromSlack(context));


	const current_thread_ts = context.activity.channelData && context.activity.channelData.SlackMessage && context.activity.channelData.SlackMessage.event ?
		context.activity.channelData.SlackMessage.event.thread_ts || context.activity.channelData.SlackMessage.event.ts : "";
	//DEBUG_PATH:  console.log("\n\n**MESSAGE_HANDLER.JS: Current Slack thread timestamp: ", current_thread_ts);
	console.log("\n\n**MESSAGE_HANDLER.JS: If we got here, the message is from Slack and either the bot was called or it's already active in the same thread. We are about to handle this message.");

	savedThread_ts = await threadproperty.get(context, "");

	const botCalled = context.activity.text.includes('@bot') || context.activity.text.includes('@atbot');
	let botInThread = await botInvokedFlag.get(context, false);
	console.log("\n\n**MESSAGE_HANDLER.JS: Is the bot in thread and is the saved thread timestamp same as current thread timestamp? ", botInThread && savedThread_ts === current_thread_ts);
	console.log("\n\n**MESSAGE_HANDLER.JS: Is the bot called in the message? ", botCalled);
	// Reset messages on new thread init
	if (savedThread_ts !== current_thread_ts) {
		chatMessagesUser = [];
		await threadproperty.set(context, current_thread_ts);
	}

	if (botCalled) {
		console.log("\n\n**MESSAGE_HANDLER.JS: '@bot' or '@atbot' mentioned in the message. Bot Invoked: ", botCalled);

		botInThread = true;
		await botInvokedFlag.set(context, botInThread);
		chatMessagesUser.push({
			role: "user",
			content: context.activity.text
		});
	}

	if (isFromSlack(context) && (botCalled || (botInThread && savedThread_ts === current_thread_ts))) {
		console.log("\n\n**MESSAGE_HANDLER.JS: All conditions in handleMessageFromSlack met, now about to process the Slack message.");


		let chatResponse = await chatCompletion(chatMessagesUser, personality, context.activity.channelId);

		// Add this check to determine if it's a Slack message before adding to payload
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
		console.log("\n\n**MESSAGE_HANDLER.JS: handleMessageFromSlack finished processing. Check if it properly handled the message or if it's falling through.");


		return true;

	}
	console.log("\n\n**MESSAGE_HANDLER.JS (handleMessageFromSlack) payload: ", {
		context,
		chatMessagesUser,
		savedThread_ts,
		botInvokedFlag,
		threadproperty,
		personality,
		pathConfig
	});
	return false;
}

async function handleDefault(context, chatMessagesUser, personality) {
	console.log("\n\n**MESSAGE_HANDLER.JS: In `handleDefault`. The context activity channel Id is: ", context.activity.channelId);
	console.log("\n\n**MESSAGE_HANDLER.JS: If we got here, the message was not handled by MSTeams or Slack handlers. Whether the bot was invoked in the parent message of a Slack thread is being checked. We're about to handle this message.");

	if (isFromSlack(context)) {
		console.log("\n\n**MESSAGE_HANDLER.JS: Message from Slack, but in the handleDefault path and do not detect @bot invoke in memory. Checking parentMessage via Slack API...");
		//DEBUG_PATH: console.log("\n\n**MESSAGE_HANDLER.JS: Slack conversation info:", context.activity.conversation);
		//DEBUG_PATH: console.log("\n\n**MESSAGE_HANDLER.JS: Raw Slack data:", context.activity.channelData);

		//go fetch the parent message if it's a thread
		if (isFromSlack(context) && context.activity.channelData?.SlackMessage?.event?.thread_ts) {
			let botId;
			try {
				const apiToken = context.activity.channelData?.ApiToken;

				// Fetch botId and handle any potential errors
				try {
					botId = await getBotId(apiToken);
					console.log("\n\n**MESSAGE_HANDLER.JS: Bot ID: ", botId);
				} catch (error) {
					console.error("\n\n**MESSAGE_HANDLER.JS: Failed to retrieve bot ID. Error: ", error);
				}

				const slack_channel_id = context.activity.channelData.SlackMessage.event.channel;
				const thread_ts = context.activity.channelData?.SlackMessage?.event?.thread_ts;

				const conversationHistory = await fetchConversationHistory(slack_channel_id, thread_ts, apiToken);

				const parentMessage = conversationHistory.messages[0];

				console.log("\n\n**MESSAGE_HANDLER.JS: Success in retrieving the parent message in the thread: ", parentMessage.text);

				let invokedViaBotThread = false;

				if (parentMessage.text.toLowerCase().includes(botId.toLowerCase())) {
					invokedViaBotThread = true;
				}

				console.log("\n\n**MESSAGE_HANDLER.JS: Based on the botID and the payload from the parent, the invokedViaBotThread =", invokedViaBotThread);

			} catch (error) {
				console.error("\n\n**MESSAGE_HANDLER.JS: Failed to retrieve parent message in the thread. Error: ", error);
			}
		}
		return false;
	}

	// Continue with the rest of the function
	const chatResponse = await chatCompletion(chatMessagesUser, personality, context.activity.channelId);
	//DEBUG_PATH: console.log(`\n\n***MESSAGE_HANDLER.JS: assistant responded with: ${chatResponse.assistantResponse}`);

	// Add the assistant's response to chatMessagesUser
	chatMessagesUser.push({
		role: "assistant",
		content: chatResponse.assistantResponse
	});

	await context.sendActivity(MessageFactory.text(`default_router: ${chatResponse.assistantResponse}`));
	//DEBUG_PATH: console.log("\n\n**MESSAGE_HANDLER.JS (handleDefault) payload: ", {context, chatMessagesUser, personality});
	return true;
}

module.exports = {
	handleMessageFromMSTeams,
	handleMessageFromSlack,
	handleDefault
};