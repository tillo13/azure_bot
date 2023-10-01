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
                ...helpMessage.list.map((item, index) => ({
                    type: "TextBlock",
                    text: `${index + 1}. ${item}`,
                    wrap: true,
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
            helpMessage.note,
            `*${helpMessage.instructions}*`,
            ...helpMessage.list.map((item, index) => `${index + 1}. ${item}`)
        ].join('\n');
    },
    
    help_msteamsResponse: function() {
        let message = [
            `**${helpMessage.title}**`,
            helpMessage.note,
            `**${helpMessage.instructions}**`,
            ...helpMessage.list.map((item, index) => `**${index + 1}.** ${item}`)
        ].join('\n');
    
        // Replace single newlines with a space and a newline to give spacing
        message = message.replace(/\n(?!\n)/g, ' \n');
    
        return message;
    }
};