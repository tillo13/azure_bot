const axios = require('axios');

class Summary{
  constructor(){
    this.totalProjects = 0;
    this.activeProjects = 0;
    this.inactiveProjects = 0;
    this.averageCo2 = 0;
    this.averageTreeStock = 0;
    this.uniqueLocations = [];
  }

  createSummary(){
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

    summary.totalProjects = projects.length;

    let activeProjects = projects.filter( project => project.status === 'active');
    summary.activeProjects = activeProjects.length;

    let inactiveProjects = projects.filter( project => project.status === 'inactive');
    summary.inactiveProjects = inactiveProjects.length;

let totalCo2 = 0;
let totalStock = 0;
let locations = new Set();

for(let project of projects){
    totalCo2 += project.co2_compensated_tons; // in case project.co2_compensated_tons is null better use (project.co2_compensated_tons || 0)
    totalStock += project.stock; // in case project.stock is null better use (project.stock || 0)
    locations.add(project.location);
}

summary.averageCo2 = totalCo2 / projects.length;
summary.averageTreeStock = totalStock / projects.length;
summary.uniqueLocations = Array.from(locations);

    let result = summary.createSummary();
  
    return result; 

  } catch (error) {
      console.error(error);
      return 'An error occurred while fetching Tree Nation projects data.';
  }
}