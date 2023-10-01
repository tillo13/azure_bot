const helpMessage = {
    title: "Welcome to $help!",
    note: "Please remember that outside of individual sessions, our interaction history isn't stored. This means if you ask me what we discussed a year, a month, or even a day ago, I wouldn't know. However, during a single session, I will remember and build upon our conversation. Give it a try!",
    instructions: "Here are a few things you can do here:",
    list: [
        "Ask basic questions, no keywords necessary!",
        "Use `$dalle` command to create images via DALL·E",
        "Type `$hamburger` for a fun surprise"
    ]
};

function generateAdaptiveCardContent(textStyling) {
    return {
        type: "AdaptiveCard",
        body: [{
            type: "TextBlock",
            text: `${textStyling.helpTitle}${helpMessage.title}${textStyling.helpTitleEnd}`,
            wrap: true,
        }, {
            type: "TextBlock",
            text: helpMessage.note,
            wrap: true,
        }, {
            type: "TextBlock",
            text: `${textStyling.listTitle}${helpMessage.instructions}${textStyling.listTitleEnd}`,
            wrap: true,
        },
        ...helpMessage.list.map((item, index) => ({
            type: "TextBlock",
            text: `${typeof textStyling.listItem === 'function' ? textStyling.listItem(index) : textStyling.listItem}${item}${textStyling.listItemEnd}`,
            wrap: true,
        }))
        ],
        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    };
}

const sharedWebAndTeamsStyling = {
    helpTitle: "**",
    helpTitleEnd: "**",
    listTitle: "**",
    listTitleEnd: "**",
    listItem: "• ",
    listItemEnd: ""
};
module.exports = {
    help_DefaultResponse: function() {
        return [
            `*${helpMessage.title}*`,
            helpMessage.note,
            `*${helpMessage.instructions}*`,
            ...helpMessage.list.map((item, index) => `${index + 1}. ${item}`)
        ].join('\n');
    },

    help_WebchatResponse: function() {
        let cardContent = generateAdaptiveCardContent(sharedWebAndTeamsStyling);
        cardContent.version = "1.3"; // Webchat specific version

        return {
            type: "attachment",
            contentType: "application/vnd.microsoft.card.adaptive",
            contentUrl: null,
            content: cardContent,
        };
    },

    help_msteamsResponse: function() {
        let cardContent = generateAdaptiveCardContent(sharedWebAndTeamsStyling);
        cardContent.version = "1.4"; // MSTeams specific version

        return {
            type: "attachment",
            contentType: "application/vnd.microsoft.card.adaptive",
            contentUrl: null,
            content: cardContent
        };
    },

    help_SlackResponse: function() {
        return {
            "blocks": [{
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": `*${helpMessage.title}*`
                    }
                }, {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": `_${helpMessage.note}_`
                    }
                }, {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": `*${helpMessage.instructions}*`
                    }
                },
                ...helpMessage.list.map((item, index) => ({
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": `*${index + 1}.* ${item}`
                    }
                })),
            ]
        };
    },
};