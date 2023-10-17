const {
	OpenAIClient,
	AzureKeyCredential
} = require("@azure/openai");
const modelCosts = require('./openai_costs_2023sept7.json');

const {
	getAADObjectIdFromDB,
	getLast24HrInteractionPerUserFromDB
} = require('./chatgpt_utils');

const MAX_OPENAI_TOKENS = 700;

const bot_response_patterns = [
	"as an artificial intelligence",
	"as a digital assistant",
	"as a computer program",
	"as a helpful assistant",
	"as a virtual assistant",
	"as a language model",
	"access to personal information",
	"access to previous conversations",
	"shared in previous conversations",
	"have access to past conversations",
	"just a virtual assistant",
	"as a text-based AI",
	"as an AI system",
	"being a digital entity",
	"as an AI",
	"as a machine learning model",
	"as a AI assistant",
	"as a machine learning assistant",
	"access to the conversation",
	"have access to personal data",
	"not privy to that information",
	"just a helpful assistant",
	"just an ai"
	// Include any more patterns...
];

const frustrationPrompts = [
	"you're not getting it",
	"you don't understand",
	"no",
	"not right",
	"incorrect",
	"wrong",
	"that's not correct",
	"try again",
	"you're not listening",
	"you're missing the point",
	"you're off the mark",
	"that's not right",
	"you're not making sense",
	"I didn't ask for this",
	"that doesn't help",
	"you're misunderstanding",
	"stop wasting my time",
	"you're clueless",
	"you're not helping",
	"this is frustrating"
];

function validateOpenAITokens(tokens) {
	if (tokens <= 0 || tokens > 4096) {
		console.error('Invalid setting for MAX_OPENAI_TOKENS. It should be between 1 and 4096.');
		return;
	}
	return tokens;
}

function shouldRequery(responseContent) {
	const lowerCasedResponse = responseContent.toLowerCase();
	return bot_response_patterns.some(pattern =>
		lowerCasedResponse.includes(pattern.toLowerCase())
	);
}

function frustrationCounter(userMessage) {
	const lowerCasedMessageWords = userMessage.toLowerCase().split(' ');

	let frustrationCount = 0;
	for (let prompt of frustrationPrompts) {
		if (lowerCasedMessageWords.includes(prompt.toLowerCase())) {
			frustrationCount++;
			break;
		}
	}
	return frustrationCount;
}

async function chatCompletion(chatID, roleMessage, channelId, isActiveThread) {
	const endpoint = process.env.OPENAI_API_BASE_URL;
	const client = new OpenAIClient(endpoint, new AzureKeyCredential(process.env.OPENAI_API_KEY));

	const deploymentId = process.env.OPENAI_API_DEPLOYMENT;
	const validatedTokens = validateOpenAITokens(MAX_OPENAI_TOKENS);
	if (!validatedTokens) return;

	// Get the AADObjectID from the chat ID
	let AADObjectId = await getAADObjectIdFromDB(chatID);
	console.log("***AADObjectId: ", AADObjectId); //New console log added

	// Use the AADObjectID to retrieve the chat messages
	let chatMessages = await getLast24HrInteractionPerUserFromDB(AADObjectId);
	console.log("***chatMessages before processing: ", chatMessages); //New console log added

	if (!chatMessages || chatMessages[0].role !== "system") {
		chatMessages.unshift({
			role: "system",
			content: roleMessage
		});
	}

	let lastUserMessage = chatMessages[chatMessages.length - 1].content;
	let frustrationCount = frustrationCounter(lastUserMessage);
	console.log("***frustrationCount: ", frustrationCount); //New console log added

	try {
		let result = await client.getChatCompletions(deploymentId, chatMessages, {
			maxTokens: validatedTokens
		});

		if (result && result.choices[0]?.message?.content) {
			let assistantResponse = result.choices[0].message.content;
			let totalTokens = result.usage.totalTokens;
			console.log("***totalTokens: ", totalTokens); //New console log added

			let turboCost = (totalTokens / 1000) * modelCosts['Language Models']['GPT-3.5 Turbo']['4K context']['Output'];
			let gpt4Cost = (totalTokens / 1000) * modelCosts['Language Models']['GPT-4']['8K context']['Output'];

			let letMeCheckFlag = shouldRequery(assistantResponse);
			console.log("***letMeCheckFlag: ", letMeCheckFlag); //New console log added

			try {
				let chat_id = result.id || Date.now();
				let dataToSave = {
					chat_id: chat_id,
					timestamp: new Date(),
					user_message: lastUserMessage,
					assistant_response: assistantResponse,
					is_active_thread: isActiveThread,
					incoming_channel_source: channelId,
					total_tokens: totalTokens,
					payload_source: JSON.stringify(chatMessages),
					total_tokens_in_chat: result.usage.totalTokens,
					chat_gpt3_5turbo_cost_estimate: turboCost,
					chat_gpt4_cost_estimate: gpt4Cost,
					frustration_count: frustrationCount,
					let_me_check_flag: letMeCheckFlag,
					requery: letMeCheckFlag
				};
				await chatHelperSaveDataToPostgres(dataToSave);

			} catch (error) {
				console.error('Failed to save chat data to PostgreSQL. Error:', error);
			}

			return {
				'assistantResponse': assistantResponse,
				'chats': chatMessages,
				'requery': letMeCheckFlag,
				'letMeCheckFlag': letMeCheckFlag
			};
		} else {
			console.log('No content in API response');
			return {
				'assistantResponse': "I'm sorry, I couldn't understand that. Could you please try again?",
				'chats': chatMessages
			};
		}
	} catch (error) {
		console.error("An error occurred while interacting with OpenAI API", error);
		throw error;
	}
}

module.exports = chatCompletion;