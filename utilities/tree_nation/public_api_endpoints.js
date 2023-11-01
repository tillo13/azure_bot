const axios = require("axios");

async function getTreeNationProjectsSummary() {
    const projects_url = 'https://tree-nation.com/api/projects';

    try {
        let response = await axios.get(projects_url);
        let projects = response.data;

        console.log(`\n\n**TREE-NATION-PUBLIC_API_ENDPOINTS: Total Number of Projects: ${projects.length}`);

        let activeProjects = projects.filter(project => project.status === 'active');
        let inactiveProjects = projects.filter(project => project.status === 'inactive');

        let message = `Tree Nation Project Information:\n` +
                      `Total Number of Projects: ${projects.length}\n` +
                      `Total Number of Active Projects: ${activeProjects.length}\n` +
                      `Total Number of Inactive Projects: ${inactiveProjects.length}\n`;

        return message;

    } catch(error) {
        console.error(error);
        return 'An error occurred while fetching Tree Nation projects data.';
    }
}

// Export 'getTreeNationProjectsSummary' function
module.exports.getTreeNationProjectsSummary = getTreeNationProjectsSummary;