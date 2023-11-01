async function getProjectSummary() {
    const projects_url = 'https://tree-nation.com/api/projects';

    try {
        let response = await axios.get(projects_url);
        let projects = response.data;

        let activeProjects = projects.filter(project => project.status === 'active');
        let inactiveProjects = projects.filter(project => project.status === 'inactive');

        let projectSummary = {
            total: projects.length,
            active: activeProjects.length,
            inactive: inactiveProjects.length
        };

        return projectSummary;

    } catch(error) {
        console.error(error);
        return 'An error occurred while fetching projects data.';
    }
}

// Export 'getProjectSummary' function
module.exports.getProjectSummary = getProjectSummary;