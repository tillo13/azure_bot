import os
import json
import requests
import datetime
from PyPDF2 import PdfReader
from tqdm import tqdm
from dotenv import load_dotenv
import traceback
import re
import time
import json

# Global variables
PDF_FILE_PATH = "./files_/pdf_file_name.pdf"

#set these to zero to ingest everything in the pdf, or set them to the page numbers you want to ingest
START_PAGE = 0
END_PAGE = 0
SQL_KEY_PHRASES = {"SELECT", "REPLACE", "UPDATE", "INSERT", "DELETE", "CREATE", "ALTER", "BEGIN", "CALL", "CASE", "COMMENT", "COMMIT", "DESCRIBE",
                   "DROP", "END", "EXECUTE", "EXPLAIN", "GRANT", "MERGE", "REVOKE", "ROLLBACK", "SAVEPOINT", "SET", "TRUNCATE", "COLLECT", "QUALIFY", "SAMPLE", "UPSERT"}
global_class_name = "teradataDocs"

def load_progress(file_path):
    try:
        with open(file_path, "r") as f:
            data = f.read()
            if data:  # If file contains data
                return json.loads(data)
            else:  # If file is empty
                print("File exists but is empty. Starting a new progress...")
                return {}
    except FileNotFoundError:  # If file does not exist
        print("File not found. Creating a new one...")
        with open(file_path, "w") as f:  
            json.dump({}, f)  # Create a new empty JSON file
        return {}
    except json.JSONDecodeError:  # If file contains invalid JSON
        print("File contains invalid JSON. Please check the file content.")
        return {}

def save_progress(file_path, progress):
    with open(file_path, "w") as f:
        json.dump(progress, f)

class WeaviateInterface:
    def __init__(self):

        dotenv_path = os.path.join(os.path.dirname(__file__), '../../.env')
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

    def create_class(self):
        tillo_test_class = {
            "class": self.class_name,
            "description": "Vectorings docs.teradata",
            "properties": [
                {
                    "name": "data_chunk",
                    "description": "A chunk of data from Teradata docs",
                    "dataType": ["string"]
                }],
            "moduleConfig": {
                "generative-openai": {
                    "deploymentId": self.deployment_id_gpt,
                    "model": "gpt-3.5-turbo",
                    "resourceName": self.resource_name},
                "text2vec-openai": {
                    "baseURL": "https://api.openai.com",
                    "deploymentId": self.deployment_id_embedding,
                    "model": "ada",
                    "modelVersion": "002",
                    "resourceName": self.resource_name,
                    "type": "text",
                    "vectorizeClassName": True}}}
        url = self.base_url + '/v1/schema'
        response = requests.post(url, headers=self.headers, data=json.dumps(tillo_test_class))
        print(f"Response code for {self.class_name} class creation:", response.status_code)
        print("Response body:", response.json())
    
    def does_class_exist(self):
        url = self.base_url + '/v1/schema'
        response = requests.get(url, headers=self.headers)
        print("Status Code:", response.status_code)  
        try:
            schema = response.json()
        except json.decoder.JSONDecodeError:
            print("Response Text:", response.text)  # print the response text if it can't be decoded as json
            raise  # re-raise the error to halt the program
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

    def get_existing_prompts(self):
        url = self.base_url + '/v1/graphql'
        graphql_query = {
            "query": f"""
                {{
                    Get {{
                        {self.class_name} {{
                            data_chunk
                        }}
                    }}
                }}
            """
        }
        response = requests.post(url, headers=self.headers, data=json.dumps(graphql_query))
        existing_objects = response.json()
        try:
            return [obj["data_chunk"] for obj in existing_objects["data"]["Get"][self.class_name]]
        except KeyError:
            print(f"No existing data found for class: {self.class_name}")
            return []

def get_total_pages(file_path):
    pdf = PdfReader(file_path)
    return len(pdf.pages)

def read_page(file_path, page_num):
    try:
        pdf = PdfReader(file_path)
        page = pdf.pages[page_num]
        return page.extract_text()
    except Exception:
        print(f"Unable to read page {page_num}. Skipping...")
        print(traceback.format_exc())

def remove_footer(text):
    return re.sub("Teradata VantageCloud Lake \\d+", "", text) if text else None

def get_data_chunks(text, min_lines=10):
    chunks = []
    current_chunk = []
    is_sql_chunk = False
    lines = text.split("\n")

    for line in lines:
        stripped_line = line.strip()
        first_word = stripped_line.split(maxsplit=1)[0] if stripped_line else ""

        if not is_sql_chunk and first_word.isupper() and first_word in SQL_KEY_PHRASES:
            is_sql_chunk = True
            current_chunk.append(line)
        elif ";" in stripped_line:  # End of a SQL statement
            is_sql_chunk = False
            current_chunk.append(line)
            chunks.append("\n".join(current_chunk))
            current_chunk = []
        else:
            current_chunk.append(line)

    if current_chunk:
        chunks.append("\n".join(current_chunk))

    return chunks

def process_page(file_path, page_num):
    text = read_page(file_path, page_num)
    text = remove_footer(text)
    data_chunks = get_data_chunks(text)

    return data_chunks

def process_pages(start_page, end_page, file_path):
    chunks = []
    for page_num in tqdm(range(start_page, end_page + 1), desc="Processing pages"):
        try:
            chunks += process_page(file_path, page_num)
        except Exception as e:
            print(f"Couldn't process page {page_num+1}: {e}")

    return chunks



cost_per_1000_tokens = 0.0001
def tokens_in_text(text):
    # This is a simple approximation, OpenAI might count tokens differently
    return len(text.split())

def calculate_cost(chunks):
    total_tokens = sum(tokens_in_text(chunk) for chunk in chunks)
    total_cost = (total_tokens / 1000) * cost_per_1000_tokens
    return total_cost


def main():
    global START_PAGE, END_PAGE
    progress = load_progress("./files_/progress.json")  # Load progress

    if progress:
        print("Resuming from existing progress.json...")
    else:
        print("No existing progress.json found. Starting afresh...")

    interface = WeaviateInterface()

    if not interface.does_class_exist():
        interface.create_class()
    else:
        print(f"{interface.class_name} class already exists, skipping class creation.")

    if START_PAGE <= 0:
        START_PAGE = 1
    
    if END_PAGE <= 0:
        END_PAGE = get_total_pages(PDF_FILE_PATH)

    print(f'We will be processing pages {START_PAGE} - {END_PAGE}...starting at {datetime.datetime.now()}')

    start_time = time.time()
    total_chunks = 0
    existing_prompts = interface.get_existing_prompts()


    for page_num in tqdm(range(START_PAGE-1, END_PAGE), desc="Processing pages"):
        if str(page_num) in progress: 
            continue  # Skip this iteration if the page is already processed
        
        try:
            chunks = process_page(PDF_FILE_PATH, page_num)

            filtered_chunks = [chunk for chunk in chunks if chunk not in existing_prompts]

            for chunk in filtered_chunks:
                interface.create_object(chunk)
                total_chunks += 1
                print(f"Processed chunk from page {page_num+1}:\n{chunk}\n\n")
            progress[str(page_num)] = chunks  # Save chunks to progress      
            try:
                save_progress("./files_/progress.json", progress)  # Save progress
            except Exception as e:
                print(f"Error while saving progress for page {page_num+1}: {e}. Continuing with the next page...")
        except Exception as e:
            print(f"Error while processing page {page_num+1}: {e}")

    cost_estimate = calculate_cost(chunks)

    print("\nSummary:")
    print(f"Total chunks created: {total_chunks}")
    print(f"Time taken: {time.time() - start_time} seconds")
    print(f"Estimated cost: ${'{:.5f}'.format(cost_estimate)}")


if __name__ == "__main__":
    main()