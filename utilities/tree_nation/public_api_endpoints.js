async function getProjectsSummary() {
    const projects_url = 'https://tree-nation.com/api/projects';

    try {
        let response = await axios.get(projects_url);
        let projects = response.data;

        let activeProjects = projects.filter(project => project.status === 'active');
        let inactiveProjects = projects.filter(project => project.status === 'inactive');

        let message = `Total Number of Projects: ${projects.length}\n` +
                      `Total Number of Active Projects: ${activeProjects.length}\n` +
                      `Total Number of Inactive Projects: ${inactiveProjects.length}`;

        return message;

    } catch(error) {
        console.error(error);
        return 'An error occurred while fetching projects data.';
    }
}

// Export 'getProjectsSummary' function
module.exports.getProjectsSummary = getProjectsSummary;