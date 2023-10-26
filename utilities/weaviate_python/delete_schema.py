import requests
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

    # Set the schema to delete
    schemaToDelete = os.getenv('2023oct25_SCHEMA_TO_DELETE')
    
    # Delete the specified class from the Weaviate schema
    url = base_url + '/v1/schema/' + schemaToDelete
    response = requests.delete(url, headers=headers)

    print("Response code for {} class deletion: {}".format(schemaToDelete, response.status_code))

if __name__ == "__main__":
    main()