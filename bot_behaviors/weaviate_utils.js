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
const className = weaviate_class_name;
const SIMILARITY_THRESHOLD = 0.7;
const OBJECT_VALUE = weaviate_object_value;
const LIMIT = 3;

const UNWANTED_TERM = "zzzzz";
const MOVE_AWAY_FORCE = 0.0;

async function getRandomObject() {
    const MAX_RETRIES = 3;
    let message = "";  // message to be returned

    for(let i = 0; i < MAX_RETRIES; i++){
        try {
            let query = {
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
    
            let response = await fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(query) });
            
            if (!response.ok) {
                throw new Error(`HTTP error, unable to fetch! status: ${response.status}`);
            }

            let result = await response.json();

            // check if data exists and Aggregate exists within data
            const totalObjects = result.data && result.data.Aggregate && result.data.Aggregate[className] 
                && result.data.Aggregate[className][0] && result.data.Aggregate[className][0].meta 
                && result.data.Aggregate[className][0].meta.count;

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
                                ${OBJECT_VALUE}     // This line is necessary to fetch the object data as well
                            }
                        }
                    }`
                };
                response = await fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(query) });
                result = await response.json();
                // check each property in the chain
                const randomId = result.data && result.data['Get'][className] && result.data['Get'][className][0] 
                && result.data['Get'][className][0]['_additional'] && result.data['Get'][className][0]['_additional']['id']; 
                const randomObject = result.data && result.data['Get'][className] && result.data['Get'][className][0] 
                && result.data['Get'][className][0][OBJECT_VALUE];

                // if we successfully retrieved the randomId and the randomObject
                if(randomId && randomObject){
                    // Present the fetched object in a nice way
                    message = `ID: ${randomId}\nObject: ${JSON.stringify(randomObject, null, 2)}`; 
                } else {
                    throw new Error(`Failed to fetch data for id and object at offset: ${randomOffset}`);
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

module.exports = {initialSearchVectorSimilarity, handleSearchSimilarity, formatWeaviateResponse, enhanceResponseWithWeaviate, getRandomObject}