const axios = require('axios');

// Helper function for sleep
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
  
  async function getRandomAvailableSpecies(projectIds) {
    const allAvailableSpecies = [];
  
    for (const projectId of projectIds) {
      const apiUrl = `https://tree-nation.com/api/projects/${projectId}/species`;
      try {
        const response = await axios.get(apiUrl);
        if (response.status === 200) {
          const availableSpecies = response.data.filter(species => species.stock > 0);
          allAvailableSpecies.push(...availableSpecies.map(species => ({
            ...species, // Copy all the existing species properties
            projectId // Add the projectId to each species
          })));
        } else {
          throw new Error(`Could not retrieve species for project ID ${projectId}`);
        }
      } catch (error) {
        console.error(error.message);
        throw error;
      }
    }
  
    if (allAvailableSpecies.length === 0) {
      throw new Error('No species with positive stock are available for planting.');
    }
  
    // Randomly pick an available species
    const randomIndex = Math.floor(Math.random() * allAvailableSpecies.length);
    return allAvailableSpecies[randomIndex];
  }
  

  async function plantTree(environmentFlag, recipients, quantity, message, maxRetries = 3, retryDelayMs = 2000) {
    const environment = config[environmentFlag];
    const apiUrl = `${environment.site}/api/plant`;
    const headers = {
      'Authorization': `Bearer ${environment.token}`,
      'Content-Type': 'application/json'
    };
  
    // Get the species id
    const projectIds = environmentFlag === 'TEST' ? [3, 41] : []; // Define your production project IDs here if any
    const species = await getRandomAvailableSpecies(projectIds);
    const payload = {
      recipients: recipients,
      planter_id: environment.planterId,
      species_id: species.id,
      quantity: quantity,
      message: message
    };
  
    let attempt = 0;
  
    while (attempt < maxRetries) {
      try {
        const response = await axios.post(apiUrl, payload, { headers: headers });
        if (response.data.status === 'ok') {
          // Success
          return {
            userMessage: createDetailResponse(response.data, species.projectId), // Pass the projectId here
            consoleMessage: createVerboseConsoleLog(response.data),
            status: 'ok',
            data: response.data,
            projectId: species.projectId // Include the projectId in the returned data
          };
        } else {
          // Handle non-success status here without retrying
          return {
            userMessage: `An error occurred while planting the tree: ${response.data.message}`,
            consoleMessage: `\n***TREE_NATION_UTILS.JS: Tree planting request failed with status: ${response.data.status}`,
            status: 'error'
          };
        }
      } catch (error) {
        console.error(`Attempt ${attempt + 1} encountered an error: ${error.message}`);
        attempt++; // We only increase the attempt count when an error occurs that we might want to retry
  
        if (attempt < maxRetries) {
          console.log(`Retrying attempt ${attempt} after ${retryDelayMs} ms...`);
          await sleep(retryDelayMs);
        } else {
          // All retries have failed, throw the error so it can be handled higher up or logged
          throw new Error(`Failed to plant tree after ${maxRetries} attempts: ${error}`);
        }
      }
    }
  }

  function createDetailResponse(apiResponse, projectId) {
    let treeDetails = apiResponse.trees.map(tree => {
      return `Tree ID: ${tree.id}\n` +
             `Token: ${tree.token}\n` +
             `Collect URL: ${tree.collect_url}\n` +
             `Certificate URL: ${tree.certificate_url}\n`;
    }).join('\n\n');
    
    // Define project names based on IDs for TEST environment
    const projectNames = {
      '3': 'La Pedregoza',
      '41': 'Usambara Biodiversity Conservation'
    };
  
    // Get the project name only if the environment is TEST
    let projectName = '';
    if(global.TREE_NATION_ENDPOINT === 'TEST') {
      projectName = projectNames[projectId] || 'Unknown Project';
    }

    return `A tree has been planted successfully ${projectName ? 'in ' + projectName : ''} via Tree-Nation! Here are the details:\n\n${treeDetails}`;
  }

function createVerboseConsoleLog(apiResponse) {
    let treeDetails = apiResponse.trees.map(tree => {
        return `Tree ID: ${tree.id}, Token: ${tree.token}, Collect URL: ${tree.collect_url}, Certificate URL: ${tree.certificate_url}`;
    }).join('; ');

    return `\n***TREE_NATION_UTILS.JS: **Tree Planting Request Successful**\nPayment ID: ${apiResponse.payment_id}\nStatus: ${apiResponse.status}\nTrees Details: ${treeDetails}`;
}

async function getAvailableSpecies(projectId) {
    const apiUrl = `https://tree-nation.com/api/projects/${projectId}/species`;
    try {
      const response = await axios.get(apiUrl);
      if (response.status === 200) {
        // Filter species to get only those with stock > 0
        return response.data.filter(species => species.stock > 0);
      } else {
        throw new Error(`Could not retrieve species for project ID ${projectId}`);
      }
    } catch (error) {
      console.error(error.message);
      throw error;
    }
  }
  
module.exports = {
    plantTree, 
    createDetailResponse
};