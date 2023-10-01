const helpMessage = [
    "*Welcome to $help!*",
    "Please remember that outside of individual sessions, our interaction history isn't stored. This means if you ask me what we discussed a year, a month, or even a day ago, I wouldn't know.",
    "However, during a single session, I will remember and build upon our conversation. Give it a try!",
    "Here are few things you can do here:",
    "1. Ask basic questions, no keywords necessary!",
    "2. Use `$dalle` command to create images via DALL·E.",
    "3. Type `$hamburger` for a fun surprise."
];

module.exports = {
    help_DefaultResponse: function() {
        // Join each string in the helpMessage array with a newline character to format your default help message
        return helpMessage.join('\n');
    },
     
    help_WebchatResponse: function () {
        // format helpMessage array into adaptive card for WebChat
        const adaptiveCardContent = {
            type: "AdaptiveCard",
            body: helpMessage.map((msg) => ({
                type: "TextBlock",
                text: msg,
                wrap: true,
            })),
            $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
            version: "1.3",
        };
    
        return {
            type: "attachment",
            contentType: "application/vnd.microsoft.card.adaptive",
            contentUrl: null,
            content: adaptiveCardContent,
        };
    },

    help_SlackResponse: function() {
        // Format the help message for Slack
        return {
            "blocks": helpMessage.map(text => ({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": text
                }
            }))
        };
    },
  
    help_msteamsResponse: function () {
      // format helpMessage array into adaptive card for MS Teams
      const adaptiveCardContent = {
        type: "AdaptiveCard",
        body: helpMessage.map((msg) => ({
          type: "TextBlock",
          text: msg,
          wrap: true,
        })),
        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
        version: "1.2",
      };
  
      return {
        type: "message",
        attachments: [
          {
            contentType: "application/vnd.microsoft.card.adaptive",
            contentUrl: null,
            content: adaptiveCardContent,
          },
        ],
      };
    },
};