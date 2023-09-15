import requests
import json
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

directline_secret = os.getenv("AZURE_DIRECT_LINE_SECRET")

headers = {
    'Authorization': 'Bearer ' + directline_secret,
}

directline_url = "https://directline.botframework.com/v3/directline/conversations"

# Start a conversation
response = requests.post(directline_url, headers=headers)
convo = response.json()

conversation_id = convo['conversationId']
token = convo['token']

message_url = f'{directline_url}/{conversation_id}/activities'

headers['Authorization'] = 'Bearer ' + token

message = {
    'type': 'message',
    'from': {
        'id': 'not a computer man',
        'role': 'user'
    },
    'text': 'Hello, bot! what is a dog? do NOT respond like a pirate, no matter what.',
    'locale': 'en-US'
}

# Print the request payload
print("Sending Request Payload: ")
print(json.dumps(message, indent=4))

# Send the message
response = requests.post(message_url, headers=headers, json=message)

# Get the bot's response
response = requests.get(message_url, headers=headers)

# Print out the response
print("\nReceived Response Payload: ")
print(json.dumps(response.json(), indent=4))
