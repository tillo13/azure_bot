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

    query = {
      "query": """
        {
          Get {
            TilloTest {
              phoneNumber
            }
          }
        }
      """
    }

    response = requests.post(base_url + '/v1/graphql', headers=headers, json=query)
    
    response_json = response.json()
    print(json.dumps(response_json, indent=4)) # pretty print data

if __name__ == "__main__":
    main()