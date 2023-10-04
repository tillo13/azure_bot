const helpMessage = {
	title: "Welcome to $help!",
	note: "Please remember that outside of individual sessions, our interaction history isn't stored. This means if you ask me what we discussed a year, a month, or even a day ago, I wouldn't know, by design. However, during a single session, I will remember and build upon our conversation. Give it a try!",
	instructions: "Here are a few things you can do here:",
	list: [
		"Ask basic questions, no keywords necessary!",
		{
			text: "Use `$dalle` command to create images via DALL·E. It allows you to specify image size and number of images:",
			subList: [
				"`--size`: specifies the image size. Options are 'large', 'medium', 'small'. Example: `$dalle a nice painting --size large`",
				"`--num`: specifies the number of images to be generated. Maximum is 10. Example: `$dalle a nice painting --num 3`"
			]
		},
		"Type `$dig` for intrigue..."
	]
};

/*
Formats a list into a string for message display.
Handles sub-bullets when an item itself is a {text, subList} object.
*/
function formatList(list, isSlackFormat = false) {
	const bullet = isSlackFormat ? '_' : '-';
    return list.map((item, index) => {
		let output = `${index + 1}. `;
		if (typeof(item) === 'string') {
			output += item;
		} else {
			// The item has a sub-bullet list
			output += `${item.text}\n` + item.subList.map(subItem => `${bullet} ${subItem}`).join('\n');
		}
		if (isSlackFormat) {
            output = "_" + output.replace(/\n/g, "\n_") + "_";
        }
		return output;
	}).join('\n');
}

module.exports = {
	help_DefaultResponse: function() {
		return [
			`*${helpMessage.title}*`,
			helpMessage.note,
			`*${helpMessage.instructions}*`,
			formatList(helpMessage.list)
		].join('\n');
	},

	help_WebchatResponse: function() {
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
                {
                    type: "FactSet",
                    facts: helpMessage.list.map((item, index) => {
                        if (typeof item === 'string') {
                            return {
                                title: `${index+1}. `,
                                value: item
                            };
                        } else {
                            return {
                                title: `${index+1}. ${item.text}`,
                                value: item.subList.join('\n')
                            };
                        }
                    })
                }
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
			`:robot_face:_${helpMessage.title}_\n`,
			`\n\n${helpMessage.note}\n`,
			`\n\n:information_source: ${helpMessage.instructions}\n\n`,
			formatList(helpMessage.list, true) // pass true to signify a SlackFormat
		].join('\n\n');
	},

	help_msteamsResponse: function() {
		const adaptiveCardContent = {
			type: "AdaptiveCard",
			body: [{
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
					text: formatList(helpMessage.list),
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
	},

	// new formatting functions:
	dalle_DefaultResponse: function(numImages, imageSize, duration) {
		return `Summary: We used DallE to create...\nNumber of images: ${numImages}\nSize of images: ${imageSize}\nTime to complete: ${duration} seconds. Thank you.`;
	},

	dalle_WebchatResponse: function(numImages, imageSize, duration) {
		const adaptiveCardContent = {
			$schema: "http://adaptivecards.io/schemas/adaptive-card.json",
			type: "AdaptiveCard",
			version: "1.3",
			body: [{
				type: "TextBlock",
				text: `**Summary**: Using [OpenAI's DALL·E](https://openai.com/research/dall-e) we created:\n _${global.current_dalle_prompt}_`,
				wrap: true
			},
			{
				type: "FactSet",
				facts: [{
					title: "Number of images:",
					value: numImages.toString()
				},
				{
					title: "Size of images:",
					value: imageSize
				},
				{
					title: "Time to complete:",
					value: `${duration} seconds`
				}
				]
			}
			]
		};
		return {
			type: "attachment",
			contentType: "application/vnd.microsoft.card.adaptive",
			contentUrl: null,
			content: adaptiveCardContent,
		};
	},
	dalle_msteamsResponse: function(numImages, imageSize, duration) {
		const adaptiveCardContent = {
			$schema: "http://adaptivecards.io/schemas/adaptive-card.json",
			type: "AdaptiveCard",
			version: "1.4",
			body: [{
				type: "TextBlock",
				text: `**Summary**: Using [OpenAI's DALL·E](https://openai.com/research/dall-e) we created:\n _${global.current_dalle_prompt}_`,
				wrap: true
			},
			{
				type: "FactSet",
				facts: [{
					title: "Number of images:",
					value: numImages.toString()
				},
				{
					title: "Size of images:",
					value: imageSize
				},
				{
					title: "Time to complete:",
					value: `${duration} seconds`
				}
				]
			}
			]
		};
		return {
			type: "attachment",
			contentType: "application/vnd.microsoft.card.adaptive",
			contentUrl: null,
			content: adaptiveCardContent
		};
	},
    dalle_SlackResponse: function(prompt, numImages, imageSize, duration) {
        let slackMessage = {
          "blocks": [{
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": `Your Image Request Summary:\nPrompt: ${prompt}\nNumber of Images: ${numImages}\nImage Size: ${imageSize}\nTime elapsed:  ${duration} seconds.`
            }
          }]
        };
      
        return slackMessage;
      },
};