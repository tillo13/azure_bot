import json
import requests
import os
from dotenv import load_dotenv

dotenv_path = os.path.join(os.path.dirname(__file__), '../../.env')

load_dotenv(dotenv_path)

def main():
    base_url = os.getenv('2023oct25_WEAVIATE_URL')

    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {os.getenv("2023oct21_WEAVIATE_API_KEY")}', 
        'X-Azure-Api-Key': f'{os.getenv("2023oct21_AZURE_OPENAI_API_KEY")}',
    }

    tillo_test_class = {
       "class": "TilloTest",
       "description": "A class to test Weaviate with Vectorization and OpenAI",
       "properties": [
           {
               "name": "phoneNumber",
               "description": "A phone number to store in Weaviate",
               "dataType": ["string"]
           }
       ],
       "moduleConfig": {
           "generative-openai": {
               "deploymentId": "teradata-ess-cloud-poc-gpt-35-turbo",
               "model": "gpt-3.5-turbo",
               "resourceName": "teradata-ess-cloud-poc"
           },
           "text2vec-openai": {
               "baseURL": "https://api.openai.com",
               "deploymentId": "teradata-ess-cloud-poc-embedding-ada-002",
               "model": "ada",
               "modelVersion": "002",
               "resourceName": "teradata-ess-cloud-poc",
               "type": "text",
               "vectorizeClassName": True
           }
       }
    }

    url = base_url + '/v1/schema'
    response = requests.post(url, headers=headers, data=json.dumps(tillo_test_class))

    print("Response code for TilloTest class creation:", response.status_code)
    print("Response body:", response.json())

    url = base_url + '/v1/objects'
    data = {
        "class": "TilloTest",
        "properties": {
            "phoneNumber": "1234567890"
        }
    }

    response = requests.post(url, headers=headers, data=json.dumps(data))

    print("Response code for TilloTest object creation:", response.status_code)
    print("Response body:", response.json())

if __name__ == "__main__":
    main()