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

    # Request the Weaviate objects
    url = base_url + '/v1/objects'
    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        # print data
        response_json = response.json()
        print(json.dumps(response_json, indent=4)) # pretty print data
    else:
        # print the response if an error occurs
        print(response.text)

if __name__ == "__main__":
    main()