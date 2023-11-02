import requests
import json
import os
from dotenv import load_dotenv

dotenv_path = os.path.join(os.path.dirname(__file__), '../../.env')

load_dotenv(dotenv_path)

base_url = os.getenv('2023oct25_WEAVIATE_URL')
weaviate_class_name = os.getenv('2023oct25_WEAVIATE_CLASS_NAME')
weaviate_object_value = os.getenv('2023oct25_WEAVIATE_CLASS_OBJ_VALUE')
url = f"{base_url}/v1/graphql"  # append additional part to the base URL

headers = {
    'Content-Type': 'application/json',
    'Authorization': f'Bearer {os.getenv("2023oct21_WEAVIATE_API_KEY")}', 
    'X-Azure-Api-Key': f'{os.getenv("2023oct21_AZURE_OPENAI_API_KEY")}',
}

# Define global constants
CLASS_NAME = weaviate_class_name
SEARCH_TERM = '.'
SIMILARITY_THRESHOLD = 0.7
OBJECT_VALUE = weaviate_object_value
LIMIT = 1

# move away forces are optional, but can be used to improve the search results. Setting  to zero nullifies it.
UNWANTED_TERM = "zzzzz"
MOVE_AWAY_FORCE = 0.0


SPECIFIC_ROUTER_VALUE = "deployment"

def search_vector_similarity():
    payload = {
        "query": f'''
        {{
            Get {{
                {CLASS_NAME}(nearText: {{
                    concepts: ["{SEARCH_TERM}"],
                    certainty: {SIMILARITY_THRESHOLD},
                    moveAwayFrom: {{concepts: ["{UNWANTED_TERM}"], force: {MOVE_AWAY_FORCE}}}
                }}, limit: {LIMIT}) {{
                    {OBJECT_VALUE}
                    _additional {{certainty}}
                }}
            }}
        }}
        '''
    }
    response = requests.post(url, headers=headers, json=payload)
    print("Similarity Search:")
    print(json.dumps(response.json(), indent=4))
    print()

if __name__ == "__main__":
    search_vector_similarity()