module.exports = {
    help_WebchatResponse: function() {
        return [
            "Welcome to $help!",
            "First off, realize I won't remember our past conversation outside of this exact instance.",
            "For example, if you ask me what I said a year ago, we don't have that (yet). However, I will try to remember anything you've asked in this exact session. Give it a try!",
            "Things you can do here:",
            "1. Ask any questions, no keywords necessary, have at it!",
            "2. Use $dalle to create images with Dalle",
            "3. Type $hamburger and see something fun."
        ].join("\n");
    },

    help_SlackResponse: function() {
        return [
            "Welcome to $help!",
            "First off, realize I won't remember our past conversation outside of this exact instance.",
            "For example, if you ask me what I said a year ago, we don't have that (yet). However, I will try to remember anything you've asked in this exact session. Give it a try!",
            "Things you can do here:",
            "1. Ask any questions, no keywords necessary, have at it!",
            "2. Use $dalle to create images with Dalle",
            "3. Type $hamburger and see something fun."
        ].join("\n");
    },

    help_msteamsResponse: function() {
        return {
            "type": "message",
            "attachments": [{
                "contentType": "application/vnd.microsoft.card.adaptive",
                "contentUrl": null,
                "content":  {
                    "type": "AdaptiveCard",
                    "body": [
                        {
                            "type": "TextBlock",
                            "text": "Welcome to $help!",
                            "wrap": true
                        },
                        {
                            "type": "TextBlock",
                            "text": "First off, realize I won't remember our past conversation outside of this exact instance.",
                            "wrap": true
                        },
                        {
                            "type": "TextBlock",
                            "text": "For example, if you ask me what I said a year ago, we don't have that (yet). However, I will try to remember anything you've asked in this exact session. Give it a try!",
                            "wrap": true
                        },
                        {
                            "type": "TextBlock",
                            "text": "Things you can do here:",
                            "wrap": true
                        },
                        {
                            "type": "TextBlock",
                            "text": "1. Ask any questions, no keywords necessary, have at it!",
                            "wrap": true
                        },
                        {
                            "type": "TextBlock",
                            "text": "2. Use $dalle to create images with Dalle",
                            "wrap": true
                        },
                        {
                            "type": "TextBlock",
                            "text": "3. Type $hamburger and see something fun.",
                            "wrap": true
                        }
                    ],
                    "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                    "version": "1.2"
                }
            }]
        }
    }
}  