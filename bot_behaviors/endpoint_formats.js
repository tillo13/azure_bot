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

module.exports = {
    help_DefaultResponse: function() {
        return [
            `*${helpMessage.title}*`,
            helpMessage.note,
            `*${helpMessage.instructions}*`,
            ...helpMessage.list.map((item, index) => `${index + 1}. ${item}`)
        ].join('\n');
    },
     
    help_WebchatResponse: function () {
        const adaptiveCardContent = {
            type: "AdaptiveCard",
            body: [
                {
                    type: "TextBlock",
                    text: `*${helpMessage.title}*`,
                    wrap: true,
                },
                {
                    type: "TextBlock",
                    text: helpMessage.note,
                    wrap: true,
                },
                {
                    type: "TextBlock",
                    text: `*${helpMessage.instructions}*`,
                    wrap: true,
                },
                ...helpMessage.list.map((item) => ({
                    type: "TextBlock",
                    text: `\u2022 ${item}`,
                    wrap: true
                }))
            ],
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
        return [
            `*${helpMessage.title}*`,
            `\n_${helpMessage.note}_\n`,
            `*${helpMessage.instructions}*`,
            ...helpMessage.list.map((item, index) => {
                const isCommand = item.startsWith('$');
                const listItem = isCommand ? `\n\`${item}\`` : `\n_${item}_`;
                return `*${index + 1}.* ${listItem}\n`;
            })
        ].join('\n');
    },
    
    help_msteamsResponse: function() {
        const adaptiveCardContent = {
            type: "AdaptiveCard",
            body: [
                {
                    type: "TextBlock",
                    text: `**${helpMessage.title}**`,
                    wrap: true
                },
                {
                    type: "TextBlock",
                    text: helpMessage.note,
                    wrap: true
                },
                {
                    type: "TextBlock",
                    text: `**${helpMessage.instructions}**`,
                    wrap: true
                },
                {
                    type: "TextBlock",
                    text: `**1.**  Ask basic questions, no keywords necessary!`,
                    wrap: true
                },
                {
                    type: "TextBlock",
                    text: `**2.**  Use **$dalle** command to create images via DALL·E`,
                    wrap: true
                },
                {
                    type: "TextBlock",
                    text: `**3.** Type **$hamburger** for a fun surprise`,
                    wrap: true
                }
            ],
            $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
            version: "1.4",
        };
    
        return {
            type: "attachment",
            contentType: "application/vnd.microsoft.card.adaptive",
            contentUrl: null,
            content: adaptiveCardContent
        };
    }
};