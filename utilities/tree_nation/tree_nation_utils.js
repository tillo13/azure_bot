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
    // Choose the proper configuration based on the environment flag
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
        // Check the response.data for the API successful status and tree details
        if (response.data.status === 'ok') {
            console.log("Tree planting request successful.");
            return response.data; // This would be the full JSON including the 'trees' array
        } else {
            console.error("Tree planting request failed with status:", response.data.status);
            return response.data; // This includes the status and any message returned by the API
        }
    } catch (error) {
        console.error("Error in tree_nation_utils:plantTree:", error);
        return { status: 'error', error: error.response?.data || error.message };
    }
}

module.exports = {
    plantTree
};