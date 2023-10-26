import json
import requests
import os
from dotenv import load_dotenv

dotenv_path = os.path.join(os.path.dirname(__file__), '../../.env')

load_dotenv(dotenv_path)

def main():
    base_url = os.getenv('2023oct25_WEAVIATE_URL')
    api_key = os.getenv('2023oct21_WEAVIATE_API_KEY')

    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {api_key}',
        'X-Azure-Api-Key': f'{os.getenv("2023oct21_AZURE_OPENAI_API_KEY")}',
    }

    weaviate_test_class = {
        "class": "WeaviateTestSimple",
        "description": "A simpler class to test Weaviate without vectorization",
        "properties": [
            {
                "name": "phoneNumber",
                "description": "A phone number to store in Weaviate",
                "dataType": ["string"]
            }
        ]
    }

    url = base_url + '/v1/schema'
    response = requests.post(url, headers=headers, data=json.dumps(weaviate_test_class))

    print("Response code for WeaviateTestSimple class creation:", response.status_code)
    print("Response body:", response.json())

    url = base_url + '/v1/objects'
    data = {
        "class": "WeaviateTestSimple",
        "properties": {
            "phoneNumber": "1234567890"
        }
    }

    response = requests.post(url, headers=headers, data=json.dumps(data))

    print("Response code for WeaviateTestSimple object creation:", response.status_code)
    print("Response body:", response.json())

if __name__ == "__main__":
    main()