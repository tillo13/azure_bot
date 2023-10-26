import os
import json
import requests
from dotenv import load_dotenv

dotenv_path = os.path.join(os.path.dirname(__file__), '../../.env')

load_dotenv(dotenv_path)

# Global variables
DATA_TO_ADD_TO_WEAVIATE = "a new thing for weaviate embedding here..."
global_class_name = "TeradataDocs"

class WeaviateInterface:
    def __init__(self):
        dotenv_path = os.path.join(os.path.dirname(__file__), 'path_to_dotenv_file/.env') 
        load_dotenv(dotenv_path)

        self.base_url = os.getenv('2023oct25_WEAVIATE_URL')
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {os.getenv("2023oct21_WEAVIATE_API_KEY")}',
            'X-Azure-Api-Key': f'{os.getenv("2023oct21_AZURE_OPENAI_API_KEY")}',
        }
        self.class_name = global_class_name
        self.deployment_id_gpt = os.getenv("2023oct22_TERADATA_ESC_CLOUD_POC_GPT")
        self.deployment_id_embedding = os.getenv("2023oct22_TERADATA_ESC_CLOUD_POC_EMBEDDING")
        self.resource_name = os.getenv("2023oct22_TERADATA_ESC_CLOUD_POC")

    def does_class_exist(self):
        url = self.base_url + '/v1/schema'
        response = requests.get(url, headers=self.headers)
       
        schema = response.json()
        return self.class_name in [classe['class'] for classe in schema['classes']]

    def create_object(self, data_chunk):
        data = {
            "class": self.class_name,
            "properties": {
                "data_chunk": data_chunk}}
        url = self.base_url + '/v1/objects'
        response = requests.post(url, headers=self.headers, data=json.dumps(data))
        if response.status_code == 200:
            objectId = response.json()['id']

            print(f"\n#####\nChunk '{data_chunk[:10]}...' has been successfully added to Weaviate with ID {objectId}.\n#####\n")

        else:
            print(f"There was a problem adding the chunk '{data_chunk}' to Weaviate. Response code: {response.status_code}")

def main():

    interface = WeaviateInterface()

    if not interface.does_class_exist():
        print(f"{interface.class_name} class doesn't exist.")
        return
    else:
        print(f"{interface.class_name} class exists.")
    
    interface.create_object(DATA_TO_ADD_TO_WEAVIATE)

if __name__ == "__main__":
    main()