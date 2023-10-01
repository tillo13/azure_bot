const helpMessage = {
    title: "Welcome to $help!",
    note: "Please remember that outside of individual sessions, our interaction history isn't stored. This means if you ask me what we discussed a year, a month, or even a day ago, I wouldn't know. However, during a single session, I will remember and build upon our conversation. Give it a try!",
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
            "Here are few things you can do here:",
            ...helpMessage.list.map((item, index) => `${index + 1}. ${item}`)
        ].join('\n');
    },
     
    help_WebchatResponse: function () {
        // Provide the same text as default response but in AdaptiveCard format for Webchat
        const adaptiveCardContent = {
            type: "AdaptiveCard",
            body: [
                `*${helpMessage.title}*`,
                helpMessage.note,
                "Here are few things you can do here:",
                ...helpMessage.list.map((item, index) => `${index + 1}. ${item}`)
            ].map((msg) => ({
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
        // Provide the same text as default response
        return [
            `*${helpMessage.title}*`,
            helpMessage.note,
            "Here are few things you can do here:",
            ...helpMessage.list.map((item, index) => `${index + 1}. ${item}`)
        ].join('\n');
    },
    
    help_msteamsResponse: function() {
        // Return same content but with markdown formatting
        return [
            `**${helpMessage.title}**`,
            helpMessage.note,
            "**Here are few things you can do here:**",
            ...helpMessage.list.map((item, index) => `**${index + 1}.** ${item}`)
        ].join('\n');
    }
};