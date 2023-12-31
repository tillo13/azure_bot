const axios = require('axios');

class Summary {
	constructor() {
		this.totalProjects = 0;
		this.activeProjects = 0;
		this.inactiveProjects = 0;
		this.averageCo2 = 0;
		this.averageTreeStock = 0;
		this.uniqueLocations = [];
	}

	createSummary() {
		return {
			totalProjects: this.totalProjects,
			activeProjects: this.activeProjects,
			inactiveProjects: this.inactiveProjects,
			averageCo2: this.averageCo2,
			averageTreeStock: this.averageTreeStock,
			uniqueLocations: this.uniqueLocations,
		};
	}
}

async function getTreeNationProjectsSummary() {
	const summary = new Summary();
	const projects_url = 'https://tree-nation.com/api/projects';

	try {
		let response = await axios.get(projects_url);
		let projects = response.data;
		console.log(`\n\n**TREE-NATION-PUBLIC_API_ENDPOINTS: Total Number of Projects: ${projects.length}`);

		summary.totalProjects = projects.length;

		let activeProjects = projects.filter(project => project.status === 'active');
		summary.activeProjects = activeProjects.length;

		let inactiveProjects = projects.filter(project => project.status === 'inactive');
		summary.inactiveProjects = inactiveProjects.length;

		let totalCo2 = 0;
		let totalStock = 0;
		let locations = new Set();

        for (let project of projects) {
            try {
                if(typeof project.co2_compensated_tons !== "undefined"){
                    totalCo2 += project.co2_compensated_tons;
                }
                if(typeof project.stock !== "undefined"){
                    totalStock += project.stock;
                }
                    locations.add(project.location);
            } catch (error) {
                throw new Error(`Error processing project: ${project.id}, error detail: ${error.message}`);
            }
        }

		summary.averageCo2 = totalCo2 / projects.length;
		summary.averageTreeStock = totalStock / projects.length;
		summary.uniqueLocations = Array.from(locations);

        let resultText = `
        Tree-Nation Public API Endpoints Summary: 
        Total Projects: ${summary.totalProjects}
        Active Projects: ${summary.activeProjects}
        Inactive Projects: ${summary.inactiveProjects}
        Average CO2: ${summary.averageCo2.toFixed(2)}
        Average Tree Stock: ${summary.averageTreeStock.toFixed(2)}
        Unique Locations: ${summary.uniqueLocations.join(', ')}
      `;

		return resultText;

	} catch (error) {
		console.error(error);
		return 'An error occurred while fetching Tree Nation projects data.';
	}
}

async function getData() {
	try {
		const summary = await getTreeNationProjectsSummary();
		console.log(summary);
	} catch (err) {
		console.log('An error occurred during the data fetching or processing.', err);
	}
}

module.exports = {
	getTreeNationProjectsSummary,
};