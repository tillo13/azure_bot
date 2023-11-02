//2023nov1 add in random_obj finder
const fetch = require('node-fetch');
const { invokeOpenaiGpt4 } = require('./gpt4_invoke');
const { COSINE_SIMILARITY_THRESHOLD } = require('../utilities/global_configs');

const CONFIGS = {
    BASE_URL: process.env['2023oct25_WEAVIATE_URL'],
    CLASS_NAME: process.env['2023oct25_WEAVIATE_CLASS_NAME'],
    OBJECT_VALUE: process.env['2023oct25_WEAVIATE_CLASS_OBJ_VALUE'],
    AUTH_TOKEN: `Bearer ${process.env["2023oct21_WEAVIATE_API_KEY"]}`,
    AZURE_API_KEY: `${process.env["2023oct21_AZURE_OPENAI_API_KEY"]}`,
    COSINE_SIMILARITY_THRESHOLD,
    UNWANTED_TERM: "zzzzz",
    MOVE_AWAY_FORCE: 0.0,
    LIMIT: 3
};

const headers = {
    'Content-Type': 'application/json',
    'Authorization': CONFIGS.AUTH_TOKEN,
    'X-Azure-Api-Key': CONFIGS.AZURE_API_KEY
};

const url = `${CONFIGS.BASE_URL}/v1/graphql`;

async function queryWeaviate(query) {
    const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(query) });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
}

async function fetchVectorsWithSimilarity(searchTerm) {
    return await queryWeaviate({
        query: `{
            Get {
                ${CONFIGS.CLASS_NAME}(nearText: {
                    concepts: ["${searchTerm}"],
                    certainty: ${CONFIGS.SIMILARITY_THRESHOLD},
                    moveAwayFrom: {concepts: ["${CONFIGS.UNWANTED_TERM}"], force: ${CONFIGS.MOVE_AWAY_FORCE}}
                }, limit: ${CONFIGS.LIMIT}) {
                    ${CONFIGS.OBJECT_VALUE}
                    _additional {certainty}
                }
            }
        }`
    });
}

async function handleSearchSimilarity(lastUserMessage){
    console.log(`\n\n******WEAVIATE_UTILS.JS: Message we will pass to Weaviate: ${lastUserMessage}`);
    
    const weaviateResponse = await fetchVectorsWithSimilarity(lastUserMessage);
    if (weaviateResponse?.data?.Get) {
        let className = Object.keys(weaviateResponse.data.Get)[0];
        let responseData = Array.isArray(weaviateResponse.data.Get[className]) 
            ? weaviateResponse.data.Get[className] 
            : [weaviateResponse.data.Get[className]];

        let cosines = responseData.map((obj, i) => {
            console.log(`\n\n******WEAVIATE_UTILS.JS: Weaviate similarity cosine #${i + 1} : ${obj._additional.certainty}`);
            console.log(`\n\n******WEAVIATE_UTILS.JS: Weaviate response #${i + 1} : ${JSON.stringify(obj[OBJECT_VALUE])}`);
            return obj._additional.certainty;
        });
        let highestScore = cosines.length > 0 ? Math.max.apply(Math, cosines) : 0;

        return { className, data: responseData, cosines, highestScore};
    } else {
        console.log("\n\n******WEAVIATE_UTILS.JS: Unable to communicate with Weaviate");
        return { highestScore: 0 };
    }
}

async function enhanceResponseWithWeaviate(lastUserMessage, chatMessagesAfterExtraction, weaviateResponse) {
    let {weaviateInfo, countAboveThreshold} = await formatWeaviateResponse(weaviateResponse);
    if (countAboveThreshold > 0) {
        let gpt4Prompt = `A user provided this statement: ${lastUserMessage}. We found ${countAboveThreshold} matches in our Teradata-specific vector dataset with cosine similarity of ${CONFIGS.COSINE_SIMILARITY_THRESHOLD} or higher that we deem suitable in a response. Please read this, and respond back cleanly to the user using this as your primary source of data, feel free to enhance it if you know more about the subject, but do not hallucinate. ${weaviateInfo}.`;
        return await invokeOpenaiGpt4(gpt4Prompt);
    } else {
        console.log("\n\n******WEAVIATE_UTILS.JS: No high cosine similarity score was found, therefore not enhancing with Weaviate nor GPT4 for speed/finance reasons.");
        return null;
    }
}

function formatWeaviateResponse(weaviateResponse) {
    let weaviateInfo = "";
    let countAboveThreshold = 0;

    const cosines = weaviateResponse?.cosines || [];
    const data = weaviateResponse?.data || [];

    if (data.length > 0 && cosines.length > 0) {
        let hasValidResult = false;
        let tempInfo = "\n\nWeaviate Results:\n";

        for (let index = 0; index < data.length; index++) {
            if(cosines[index] >= COSINE_SIMILARITY_THRESHOLD) {
                tempInfo += `Result ${index + 1}: ${JSON.stringify(data[index])}\n`;
                tempInfo += `Cosine Similarity: ${cosines[index]}\n`;

                countAboveThreshold++;
                hasValidResult = true;
            } else {
                console.log(`\n\n***CHAT_HELPER.JS: Result ${index + 1} has a cosine similarity of ${cosines[index]}, which is below the desired threshold. Not displaying it to the user.`);
            }
        }

        if(hasValidResult) {
            weaviateInfo = tempInfo;
        }
    }
    console.log(`\n\nNumber of matches above threshold via weaviate_utils.js: ${countAboveThreshold}`);
    return {weaviateInfo, countAboveThreshold};
}

async function getRandomObject() {
    const MAX_RETRIES = 3;
    for(let i = 0; i < MAX_RETRIES; i++){
        try {
            const result = await queryWeaviate({ query: `{ Aggregate { ${CONFIGS.CLASS_NAME} { meta { count } } } }` });
            const totalObjects = result?.data?.Aggregate?.[CONFIGS.CLASS_NAME]?.[0]?.meta?.count || 0;
            if (totalObjects > 0) {
                const randomOffset = Math.floor(Math.random() * totalObjects);
                const result2 = await queryWeaviate({
                    query: `{ Get { ${CONFIGS.CLASS_NAME}(limit: 1, offset: ${randomOffset}) { _additional { id } ${CONFIGS.OBJECT_VALUE} } } }`
                });
                const randomId = result2?.data?.Get?.[CONFIGS.CLASS_NAME]?.[0]?._additional?.id;
                const randomObject = result2?.data?.Get?.[CONFIGS.CLASS_NAME]?.[0]?.[CONFIGS.OBJECT_VALUE];
                if(randomId && randomObject){
                    return JSON.stringify(result2.data.Get[CONFIGS.CLASS_NAME][0], null, 2);
                } else {
                    throw new Error(`Failed to fetch data for id and object at offset: ${randomOffset}`);
                }
            } else {
                console.error(`No object found for the class: ${CONFIGS.CLASS_NAME}`);
                return `No object found for the class: ${CONFIGS.CLASS_NAME}`;
            }
        } catch (e) {
            console.error(`An error occurred: ${e.message}`);
            if(i === MAX_RETRIES - 1) {
                console.error('Unable to get random object after maximum retries. Please try again later.');
                return 'Unable to get random object after maximum retries. Please try again later.';
            }
        }
    }
}

module.exports = {
    initialSearchVectorSimilarity: fetchVectorsWithSimilarity,
    handleSearchSimilarity: handleSearchSimilarity,
    formatWeaviateResponse: formatWeaviateResponse,
    enhanceResponseWithWeaviate: enhanceResponseWithWeaviate,
    getRandomObject: getRandomObject
};