const { COSINE_SIMILARITY_THRESHOLD } = require('../utilities/global_configs');


const path = require('path');
const fetch = require('node-fetch');

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
        return {className: className, data: responseData, cosines: cosines};
    } else {
        console.log("\n\n******WEAVIATE_UTILS.JS: Could not communicate with Weaviate");
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

    console.log(`\n\nNumber of matches above threshold: ${countAboveThreshold}`);

    return weaviateInfo;
}

module.exports = {initialSearchVectorSimilarity, handleSearchSimilarity, formatWeaviateResponse}