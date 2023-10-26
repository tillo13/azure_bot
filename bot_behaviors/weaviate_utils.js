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
const LIMIT = 1;

const UNWANTED_TERM = "zzzzz";
const MOVE_AWAY_FORCE = 0.0;

async function search_vector_similarity(searchTerm) {
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
    const data = await response.json();
    console.log("Similarity Search:");
    console.log(JSON.stringify(data, null, 4));
    console.log();

    return data;
}

// search_vector_similarity('some search term'); // Uncomment this line when testing standalone

module.exports = search_vector_similarity; 