import requests
import os
from dotenv import load_dotenv

# Load environment variables
dotenv_path = os.path.join(os.path.dirname(__file__), '../../.env')
load_dotenv(dotenv_path)

base_url = os.getenv('2023oct25_WEAVIATE_URL')
weaviate_class_name = os.getenv('2023oct25_WEAVIATE_CLASS_NAME')
api_key_header = os.getenv('2023oct21_WEAVIATE_API_KEY')

# Set the ID of the object to delete here
id_to_delete = "c7907284-d375-4db2-ab55-beb2f341ed31"

def delete_object_by_id(object_id):
    # Construct the URL
    delete_url = f"{base_url}/v1/objects/{object_id}"

    # Set up headers
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {api_key_header}',
    }

    # Perform the DELETE request
    response = requests.delete(delete_url, headers=headers)

    # Check the response
    if response.status_code == 204:  # HTTP 204 No Content indicates success
        print(f"Object with ID {object_id} deleted successfully.")
    else:
        print(f"Failed to delete object with ID {object_id}. Status code: {response.status_code}")
        print("Response:", response.text)

if __name__ == "__main__":
    delete_object_by_id(id_to_delete)