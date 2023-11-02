//2023nov1 add in random_obj finder
const fetch = require('node-fetch');

const { COSINE_SIMILARITY_THRESHOLD } = require('../utilities/global_configs');

const { invokeOpenaiGpt4 } = require('./gpt4_invoke');

const path = require('path');

const base_url = process.env['2023oct25_WEAVIATE_URL'];
const weaviate_class_name = process.env['2023oct25_WEAVIATE_CLASS_NAME'];
const weaviate_object_value = process.env['2023oct25_WEAVIATE_CLASS_OBJ_VALUE'];
const url = `${base_url}/v1/graphql`;

const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env["2023oct21_WEAVIATE_API_KEY"]}`,
    'X-Azure-Api-Key': `${process.env["2023oct21_AZURE_OPENAI_API_KEY"]}`,
}

const CLASS_NAME = weaviate_class_name;
const SIMILARITY_THRESHOLD = 0.7;
const OBJECT_VALUE = weaviate_object_value;
const LIMIT = 3;

const UNWANTED_TERM = "zzzzz";
const MOVE_AWAY_FORCE = 0.0;

async function initialSearchVectorSimilarity(searchTerm) {
    try {
        const payload = {
            query: `
            {
                Get {
                    ${CLASS_NAME}(nearText: {
                        concepts: ["${searchTerm}"],
                        certainty: ${SIMILARITY_THRESHOLD},
                        moveAwayFrom: {concepts: ["${UNWANTED_TERM}"], force: ${MOVE_AWAY_FORCE}}
                    }, limit: ${LIMIT}) {
                        ${OBJECT_VALUE}
                        _additional {certainty}
                    }
                }
            }
            `
        };
        const response = await fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(payload) });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        //console.log("Similarity Search:");
        //console.log(JSON.stringify(data, null, 4));
        //console.log();

        return data;
    } catch(e) {
        console.log(`\n\n******WEAVIATE_UTILS.JS: There was a problem with the fetch operation: ${e.message}`);
    }
}

async function handleSearchSimilarity(lastUserMessage){
    console.log(`\n\n******WEAVIATE_UTILS.JS: Message we will pass to Weaviate: ${lastUserMessage}`);
    
    const weaviateResponse = await initialSearchVectorSimilarity(lastUserMessage);
    if (weaviateResponse?.data?.Get) {
        // get the class name
        let className = Object.keys(weaviateResponse.data.Get)[0];

        // wrap the object in array if it's an object
        let responseData = Array.isArray(weaviateResponse.data.Get[className]) 
            ? weaviateResponse.data.Get[className] 
            : [weaviateResponse.data.Get[className]];

        // Initialize array to hold cosines
        let cosines = [];

        responseData.forEach((obj, i) => {
            console.log(`\n\n******WEAVIATE_UTILS.JS: Weaviate similarity cosine #${i + 1} : ${obj._additional.certainty}`);
            console.log(`\n\n******WEAVIATE_UTILS.JS: Weaviate response #${i + 1} : ${JSON.stringify(obj[OBJECT_VALUE])}`);

            // Store cosine similarity
            cosines.push(obj._additional.certainty);
        });
        //return {className: className, data: responseData, cosines: cosines};
        //add the highest cosine similarity score to the return object
        return {className: className, data: responseData, cosines: cosines, highestScore: Math.max(...cosines)};

    } else {
        console.log("\n\n******WEAVIATE_UTILS.JS: Could not communicate with Weaviate");
        return null;
    }
}

async function enhanceResponseWithWeaviate(lastUserMessage, chatMessagesAfterExtraction, weaviateResponse) {
	try {
		// Obtain the formatted Weaviate information and count of high similarity matches
		let {
			weaviateInfo,
			countAboveThreshold
		} = await formatWeaviateResponse(weaviateResponse);
		console.log(`\n\nNumber of matches above threshold via chat_helper.js: ${countAboveThreshold}`);
		// Ensure countAboveThreshold is a number
		countAboveThreshold = Number(countAboveThreshold);
		// If weaviateInfo is undefined, set it to an empty string
		weaviateInfo = weaviateInfo || "";

		// Continue only if there are matches above the similarity threshold
		if (countAboveThreshold > 0) {
			let gpt4Prompt = `A user provided this statement: ${lastUserMessage}. We found ${countAboveThreshold} matches in our Teradata-specific vector dataset with cosine similarity of ${COSINE_SIMILARITY_THRESHOLD} or higher that we deem suitable in a response. Please read this, and respond back cleanly to the user using this as your primary source of data, feel free to enhance it if you know more about the subject, but do not hallucinate. ${weaviateInfo}.`;
			// Now use 'gpt4Prompt' to invoke GPT4
			return await invokeOpenaiGpt4(gpt4Prompt);
            assistantResponse = gpt4Prompt
		} else {
			console.log("\n\n***CHAT_HELPER.JS: No high cosine similarity score was found, therefore not enhancing with Weaviate nor GPT4 for speed/finance reasons.");
            //GPT3.5 is perfectly capable of responding for speed, if we want to use GPT4 in the future for non-cosine, uncomment these lines to invoke GPT4
			//let gpt4Prompt = `A user provided this statement: ${lastUserMessage}. Please provide a thorough response using any knowledge you have, but do not hallucinate.`;
			//return await invokeOpenaiGpt4(gpt4Prompt);
		}
	} catch (err) {
		// In case of error, log it
		console.log("\n\n***CHAT_HELPER.JS: Error occurred while enhancing with Weaviate: ", err);
		// Return null on failing to enhance the response
		return null;
	}
}

function formatWeaviateResponse(weaviateResponse) {
    let weaviateInfo = "";

    // Initialize counter
    let countAboveThreshold = 0;

    if(weaviateResponse && weaviateResponse.data.length > 0 && weaviateResponse.cosines.length > 0) {
        let hasValidResult = false;
        let tempInfo = "\n\nWeaviate Results:\n";

        for(let index in weaviateResponse.data) {
            
            if(weaviateResponse.cosines[index] >= COSINE_SIMILARITY_THRESHOLD) {
                tempInfo += `Result ${index + 1}: ${JSON.stringify(weaviateResponse.data[index])}\n`;
                tempInfo += `Cosine Similarity: ${weaviateResponse.cosines[index]}\n`;

                // Increment the counter
                countAboveThreshold++;

                // Set flag that there's a valid result
                hasValidResult = true;
            } else {
                console.log(`\n\n***CHAT_HELPER.JS: Result ${index + 1} has a cosine similarity of ${weaviateResponse.cosines[index]}, which is below the desired threshold. Not displaying it to the user.`);
            }
        }

        // Only assign tempInfo to weaviateInfo if there's a valid result
        if (hasValidResult) {
            weaviateInfo = tempInfo;
        }
    }

    console.log(`\n\nNumber of matches above threshold via weaviate_utils.js: ${countAboveThreshold}`);

    return {weaviateInfo: weaviateInfo, countAboveThreshold: countAboveThreshold};
}

async function getRandomObject() {
    const MAX_RETRIES = 3;
    let message = "";  // message to be returned

    for(let i = 0; i < MAX_RETRIES; i++){
        try {
            query = {
                query: `{
                    Aggregate {
                        ${className} {
                            meta {
                                count
                            }
                        }
                    }
                }`
            };
    
    const response = await fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(query) });
    const result = await response.json();
    const totalObjects = result['data']['Aggregate'][className][0]['meta']['count'];

            // If there are objects
            if (totalObjects > 0) {
                const randomOffset = Math.floor(Math.random() * totalObjects);
                query = {
                    query: `{
                        Get {
                            ${className}(limit: 1, offset: ${randomOffset}) {
                                _additional {
                                    id
                                }
                            }
                        }
                    }`
                };
                response = await fetch(`${base_url}/v1/graphql`, {method: 'POST', headers: headers, body: JSON.stringify(query)});
                result = await response.json();
                const randomId = result['data']['Get'][className]['_additional']['id'];

                response = await fetch(`${base_url}/v1/objects/${randomId}`, {headers: headers});

                if(response.ok) {
                    result = await response.json();
                    console.log(JSON.stringify(result, null, 2));
                    message = JSON.stringify(result, null, 2);  // Set message here
                } else {
                    console.log(`Failed to fetch object: ${response.statusText}`);
                    message = "Failed to fetch the random object.";
                }

            } else {
                console.log(`No object found for the class: ${className}`);
                message = `No object found for the class: ${className}`;
            }
            
            // Exit loop if execution reach this point (no error thrown)
            break;
            
        } catch (e) {
            console.error(`An error occurred: ${e.message}`);
            if(i === MAX_RETRIES - 1) {
                console.log('Unable to get random object after maximum retries. Please try again later.');
                message = 'Unable to get random object after maximum retries. Please try again later.';
            }
        }
    }

    return message;  
}

getRandomObject();

module.exports = {initialSearchVectorSimilarity, handleSearchSimilarity, formatWeaviateResponse, enhanceResponseWithWeaviate, getRandomObject}