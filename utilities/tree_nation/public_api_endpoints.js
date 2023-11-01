const axios = require('axios');

class Summary {
	constructor() {
		this.data = {
			totalProjects: 0,
			activeProjects: 0,
			inactiveProjects: 0,
			averageCo2: 0,
			averageTreeStock: 0,
			uniqueLocations: [],
			totalForestsQueried: 0,
			totalCo2Compensated: 0,
			mostTreesForest: {
				name: '',
				count: 0
			},
			fewestTreesForest: {
				name: '',
				count: Infinity
			}
		}
	}

	updateForestSummary(forest) {
		this.data.totalForestsQueried += 1;
		this.data.totalCo2Compensated += forest.co2_compensated_tons_project;
		this.updateMostAndFewestTreesForest(forest);
	}

	updateProjectSummary(project, totalCo2, totalStock, uniqueLocations) {
		this.data.totalProjects += 1;
		this.data.activeProjects += project.status === 'active' ? 1 : 0;
		this.data.inactiveProjects += project.status === 'inactive' ? 1 : 0;
		this.data.averageCo2 = totalCo2 / this.data.totalProjects;
		this.data.averageTreeStock = totalStock / this.data.totalProjects;
		this.data.uniqueLocations = Array.from(uniqueLocations);
	}
    
    updateMostAndFewestTreesForest(forest) {
		if (forest.count > this.data.mostTreesForest.count)
			this.data.mostTreesForest = forest;

		if (forest.count < this.data.fewestTreesForest.count)
			this.data.fewestTreesForest = forest;
	}
}

async function getProjectsData() {
	const response = await axios.get('https://tree-nation.com/api/projects');
	return response.data;    
}

async function getForestData(url) {
	const response = await axios.get(url);
	return response.data;
}

async function getTreeNationProjectsSummary() {
	try {
		const summary = new Summary();
		const projects = await getProjectsData();

		// Console log for number of projects
		console.log(`\n\n**TREE-NATION-PUBLIC_API_ENDPOINTS: Total Number of Projects: ${projects.length}`);

		let totalCo2 = 0;
		let totalStock = 0;
		let uniqueLocations = new Set();

		for (const project of projects) {
			totalCo2 += project.co2_compensated_tons || 0;
			totalStock += project.stock || 0;
			uniqueLocations.add(project.location);

			try {
				const forestData = await getForestData(`https://tree-nation.com/api/forests/${project.id}`);
				summary.updateForestSummary({ 
					name: forestData.name, 
					count: forestData.tree_count,
					co2_compensated_tons_project : forestData.co2_compensated_tons_project || 0
				});

				summary.updateProjectSummary(project, totalCo2, totalStock, uniqueLocations);

			} catch (error) {
				console.log(`Error processing project: ${project.id}, error detail: ${error.message}`);
			}
		}

		return summary.data;
	} catch (error) {
		console.error(error);
		throw new Error('An error occurred while fetching Tree Nation projects data.');
	}
}

function makeResultText(summary) {
	return `
        Total Projects: ${summary.totalProjects}
        Active Projects: ${summary.activeProjects}
        Inactive Projects: ${summary.inactiveProjects}
        Average CO2: ${summary.averageCo2.toFixed(2)}
        Average Tree Stock: ${summary.averageTreeStock.toFixed(2)}
        Unique Locations: ${summary.uniqueLocations.join(', ')}
        ForestIDs queried in ascending order: ${summary.totalForestsQueried}
        Total CO2 compensated (in tons) across all queried project sites:  ${summary.totalCo2Compensated.toFixed(2)}
        The forest(s) with the most trees: ${summary.mostTreesForest.name} with ${summary.mostTreesForest.count} trees
        The forest(s) with the fewest trees: ${summary.fewestTreesForest.name } with ${summary.fewestTreesForest.count} trees
      `;
}

async function getData() {
	try {
		const summary = await getTreeNationProjectsSummary();
		const resultText = makeResultText(summary);
		console.log(resultText);
	} catch (err) {
		console.log('An error occurred during the data fetching or processing.', err);
	}
}

getData();

module.exports = { getTreeNationProjectsSummary };