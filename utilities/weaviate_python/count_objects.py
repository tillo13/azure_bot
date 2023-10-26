import requests
import json
import os
from dotenv import load_dotenv

dotenv_path = os.path.join(os.path.dirname(__file__), '../../.env')

load_dotenv(dotenv_path)

def main():
    base_url = os.getenv('2023oct25_WEAVIATE_URL')
    api_key = 'Bearer ' + os.getenv('2023oct21_WEAVIATE_API_KEY')


    headers = {
        'Content-Type': 'application/json',
        'Authorization': api_key,
    }

    endpoint = '/v1/objects'
    total_count = 0
    page = 1
    limit = 100

    while True:
        params = {'_limit': limit, '_pagination': page}
        response = requests.get(base_url + endpoint, headers=headers, params=params)

        if response.status_code == 200:
            json_response = response.json()
            items_count = len(json_response['objects'])
            if items_count == 0:
                break

            total_count += items_count
            page += 1  # Go to the next page
        else:
            print('Failed to fetch page {}: {}'.format(page, response.content))
            break

    print(f'Total objects count: {total_count}')

if __name__ == "__main__":
   main()