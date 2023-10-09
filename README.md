# MS Azure Bot Features
This app provides a conversational bot experience across multiple platforms like Slack, Microsoft Teams, and webchat. The bot can understand natural language, have coherent dialogs, and execute helpful commands.

## Features

- Responds intelligently to user messages across Slack, Teams and webchat
- Maintains conversation context and history within a thread/chat session
- Provides helpful responses and can requery itself when unsure  
- Handles common commands like `$help`, `$reset`, `$dalle` etc.
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
- `.env` file - secrets and configuration

Key components:

- **Bot Framework SDK** - SDK to build and connect bot
- **Azure Bot Service** - Cloud hosting for bot  
- **OpenAI GPT-3.5 Turbo** - NLP for conversations
- **Azure Cognitive Services** - OpenAI endpoint
- **User State** - Storage for context, dialogs

## Getting Started 

### Prerequisites

- Node.js 14+  
- Azure subscription
- Bot Framework registration 
- OpenAI API key
- Other API keys for integrations

### Installation
git clone <repo>
npm install

Copy code


Configure `.env` with API keys and settings.

Deploy bot service on Azure.  

Connect channels like Slack and Teams.

Run locally:
npm start

Copy code


### Configuration

The app requires various API keys and settings specified in `.env`:

- `MicrosoftAppId`, `MicrosoftAppPassword` - Bot Framework app credentials  
- `OPENAI_API_KEY` - OpenAI API key
- `SLACK_BOT_TOKEN` - Slack bot token
- etc.


## Usage

**Natural conversations** - Chat with the bot normally. It will have a coherent, context-aware conversation.

**$help** - Get info about the bot's capabilities. 

**$reset** - Start a fresh conversation thread.

**$jira [description]** - Create a Jira ticket. 

**$dalle [prompt] --size --num** - Generate AI images via DALL-E 2.0.  

See `special_commands.js` for all supported commands.

Handles platform-specific needs:

- **Slack** - Threads, reactions  
- **Teams** - User welcome, Adaptive Cards
- **Webchat** - Hosted web embed