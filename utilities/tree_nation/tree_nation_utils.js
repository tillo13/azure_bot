const axios = require('axios');

const config = {
    TEST: {
        site: process.env['2023nov16_TREE_NATION_TEST_SITE'],
        token: process.env['2023nov16_TREE_NATION_TEST_TOKEN'],
        planterId: process.env['2023nov16_TREE_NATION_TEST_USER_ID']
    },
    PROD: {
        site: process.env['2023nov16_TREE_NATION_PROD_SITE'],
        token: process.env['2023nov16_TREE_NATION_PROD_TOKEN'],
        planterId: process.env['2023nov16_TREE_NATION_PROD_USER_ID']
    }
};


async function plantTree(environmentFlag, recipients, speciesId, quantity, message) {
    const environment = config[environmentFlag];
    const apiUrl = `${environment.site}/api/plant`;
    const headers = {
        'Authorization': `Bearer ${environment.token}`,
        'Content-Type': 'application/json'
    };

    const payload = {
        recipients: recipients,
        planter_id: environment.planterId,
        species_id: speciesId,
        quantity: quantity,
        message: message
    };

    try {
        const response = await axios.post(apiUrl, payload, { headers: headers });
        // Construct verbose details if the request is successful
        if (response.data.status === 'ok') {
            return {
                userMessage: createDetailResponse(response.data),
                consoleMessage: createVerboseConsoleLog(response.data),
                status: 'ok'
            };
        } else {
            // Error occurred on the Tree-Nation API side
            return {
                userMessage: `An error occurred while planting the tree: ${response.data.message}`,
                consoleMessage: `\n***TREE_NATION_UTILS.JS: Tree planting request failed with status: ${response.data.status}`,
                status: 'error'
            };
        }
    } catch (error) {
        // Error occurred while making HTTP request
        return {
            userMessage: `An error occurred while connecting to the Tree-Nation API: ${error.message}`,
            consoleMessage: `\n***TREE_NATION_UTILS.JS: Error while making the plant tree HTTP request: ${error.message}`,
            status: 'error'
        };
    }
}

function createDetailResponse(apiResponse) {
    let treeDetails = apiResponse.trees.map(tree => {
        return `**Tree ID:** ${tree.id}\n` +
               `**Token:** [${tree.token}](${tree.collect_url})\n` +
               `**Certificate:** [View Certificate](${tree.certificate_url})\n`;
    }).join('\n');

    return `A tree has been planted successfully! Here are the details:\n\n${treeDetails}`;
}

function createVerboseConsoleLog(apiResponse) {
    let treeDetails = apiResponse.trees.map(tree => {
        return `Tree ID: ${tree.id}, Token: ${tree.token}, Collect URL: ${tree.collect_url}, Certificate URL: ${tree.certificate_url}`;
    }).join('; ');

    return `\n***TREE_NATION_UTILS.JS: **Tree Planting Request Successful**\nPayment ID: ${apiResponse.payment_id}\nStatus: ${apiResponse.status}\nTrees Details: ${treeDetails}`;
}

module.exports = {
    plantTree
};