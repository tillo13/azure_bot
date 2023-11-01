import requests
import json
import random
import time

max_responses = 3

projects_url = 'https://tree-nation.com/api/projects'
single_project_url_template = 'https://tree-nation.com/api/projects/{}'
planting_sites_url_template = 'https://tree-nation.com/api/projects/{}/planting-sites'
species_url_template = 'https://tree-nation.com/api/projects/{}/species'
forests_url_template = 'https://tree-nation.com/api/forests/{}'

class Summary:
    def __init__(self):
        self.total_projects = 0
        self.active_count = 0
        self.inactive_count = 0
        self.project_ids = []
        self.species_count = 0
        self.total_forests_queried = 0
        self.project_descriptions = []
        self.total_co2 = 0
        self.total_price = 0
        self.species_queried = set()
        self.total_stock = 0
        self.unique_locations = set()
        self.total_co2_compensated_trees = 0 
        self.highest_price = 0
        self.highest_price_species = ''
        self.lowest_price = None
        self.lowest_price_species = ''
        self.co2_compensated_by_location = {}

    
    def update_co2_compensated_by_location(self, location, amount):
        if location not in self.co2_compensated_by_location:
            self.co2_compensated_by_location[location] = 0
        self.co2_compensated_by_location[location] += amount

    def print(self):
        average_co2 = self.total_co2 / self.total_projects if self.total_projects else 0
        average_stock = self.total_stock / self.species_count if self.species_count else 0

        print('\n--- User Set Value ---')
        print('Max number of responses to use per API:', max_responses)

        print('\n--- Global Summary ---')
        print('Total Number of Projects:', self.total_projects)
        print('Total Number of Active Projects:', self.active_count)
        print('Total Number of Inactive Projects:', self.inactive_count)
        print('Average CO2 compensated (in tons) per project:', average_co2)
        print('Average tree stock per species:', average_stock)
        print('Unique Locations:', list(self.unique_locations))

        print('\n--- Forest Data ---')
        print('ForestIDs queried in ascending order:', self.project_ids)
        print('Number of Forests queried:', self.total_forests_queried)
        print('Total CO2 compensated (in tons) across all queried project sites: ', self.total_co2)
        print('This represents the estimated amount of carbon dioxide, a greenhouse gas, that the trees in these projects have removed from the atmosphere.')
        print(f'Total CO2 compensated by the trees in stock: {global_summary.total_co2_compensated_trees} tons')  
        max_tree_count = max(forests.values()) if forests else 0
        min_tree_count = min(forests.values()) if forests else 0
        largest_forests = [k for k, v in forests.items() if v == max_tree_count] if forests else ['No forests']
        smallest_forests = [k for k, v in forests.items() if v == min_tree_count] if forests else ['No forests']
        print('The forest(s) with the most trees:', ', '.join(largest_forests), 'with', max_tree_count, 'trees.')
        print('The forest(s) with the fewest trees:', ', '.join(smallest_forests), 'with', min_tree_count, 'trees.')

        print('\n--- Species Data ---')
        species_list = list(self.species_queried)
        if len(species_list) > 10:
            species_display = ', '.join(species_list[:10]) + '...'
        else:
            species_display = ', '.join(species_list)

        print('Species queried (up to 10): ', species_display)
        print('Total count of tree species found: ', self.species_count)
        if species_count_dict:
            most_common_species = max(species_count_dict, key=species_count_dict.get)
        else:
            most_common_species = 'No species found'
        print('Most common species:', most_common_species)


        print("\n--- Planting Site Data ---")
        average_planting_sites = total_planting_sites / global_summary.total_forests_queried
        print(f"Average number of planting sites per project: {average_planting_sites}")
        max_co2_location = max(self.co2_compensated_by_location.items(), key=lambda x: x[1])[0]
        print(f'Location with highest CO2 compensated: {max_co2_location} with {self.co2_compensated_by_location[max_co2_location]} tons of CO2')

        print('\n--- Cost Data ---')
        average_price = self.total_price / self.species_count if self.species_count else 0
        print('Average cost to plant across all queried projects: $', "{:.2f}".format(average_price))
        print(f'{price_count} prices successfully fetched out of {global_summary.total_forests_queried} total projects.')
        print('The species with the highest price:', self.highest_price_species, 'with a price of $',self.highest_price)
        print('The species with the lowest price:', self.lowest_price_species, 'with a price of $',self.lowest_price)
        
        print('\n--- Description Data ---')
        random_project_index = random.randint(0, len(self.project_ids)-1)
        print('A random description of project id', self.project_ids[random_project_index], ':', self.project_descriptions[random_project_index])

start_time = time.time()
global_summary = Summary()
price_count = 0
total_planting_sites = 0
species_count_dict = {}
forests = {}

response = requests.get(projects_url)
response.raise_for_status()
projects = response.json()

global_summary.total_projects = len(projects)

active_projects = [project for project in projects if project['status'] == 'active']
global_summary.active_count = len(active_projects)
global_summary.inactive_count = global_summary.total_projects - global_summary.active_count

random_projects = random.sample(active_projects, min(len(active_projects), max_responses))

for project in random_projects:
    try: 
        global_summary.project_ids.append(project['id'])
        global_summary.project_ids.sort()
        global_summary.total_forests_queried += 1

        planting_sites_url = planting_sites_url_template.format(project['id'])
        response = requests.get(planting_sites_url)
        response.raise_for_status()

        # Add the number of planting sites for this project to the total
        total_planting_sites += len(response.json())

        single_project_url = single_project_url_template.format(project['id'])
        response = requests.get(single_project_url)
        response.raise_for_status()
        single_project = response.json()
        global_summary.project_descriptions.append(single_project['description'])

        print(f"\nDetailed information of randomly selected Project ID {project['id']}:")
        print(json.dumps(single_project, indent=2))

        planting_sites_url = planting_sites_url_template.format(project['id'])
        response = requests.get(planting_sites_url)
        response.raise_for_status()
        planting_sites = response.json()[:max_responses]
        print(f"\nTop {max_responses} planting site(s) associated with Project ID {project['id']}:")
        print(json.dumps(planting_sites, indent=2))

        species_url = species_url_template.format(project['id'])
        response = requests.get(species_url)
        response.raise_for_status()
        species = response.json()[:max_responses]
        print(f"\nTop {max_responses} species related to Project ID {project['id']}:")
        print(json.dumps(species, indent=2))

        for sp in species:
            # Update species_count_dict
            if sp['name'] in species_count_dict:
                species_count_dict[sp['name']] += 1
            else:
                species_count_dict[sp['name']] = 1
            global_summary.species_queried.add(sp['name'])
            if float(sp['price']) > global_summary.highest_price:
                global_summary.highest_price = float(sp['price'])
                global_summary.highest_price_species = sp['name']
            if global_summary.lowest_price is None or float(sp['price']) < global_summary.lowest_price:
                global_summary.lowest_price = float(sp['price'])
                global_summary.lowest_price_species = sp['name']
            try:
                global_summary.total_price += float(sp['price'])
                global_summary.total_stock += sp['stock']
                global_summary.total_co2_compensated_trees += sp['stock'] * sp['life_time_CO2']
                price_count += 1
            except ValueError as e:
                print(f'Error with price for species {sp["name"]}: {e}')

        forest_id = project['id']  
        forests_url = forests_url_template.format(forest_id)
        response = requests.get(forests_url)
        response.raise_for_status()
        forest_data = response.json()
        tree_count = forest_data['tree_count']
        forests[project['name']] = tree_count
        print(f"\nData for Forest ID {forest_id}:")
        print(json.dumps(forest_data, indent=2))
        global_summary.unique_locations.add(single_project['location'])

        global_summary.total_co2 += forest_data['co2_compensated_tons']
        global_summary.update_co2_compensated_by_location(single_project['location'], forest_data['co2_compensated_tons'])


    except requests.exceptions.RequestException as e:
        print(f'Error with Project ID {project["id"]}: {e}')

global_summary.species_count = price_count

if price_count:
    average_price = global_summary.total_price / price_count
else:
    average_price = 0

global_summary.print()

end_time = time.time()
execution_time = end_time - start_time
print('\n--- Timer ---')
print(f"Script execution time: {execution_time} seconds")
print('--- Script End ---')