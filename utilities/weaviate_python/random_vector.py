import requests
import os
from dotenv import load_dotenv
import random
import json

dotenv_path = os.path.join(os.path.dirname(__file__), '../../.env')
load_dotenv(dotenv_path)

def get_random_object():
    try:
        base_url = os.getenv('2023oct25_WEAVIATE_URL')
        api_key = 'Bearer ' + os.getenv('2023oct21_WEAVIATE_API_KEY')
        classname = os.getenv('2023oct25_WEAVIATE_CLASS_NAME')
        headers = {
            'Content-Type': 'application/json',
            'Authorization': api_key,
        }

        query = {"query": f'{{ Aggregate {{ {classname} {{ meta {{ count }} }} }} }}'}
        response = requests.post(url=base_url+'/v1/graphql', headers=headers, json=query)
        total_objects = response.json()['data']['Aggregate'][classname][0]['meta']['count']

        print(f"Total number of objects in {classname}: {total_objects}")

        if total_objects> 0:
            random_offset = random.randint(0, total_objects - 1)

            query = {"query": f'{{ Get {{ {classname}(limit: 1, offset: {random_offset}) {{ _additional {{ id }} }} }} }}'}
            response = requests.post(url=base_url+'/v1/graphql', headers=headers, json=query)
            data = response.json()
            random_id = data['data']['Get'][classname][0]['_additional']['id']

            response = requests.get(base_url + '/v1/objects/' + random_id, headers=headers)
            if response.status_code == 200:
                print(json.dumps(response.json(), indent=2))
            else:
                print('Failed to fetch object: {}'.format(response.content))

        else:
            print(f"No object found for the class: {classname}")

    except Exception as e:
        print(f'An error occurred: {str(e)}. Trying again...')
        print('If problem persists, please try again later.')
        get_random_object()

if __name__ == "__main__":
    get_random_object()