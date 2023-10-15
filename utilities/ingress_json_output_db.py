import json
import psycopg2
from dotenv import load_dotenv
import os

# Load .env file
load_dotenv('../.env')

# Get database connection parameters from environment variables
host = os.getenv('2023oct9_AZURE_POSTGRES_HOST')
database = os.getenv('2023oct9_AZURE_POSTGRES_DATABASE')
user = os.getenv('2023oct9_AZURE_POSTGRES_USER')
password = os.getenv('2023oct9_AZURE_POSTGRES_PASSWORD')
table = os.getenv('2023oct15_AZURE_POSTGRES_DATABASE_RLHF_TD_QUESTIONS_AND_ANSWERS_TABLE')
port = os.getenv('2023oct9_AZURE_POSTGRES_PORT')

# Setup the database connection
conn = psycopg2.connect(
    host=host,
    database=database,
    user=user,
    password=password,
    port=port
)

# Create a new database session
cur = conn.cursor()

# Load the JSON data
with open('outputs2.json', 'r') as f:
    json_data = json.load(f)

# Parse the JSON data and insert them into your PostgreSQL database
for i, entry in enumerate(json_data):
    question = entry.get("question")
    answer = entry.get("answer")
    elapsed_time = entry.get("elapsed_time")

    # Prepare the INSERT statement
    query = "INSERT INTO " + table + " (question, answer, elapsed_time) VALUES (%s, %s, %s) RETURNING pk_id"

    # Execute the INSERT statement
    cur.execute(query, (question, answer, elapsed_time))
    inserted_id = cur.fetchone()[0]

    # Print the ID of the inserted row
    print(f"Inserted row {i+1} with ID {inserted_id}")

# Commit changes
conn.commit()

# Close the cursor and connection
cur.close()
conn.close()