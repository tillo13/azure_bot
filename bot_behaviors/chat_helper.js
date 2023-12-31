//2023oct30 add in cosine similarity score
const {
	validateOpenAITokens,
	shouldRequery,
	formatChatPayload,
	frustrationCounter,
	handleFrustration,
	calculateCost,
} = require('./chat_helper_utils/chat_configs');

const {
	initialSearchVectorSimilarity,
	handleSearchSimilarity,
	formatWeaviateResponse,
	enhanceResponseWithWeaviate,
} = require('./weaviate_utils');

const {
	chatHelperSaveDataToPostgres,
	getAADObjectIdFromDB,
	getLast24HrInteractionPerUserFromDB,
	recreateGptPayloadViaDB
} = require('../utilities/postgres_utils');
const {
	OpenAIClient,
	AzureKeyCredential
} = require("@azure/openai");

const {
	GLOBAL_APP_VERSION,
	MAX_OPENAI_TOKENS,
	COSINE_SIMILARITY_THRESHOLD,
	FOOTER_NO_MATCH_MESSAGE,
	FOOTER_HIGHEST_MATCH_MESSAGE,
	FOOTER_GENERAL_POSTFIX,
	FOOTER_GPT4_PLUS_WEAVIATE_MESSAGE
} = require('../utilities/global_configs');

const {
	invokeOpenaiGpt4
} = require('./gpt4_invoke');

const checkMessage = "Let me check our past conversations in this exact thread, one moment...";
let chatIdHistoryLog = [];
let chatHistory = [];

async function initializeChat(chatTexts, roleMessage) {
	let chatMessages = Array.isArray(chatTexts) ? chatTexts : [];

	if (!chatMessages.length || chatMessages[0].role !== "system") {
		chatMessages.unshift({
			role: "system",
			content: roleMessage
		});
	}
	const lastUserMessageObj = chatMessages.filter((msg) => msg.role === 'user').pop();
	const lastUserMessage = lastUserMessageObj ? lastUserMessageObj.content : '';
	const weaviateResponse = await initialSearchVectorSimilarity(lastUserMessage);
	let userMessages = chatMessages.filter((msg) => msg.role === 'user');
	userMessages.forEach((msg) => {
		frustrationCounter(msg.content);
	});
	return {
		chatMessages,
		lastUserMessage
	};
}

async function interactWithOpenAI(newCleanChatMessages) {
	const endpoint = process.env.OPENAI_API_BASE_URL;
	const client = new OpenAIClient(endpoint, new AzureKeyCredential(process.env.OPENAI_API_KEY));
	const deploymentId = process.env.OPENAI_API_DEPLOYMENT;
	const validatedTokens = validateOpenAITokens(MAX_OPENAI_TOKENS);
	if (!validatedTokens) return;
	let result;
	try {
		result = await client.getChatCompletions(deploymentId, newCleanChatMessages, {
			maxTokens: validatedTokens
		});
	} catch (error) {
		console.error("An error occurred while interacting with OpenAI API", error);
		throw error;
	}
	return result;
}

function extractMessages(chatMessages, noChatManipulation = false) {
	console.log(`\n\n***CHAT_HELPER.JS: noChatManipulation is set to: ${noChatManipulation}. If true, the function will only return the input chatMessages array as is, without any manipulation or cleaning. If false, the function will perform manipulation and cleaning on the chatMessages array.`);

	if (noChatManipulation) {
		return {
			newCleanChatMessages: chatMessages,
			duplicatesRemoved: 0,
			certainlyMessages: []
		};
	}

	let cleanConversation = '';
	chatMessages.forEach((msg, index) => {
		const role = msg.role.toUpperCase();
		cleanConversation += `\n${index + 1}. ${role} : ${msg.content}\n`;
	});
	const oldChatMessages = JSON.stringify(chatMessages);
	newCleanChatMessages = chatMessages.filter(item =>
		!item.content.toLowerCase().startsWith('certainly, here is what I have said so far'));
	let seenMessages = new Set(newCleanChatMessages.map(JSON.stringify));
	newCleanChatMessages = Array.from(seenMessages).map(JSON.parse);
	const certainlyMessages = newCleanChatMessages.filter(item => item.content.startsWith('Certainly, here is what I have said so far'));
	const duplicatesRemoved = oldChatMessages.length - newCleanChatMessages.length;
	if (duplicatesRemoved > 0) {
		console.log(`\n\n***CHAT_HELPER.JS: CLEANED CODE OF THIS MANY character DUPLICATES: ${duplicatesRemoved}`);
	}

	return {
		newCleanChatMessages,
		duplicatesRemoved,
		certainlyMessages
	};
}

// Function to create the chat footer
function createChatFooter(weaviateResponse, usedGPT4) {
    let assistantResponse = "";
    let GPT_MODEL = usedGPT4 ? "GPT4+Weaviate" : "GPT-3.5t"; // Determine the GPT model based on the usedGPT4 flag 

    assistantResponse += "\n- - -\ndevData: "; // Add separator and devData heading

    if (usedGPT4) {

        // Append extra statement about assistant's resources when GPT4 is used.
        if (weaviateResponse && weaviateResponse.highestScore) {
            assistantResponse += `|Highest Weaviate match: ${Number(weaviateResponse.highestScore).toFixed(4)} (Threshold: ${COSINE_SIMILARITY_THRESHOLD}) `;
        } else {
            // Just add a statement about using GPT-4 for the reply.
            assistantResponse += FOOTER_GPT4_PLUS_WEAVIATE_MESSAGE;
        }
    } else {
        // Add the highest Weaviate score to the response in any case.
        if (weaviateResponse && weaviateResponse.highestScore) {
            assistantResponse += `|Highest Weaviate match: ${Number(weaviateResponse.highestScore).toFixed(4)} (Threshold: ${COSINE_SIMILARITY_THRESHOLD}) `;
        } else {
            assistantResponse += FOOTER_NO_MATCH_MESSAGE;
        }
    }

    assistantResponse += `| LLM: ${GPT_MODEL} `; // Add GPT Model to the response
	assistantResponse += ` ${FOOTER_GENERAL_POSTFIX} v${GLOBAL_APP_VERSION}`; // Add the general postfix from configs and app version

    return assistantResponse;
}

async function chatCompletion(chatTexts, roleMessage, channelId, isActiveThread) {
	const {
		chatMessages,
		lastUserMessage
	} = await initializeChat(chatTexts, roleMessage);
	//to keep track of whether GPT-4 was used or not.
	let usedGPT4 = false;
	let newCleanChatMessages = chatMessages;
	let frustrationCount = 0;

	//2023oct30 let's integrate weaviate in the response from the bot
	let weaviateResponse = await handleSearchSimilarity(lastUserMessage);

	let frustrationResponse = handleFrustration(frustrationCount);
	if (frustrationResponse) return {
		'assistantResponse': frustrationResponse
	};

	let {
		newCleanChatMessages: chatMessagesAfterExtraction,
		duplicatesRemoved
	} = extractMessages(chatMessages, true);
	let result = await interactWithOpenAI(chatMessagesAfterExtraction);

	if (result && result.choices[0]?.message?.content) {
		let letMeCheckFlag = shouldRequery(result.choices[0].message.content);
		let assistantResponse = result.choices[0].message.content;

		//2023oct30 add in weaviate responses
		try {
			let gpt4Response = await enhanceResponseWithWeaviate(lastUserMessage, chatMessagesAfterExtraction, weaviateResponse);
			if (gpt4Response && typeof gpt4Response === "string" && gpt4Response.trim()) {
				console.log("\n\n***CHAT_HELPER.JS: Response from GPT4: ", gpt4Response);
				chatMessagesAfterExtraction.push({
					role: 'assistant',
					content: gpt4Response
				});
				console.log("\n\n***CHAT_HELPER.JS: Enhanced response to user with Weaviate and GPT4...");
				assistantResponse = gpt4Response;
				//set the flag to true as we've used GPT-4 here for response.
				usedGPT4 = true;
			} else {
				console.log("\n\n***CHAT_HELPER.JS: GPT4 Response is empty or not received");
			}
		} catch (err) {
			// In case of error, log it
			console.log("\n\n***CHAT_HELPER.JS: Error occurred while enhancing with Weaviate: ", err);
			// But continue execution without adding Weaviate info...
		}

		console.log("\n\n***CHAT_HELPER.JS: gpt35 Assistant's response:", assistantResponse, "Requery needed:", letMeCheckFlag);

		// Add the chat footer to the assistant's response
		assistantResponse += createChatFooter(weaviateResponse, usedGPT4);

		if (letMeCheckFlag) {
			let newMessages = [{
				role: 'assistant',
				content: `Let me check our past conversations in this exact thread, one moment...`
			}, ];
			newCleanChatMessages.push(...newMessages);
		}
		// Calculate cost & save data...
		let {
			turboCost,
			gpt4Cost
		} = calculateCost(result.usage.totalTokens);

		let chat_id = result.id ? result.id : Date.now(); // Default to current time if id doesn't exist

		let dataToSave = {
			chat_id: chat_id,
			timestamp: new Date(),
			user_message: lastUserMessage,
			assistant_response: result.choices[0].message.content,
			is_active_thread: isActiveThread,
			incoming_channel_source: channelId,
			frustration_count: frustrationCount,
			let_me_check_flag: letMeCheckFlag,
			requery: letMeCheckFlag,
			total_tokens: result.usage.totalTokens,
			payload_source: JSON.stringify(chatMessagesAfterExtraction),
			cleaned_duplicates_count: duplicatesRemoved,
			total_tokens_in_chat: result.usage.totalTokens,
			chat_gpt3_5turbo_cost_estimate: turboCost,
			chat_gpt4_cost_estimate: gpt4Cost,
		};

		await chatHelperSaveDataToPostgres(dataToSave);
		console.log('\n\n***CHAT_HELPER.JS: chatHelperSaveDataToPostgres saved (assistantResponse) successfully to PostgreSQL!');
		return {
			'assistantResponse': assistantResponse,
			'requery': letMeCheckFlag,
			'letMeCheckFlag': letMeCheckFlag,
			'chats': chatMessagesAfterExtraction
		};
	} else {
		return {
			'assistantResponse': "I'm sorry, I couldn't understand that. Could you please try again?",
			'requery': false,
			'letMeCheckFlag': false,
			'chats': chatMessagesAfterExtraction
		};
	}
}

module.exports = chatCompletion