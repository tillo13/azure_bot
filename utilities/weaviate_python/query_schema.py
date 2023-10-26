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

    # Request the Weaviate schema
    url = base_url + '/v1/schema'
    response = requests.get(url, headers=headers)

    print("Response code for Schema Retrieval:", response.status_code)
    print("Response body:")
    response_json = response.json()
    print(json.dumps(response_json, indent=4)) # Pretty print the schema

    # Now print the classes
    classes = [classe['class'] for classe in response_json['classes']]
    print("Classes:")
    for classe in classes:
        print(classe)

if __name__ == "__main__":
    main()