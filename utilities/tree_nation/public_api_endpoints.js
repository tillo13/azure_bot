const axios = require('axios');

async function getTreeNationProjectTotalNumber() {
    const projects_url = 'https://tree-nation.com/api/projects';

    try {
        let response = await axios.get(projects_url);
        let projects = response.data;

        let message = `Total Number of Projects: ${projects.length}`;

        return message;

    } catch(error) {
        console.error(error);
        return 'An error occurred while fetching projects data.';
    }
}

// Export 'getTreeNationProjectTotalNumber' function
module.exports.getTreeNationProjectTotalNumber = getTreeNationProjectTotalNumber;