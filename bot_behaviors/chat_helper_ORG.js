//2023oct27 similifying size of file
const {
    validateOpenAITokens, 
    shouldRequery, 
    formatChatPayload, 
    frustrationCounter, 
	handleFrustration,
    formatCost,
	calculateCost
  } = require('./chat_helper_utils/chat_configs');

const { initialSearchVectorSimilarity, handleSearchSimilarity } = require('./weaviate_utils');


const {
	chatHelperSaveDataToPostgres,
} = require('../utilities/postgres_utils');


const {
	getAADObjectIdFromDB,
	getLast24HrInteractionPerUserFromDB,
	recreateGptPayloadViaDB
} = require('./chatgpt_utils');

const {
	OpenAIClient,
	AzureKeyCredential
} = require("@azure/openai");
//const modelCosts = require('./openai_costs_2023sept7.json');
//not needed per 2023oct12 const postgres_utils = require('../utilities/postgres_utils');

const MAX_OPENAI_TOKENS = 700;
const checkMessage = "Let me check our past conversations in this exact thread, one moment...";
let chatIdHistoryLog = []; // Global usage of array


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
    const userMessages = chatMessages.filter((msg) => msg.role === 'user');
    console.log('\n\n***CHAT_HELPER.JS -> Only USER messages so far via chatmessages:\n');
    userMessages.forEach((msg, index) => {
        console.log(`\n${index + 1}. ${msg.content}\n`);
        // Call frustrationCounter for each user message
        frustrationCounter(msg.content);
    });
    return { chatMessages, lastUserMessage };
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
    } catch(error) {
        console.error("An error occurred while interacting with OpenAI API", error);
        throw error;
    }
    return result;
}

let chatHistory = [];


function extractMessages(chatMessages, noChatManipulation = false) {
    console.log(`\n\n***CHAT_HELPER.JS: noChatManipulation is set to: ${noChatManipulation}. If true, the function will only return the input chatMessages array as is, without any manipulation or cleaning. If false, the function will perform manipulation and cleaning on the chatMessages array.`);

    if (noChatManipulation) {
        return { newCleanChatMessages: chatMessages, duplicatesRemoved: 0, certainlyMessages: [] };
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

    return {newCleanChatMessages, duplicatesRemoved, certainlyMessages};
}

async function chatCompletion(chatTexts, roleMessage, channelId, isActiveThread) {  
    const { chatMessages, lastUserMessage } = await initializeChat(chatTexts, roleMessage);
    // Initialize newCleanChatMessages before use
	let newCleanChatMessages = chatMessages;
	
    
	let frustrationCount = 0;

	const weaviateResponse = await handleSearchSimilarity(lastUserMessage);

	// Print frustration count after each user message is processed
	console.log(`\n\n***CHAT_HELPER.JS: FRUSTRATION COUNT including latest response: ${frustrationCount}`);

	let frustrationResponse = handleFrustration(frustrationCount);
	if (frustrationResponse) {
	    return {
	        'assistantResponse': frustrationResponse
	    };
	}

//this TRUE/FALSE passing tells the extract method to not clean or change the extractMessages array true == just ingest the array as is from openai
	//const {newCleanChatMessages, duplicatesRemoved} = extractMessages(chatMessages, true);
	//const { newCleanChatMessages: cleanChatMessages, duplicatesRemoved } =  extractMessages(chatMessages, true);
	let { newCleanChatMessages: chatMessagesAfterExtraction, duplicatesRemoved } =  extractMessages(chatMessages, true);
  


	// //send this into the function to query openai
	//let result = await interactWithOpenAI(newCleanChatMessages);
	let result = await interactWithOpenAI(chatMessagesAfterExtraction);



	// Start interacting with OpenAI
	try {
		//DEBUG_PATH: console.log("\n\n***CHAT_HELPER.JS:[DEBUG] newCleanChatMessages before OpenAI:", JSON.stringify(newCleanChatMessages));
		//this won't work because this IS the place it is created -> console.log("\n\n***CHAT_HELPER.JS ->Result.id value (right after newCLeanChatMessages):", result.id);


		// let result = await client.getChatCompletions(deploymentId, newCleanChatMessages, {
		// 	maxTokens: validatedTokens
		// });
		//DEBUG_PATH: console.log("\n\n[DEBUG] Result from OpenAI:", JSON.stringify(result));

		// Add result to global chatcmplHistory array 2023oct17
		chatIdHistoryLog.push(result.id);
		//DEBUG_PATH moved to TRYPATH console.log("\n\n***CHAT_HELPER.JS running chatIdHistoryLog: ",chatIdHistoryLog);


		// did it hit a content policy violation?
		if (result && result.code === "content_filter" && result.innererror && result.innererror.code === 'ResponsibleAIPolicyViolation') {
			let error = new Error('The response was filtered due to the prompt triggering Azure OpenAI’s content management policy. Please modify your prompt and retry.');
			error.type = 'content_filter';
			throw error;
		}

		if (result && result.choices[0]?.message?.content) {
			//debug for result.id: 
			//DEBUG_PATH: console.log("\n\n***CHAT_HELPER.JS ->Result.id value (after policy violation content filter):", result.id);


			// Check if assistant wants to requery message
			let letMeCheckFlag = shouldRequery(result.choices[0].message.content);
			let assistantResponse = result.choices[0].message.content;

			//debug
			console.log("\n\n***CHAT_HELPER.JS ->Result.id value (after response and cost calculations):", result.id);

			// Add the assistant response to newCleanChatMessages array
			// newCleanChatMessages.push({
			// 	role: 'assistant',
			// 	content: assistantResponse
			// });
			chatMessagesAfterExtraction.push({
				role: 'assistant',
				content: assistantResponse
			});

			console.log('\n\n***CHAT_HELPER.JS: Most up to date payload after receiving back from OpenAI: ', newCleanChatMessages);

			//let { turboCost, gpt4Cost } = calculateCost(result.usage.totalTokens);

			// This is where we're going to add the code for cost calculation
			// Prices per token for GPT-3.5 Turbo and GPT-4
			// const turboCostPerToken = modelCosts['Language Models']['GPT-3.5 Turbo']['4K context']['Output'];
			// const gpt4CostPerToken = modelCosts['Language Models']['GPT-4']['8K context']['Output'];

			// // Get total tokens used so far
			// let totalTokens = result.usage.totalTokens;


			// // Calculate costs thus far of the transaction
			// let turboCost = (totalTokens / 1000) * turboCostPerToken;
			// let gpt4Cost = (totalTokens / 1000) * gpt4CostPerToken;



			// console.log('\n\n***CHAT_HELPER.JS: Total tokens used so far in this chat:', totalTokens);
			// console.log('\n\n***CHAT_HELPER.JS: If GPT-3.5 Turbo, the cost is:', formatCost(turboCost));
			// console.log('\n\n***CHAT_HELPER.JS: if GPT-4, the cost is:', formatCost(gpt4Cost));

			if (letMeCheckFlag) {
				//debug
				console.log("\n\n***CHAT_HELPER.JS ->Result.id value (within first letMeCheckFlag conditional):", result.id);
				console.log('\n\n***CHAT_HELPER.JS: Entered the letMeCheckFlag "true" condition.');
				if (newCleanChatMessages[newCleanChatMessages.length - 1].content !== checkMessage) {
					let newPayload = newCleanChatMessages.filter(item => !item.content.startsWith('Certainly'));
					let uniquePayload = new Set(newCleanChatMessages.map(JSON.stringify));
					//const won't work here and we pass the true value in: newCleanChatMessages = Array.from(uniquePayload).map(JSON.parse);
					let {newCleanChatMessages, duplicatesRemoved} = extractMessages(chatMessages, true);


					if (newCleanChatMessages[newCleanChatMessages.length - 1].content !== checkMessage) {
						//DEBUG_PATH: console.log('\n\n***CHAT_HELPER.JS: Adding new response to payload');
						const newResponses = [{
							role: 'assistant',
							content: `Let me check our past conversations in this exact thread, one moment...`
						}, ];
						//DEBUG_PATH: console.log('New responses: ', newResponses);
						newCleanChatMessages.push(...newResponses);

						console.log("\n\n***CHAT_HELPER.JS: 'Let me check our past conversations...' added to newCleanChatMessages since it's not present in previous message");
					} else {
						console.log("\n\n***CHAT_HELPER.JS: 'Let me check our past conversations...' detected in previous message, not adding it to newCleanChatMessages");
					}

					let looped_through_newCleanChatMessages = newCleanChatMessages.filter(msg => msg.role === 'user').map(item => item.content).join(',');
					newCleanChatMessages = formatChatPayload(newCleanChatMessages, looped_through_newCleanChatMessages, lastUserMessage);
					console.log("\n\n***CHAT_HELPER.JS:[DEBUG] newCleanChatMessages after formatChatPayload():", JSON.stringify(newCleanChatMessages));


					chatHistory = newCleanChatMessages;

					//console.log('\n\n***CHAT_HELPER.JS: After running formatChatPayload(), newCleanChatMessages is now: ', newCleanChatMessages); 

					if (JSON.stringify(newCleanChatMessages) !== oldChatMessages) {
						//console.log('\n\n***CHAT_HELPER.JS: The newCleanChatMessages before and after running formatChatPayload() are different. The newCleanChatMessages after re-formatting is now: ', newCleanChatMessages);
					}


					try {
						//console.log('\n\n***CHAT_HELPER.JS_TRYPATH Most up to date payload before sending to OpenAI after restructure: ', newCleanChatMessages);
					
						//console.log("\n\n***CHAT_HELPER.JS: TRYPATH running chatIdHistoryLog: ", chatIdHistoryLog);
					
						// Declare a variable to store a found AAD Object ID
						let foundAadObjectId = null;
					
						let aadObj = await getAADObjectIdFromDB(chatIdHistoryLog);
						if (aadObj.length > 0) {
							// a match was found in DB for one or more chatIDs in chatIdHistoryLog
							//console.log("\n\n***CHAT_HELPER.JS: TRYPATH found a match! This is in the database:  ", aadObj);
					
							// Store the found AAD Object ID
							foundAadObjectId = aadObj[0].msteam_recipient_aad_object_id;
						} else {
							// no matches were found in DB for any chatIDs in chatIdHistoryLog
							//console.log("\n\n***CHAT_HELPER.JS: TRYPATH found no matches in database for provided chat IDs");
						}
					
						console.log("\n\n***CHAT_HELPER.JS_TRYPATH ->Result.id value (before secondary request to OpenAI):", result.id);
						let rebuiltPayloadViaDB = [];
						try {
							let AadObjectId;
							if (foundAadObjectId) {
								AadObjectId = [{ msteam_recipient_aad_object_id: foundAadObjectId }];
							} else {
								AadObjectId = await getAADObjectIdFromDB(result.id);
								if (AadObjectId.length === 0) {
									AadObjectId = [{ msteam_recipient_aad_object_id: 'noChatIdFound' }]; // Fallback value
								}
							}
					
							console.log('\n\n***CHAT_HELPER.JS_TRYPATH ->AAD Object ID we will query:', AadObjectId);
							if (AadObjectId.length > 0) {
								let last24HrInteractionData = await getLast24HrInteractionPerUserFromDB(AadObjectId[0].msteam_recipient_aad_object_id);
								//console.log('\n\n***CHAT_HELPER.JS_TRYPATH ->Swapping newCleanChatMessages for last24HrInteractionData...');
								//console.log('\n\n***CHAT_HELPER.JS_TRYPATH ->Last 24 Hr Interaction Data received from CHATGPT_UTILS.JS');
								newCleanChatMessages = last24HrInteractionData;
					
								// Call the recreateGptPayloadViaDB function and store the result in rebuiltPayloadViaDB
								rebuiltPayloadViaDB = await recreateGptPayloadViaDB(AadObjectId[0].msteam_recipient_aad_object_id);
							}
						} 
						catch(err)  {
							console.error('\n\n***CHAT_HELPER.JS_TRYPATH -> Error fetching data from DB:', err);
						}

						result = await client.getChatCompletions(deploymentId, newCleanChatMessages, { maxTokens: validatedTokens });
						//console.log("\n\n***CHAT_HELPER.JS_TRYPATH ->Result.id value (after secondary request to OpenAI):", result.id);
					
						//console.log("\n\n***CHAT_HELPER.JS: The response from the secondary request to OpenAI is ", result);
						//console.log('\n\n***CHAT_HELPER.JS_TRYPATH: Most up to date payload after receiving back from OpenAI after restructure: ', newCleanChatMessages);
					
						// Log the rebuiltPayloadViaDB
						//console.log('\n\n***CHAT_HELPER.JS_TRYPATHS: Most up to date payload via DB recreation: ', rebuiltPayloadViaDB);
					
					} catch (error) {
						console.error('\n\n***CHAT_HELPER.JS_TRYPATH -> An error occurred during communication with OpenAI: ', error);
					}

				}
			}
			console.log('\n\n***CHAT_HELPER.JS: Response from OpenAI API with id:\n', JSON.stringify(result.id));
			console.log('\n\n***CHAT_HELPER.JS: letMeCheckFlag is: ', letMeCheckFlag);
		// console.log('\n\n***CHAT_HELPER.JS: Is the response from chatGPT including one of the [bot_response] patterns?', bot_response_patterns.some(pattern => result.choices[0].message.content.toLowerCase().includes(pattern.toLowerCase())));


		//calculate cost
		let { turboCost, gpt4Cost } = calculateCost(result.usage.totalTokens);


			try {
				let chat_id;
				// Attempt to access the result id
				try {
					chat_id = result.id;
				} catch (e) {
					// If an error occured, default to the current epoch time
					chat_id = Date.now();
				}
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
					//payload_source: JSON.stringify(newCleanChatMessages),
					payload_source: JSON.stringify(chatMessagesAfterExtraction),
					cleaned_duplicates_count: duplicatesRemoved,
					total_tokens_in_chat: result.usage.totalTokens,
					chat_gpt3_5turbo_cost_estimate: turboCost,
					chat_gpt4_cost_estimate: gpt4Cost,
				};
				await chatHelperSaveDataToPostgres(dataToSave);
				console.log('\n\n***CHAT_HELPER.JS: chatHelperSaveDataToPostgres saved successfully to PostgreSQL!');

				///////2023oct16 114pm push to move to db instead of in thread: 
				// Fetch and print conversation history from database
				try {
					let AadObjectId = await getAADObjectIdFromDB(result.id)
					console.log('\n\n***CHAT_HELPER.JS ->AAD Object ID we will query:', AadObjectId);

					if (AadObjectId.length > 0) {
						let last24HrInteractionData = await getLast24HrInteractionPerUserFromDB(AadObjectId[0].msteam_recipient_aad_object_id);
						console.log('\n\n***CHAT_HELPER.JS ->Last 24 Hr Interaction Data received from CHATGPT_UTILS.JS');
					}
				} catch (error) {
					console.error('\n\n***CHAT_HELPER.JS -> Error fetching data from DB:', error);
				}

			} catch (error) {
				console.error('\n\n***CHAT_HELPER.JS: Failed to save chat data to PostgreSQL. Error:', error);
			}
			//debug
			//DEBUG_PATH: console.log("\n\n***CHAT_HELPER.JS ->Result.id value (before final return statement):", result.id);

			// Send response back to anything listening
			return {
				'assistantResponse': result.choices[0].message.content,
				'requery': letMeCheckFlag,
				'letMeCheckFlag': letMeCheckFlag,
				//'chats': newCleanChatMessages
				'chats': chatMessagesAfterExtraction
			};
		
		} else {
			console.log('\n\n***CHAT_HELPER.JS: No content in API response');
			return {
				'assistantResponse': "I'm sorry, I couldn't understand that. Could you please try again?",
				'requery': false,
				'letMeCheckFlag': false,
				//'chats': newCleanChatMessages
				'chats': chatMessagesAfterExtraction
			};
		}
	} catch (error) {
		console.error("\n\n***CHAT_HELPER.JS:An error occurred while interacting with OpenAI API", error);
		throw error;
	}
}
module.exports = chatCompletion;