# Teradata Bot
This app provides a conversational bot experience across multiple platforms like Slack, Microsoft Teams, and webchat. The bot can understand natural language, have coherent dialogs, and execute helpful commands.

## Features

- Responds intelligently to user messages across Slack, Teams and webchat
- Maintains conversation context and history within a thread/chat session
- Provides helpful responses and can requery itself when unsure  
- Handles common commands like `$help`, `$reset`, `$dalle`, `$dig` to name a few.
- Integrates with Jira to create tickets from conversations
- Leverages DALL-E 2 to generate images from prompts
- Logs usage analytics like messages, users and interactions
- Built with Bot Framework SDK and Azure bot service  
- Uses OpenAI's GPT-3.5 Turbo model via Azure Cognitive Services API
- Maintains state in bot's user state memory storage

## Architecture

The app uses a modular architecture:

- `msteams.js`, `slack.js`, `message_handler.js` - platform-specific logic
- `chat_helper.js` - core conversational module
- `special_commands.js` - custom command handlers  
- `slack_utils.js`, `jira_utils.js` - integration helpers
- Azure Bot Framework and Azure Cloud infrastructure
- Ties into Teradata OFS for storage

Key components:

- **Bot Framework SDK** - SDK to build and connect bot
- **Azure Bot Service** - Cloud hosting for bot  
- **OpenAI GPT-3.5 Turbo** - NLP for conversations
- **Azure Cognitive Services** - OpenAI endpoint
- **User State** - Storage for context, dialogs


## Usage

**Natural conversations** - Chat with the bot normally. It will have a coherent, context-aware conversation.

**$help** - Get info about the bot's capabilities. 

**$reset** - Start a fresh conversation thread.

**$idea [description]** - Create an idea/task via Jira ticket. 

**$dalle [prompt] --size --num** - Generate AI images via DALL-E 2.0.  

See `special_commands.js` for all supported commands.

Handles platform-specific needs:

- **Slack** - Threads, reactions  
- **Teams** - User welcome, Adaptive Cards
- **Webchat** - Hosted web embed


## Future thoughts/tasks on deck...
- Cleaner payload manipulation
- Deeper vector database analysis
- Other chat platforms via Azure Channels
- RAG (Retrieval Augmented Generation) via Weaviate ingest
- GPT4 replace/alignment.
- Clean up endpoint_formats.js
- Modularize codebase for better reuse.
- Set footer showing cosine response if RAG hits.
