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
		"Type `$dig` for some fun intrigue...",
		"Use `$reset` command to erase all interaction memory.",
		"Type `$about` to know more about this application.",
		"How about just recognizing an outstanding colleague with `$high5 [insert email/phone/@ here]' to give some fun kudos!",
		"If things just are not working for you, try `$jira [type description here]' to create a ticket in ESS ticket queue for any assistance."
	]
};

module.exports = {
	help_DefaultResponse: function() {
		return [
			`*${helpMessage.title}*`,
			helpMessage.note,
			`*${helpMessage.instructions}*`,
			...helpMessage.list.map((item, index) => {
					if(typeof item === 'object') {
					   let nestedList = item.subList.map((subItem, subIndex) => `\t ${subIndex+1}. ${subItem}`).join('\n');
					   return `${index + 1}. ${item.text}\n${nestedList}`;
					} 
					return `${index + 1}. ${item}`
				})
		].join('\n');
	},

	help_WebchatResponse: function() {
		const adaptiveCardContent = {
			type: "AdaptiveCard",
			body: [{
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
				...helpMessage.list.map((item) => {
					if(typeof item === 'object') {
					   let nestedList = item.subList.map((subItem, subIndex) => {
							return {
								type: "TextBlock",
								text: `\t ${subIndex+1}. ${subItem}`,
								wrap: true
							}
					   });
					   return [{
							type: "TextBlock",
							text: `${item.text}`,
							wrap: true
						}, ...nestedList];
					} 
					return {
						type: "TextBlock",
						text: `\u2022 ${item}`,
						wrap: true
					};
				}).flat()
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
			...helpMessage.list.map((item, index) => {
				if (typeof item === 'object') {
						let nestedList = item.subList.map((subItem, subIndex) => `     - ${subItem}`).join('\n');
						return `_${index + 1}. ${item.text}_\n${nestedList}`;
				} 
				return `_${index + 1}. ${item}_`;
			})
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
					text: `**3.** Type **$dig** for a fun game...`,
					wrap: true
				},
				{
					type: "TextBlock",
					text: `**4.**  Type **$reset** to start over.`,
					wrap: true
				},
				{
					type: "TextBlock",
					text: `**5.**  Try **$about** for more info.`,
					wrap: true
				},
				{
					type: "TextBlock",
					text: `**6.**  Try **$high5** to go recognize someone for being great!`,
					wrap: true
				},
				{
					type: "TextBlock",
					text: `**7.**  Type **$jira** [description here] to create a ticket in ESS ticket queue for any assistance. to start over.`,
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





//////////dalle formatting///////
//////precursory message format/////////
dalle_precursor_DefaultResponse: function(prompt, numImages, imageSize) {
	return `Summary: We are going to use Dall-E to create: ${prompt}\nNumber of images: ${numImages}\nSize of images: ${imageSize}\n\nPlease hold while we align 1s and 0s...`;
},

dalle_precursor_WebchatResponse: function(prompt, numImages, imageSize) {
const adaptiveCardContent = {
		$schema: "http://adaptivecards.io/schemas/adaptive-card.json",
  type: "AdaptiveCard",
		version: "1.3",
  body: [
	{
	  type: "TextBlock",
				text: `**Summary:** We are going to use DALL·E to create:\n_${prompt}_`,
				wrap: true,
	},
	{
				type: "FactSet",
				facts: [
					{
						title: "Number of images:",
						value: numImages
					},
					{
						title: "Size of images:",
						value: imageSize
					}
				]
			},
	{
				type: "TextBlock",
				text: "`Please hold while we align 1s and 0s...`",
				wrap: true
			}
  ],
};

	return {
		type: "attachment",
		contentType: "application/vnd.microsoft.card.adaptive",
		contentUrl: null,
		content: adaptiveCardContent,
	};
},

dalle_precursor_SlackResponse: function(prompt, numImages, imageSize) {
	return [
		`:art: *Summary:* We are going to use DALL·E to create: \`${prompt}\``,
		`*Number of Images:* ${numImages}`,
		`*Size of Images:* ${imageSize}`,
		`*Please hold while we align 1s and 0s...*`
	].join('\n');
},

dalle_precursor_msteamsResponse: function(prompt, numImages, imageSize) {
	const adaptiveCardContent = {
		$schema: "http://adaptivecards.io/schemas/adaptive-card.json",
		type: "AdaptiveCard",
		version: "1.4",
		body: [
		{
			type: "TextBlock",
			text: `**Summary:** We are going to use DALL·E to create: _${prompt}_`,
			wrap: true,
		},
		{
			type: "FactSet",
			facts: [
				{
					title: "Number of Images:",
					value: numImages
				},
				{
					title: "Size of Images:",
					value: imageSize
				}
			]
		},
		{
			type: "TextBlock",
			text: "_Please hold while we align 1s and 0s..._",
			wrap: true
		}
		],
	};

	return {
		type: "attachment",
		contentType: "application/vnd.microsoft.card.adaptive",
		contentUrl: null,
		content: adaptiveCardContent
	};
},


//////post processing dalle message format/////

	dalle_DefaultResponse: function(numImages, imageSize, duration) {
		return `Summary: We used DallE to create...\nNumber of images: ${numImages}\nSize of images: ${imageSize}\nTime to complete: ${duration} seconds.\n\nTo request a standard 3 image large size set, just type \`$dalle a dog drawn like a renaissance painter\`.\nYou can also use calls like \`--num [image number here]\` and \`--size [large/medium/small]\` in your command.\nSo for example, \`$dalle a dog drawn like a renaissance painter --num 7 --size small\` would generate 7 images in small size for the same prompt.\nThank you.`;
	},

	dalle_WebchatResponse: function(numImages, imageSize, duration) {
		const adaptiveCardContent = {
			$schema: "http://adaptivecards.io/schemas/adaptive-card.json",
			type: "AdaptiveCard",
			version: "1.3",
			body: [
			{
				type: "TextBlock",
				text: `**Summary**: Using [OpenAI's DALL·E](https://openai.com/research/dall-e) we created:\n _${global.current_dalle_prompt}_`,
				wrap: true
			},
			{
				type: "FactSet",
				facts: [
					{
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
			},
			{
				type: "TextBlock",
				text: "**Specializing your DallE calls:**",
				wrap: true,
				weight: "bolder"
			},
			{
				type: "TextBlock",
				text: "To request a standard 3 image large size set, just type `$dalle a dog drawn like a renaissance painter`.\nYou can also use calls like `--num [image number here]` and `--size [large/medium/small]` in your command.\nFor example, `$dalle a dog drawn like a renaissance painter --num 7 --size small` would generate 7 small images for the same.",
				wrap: true
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
		// Card content specifications
		const adaptiveCardContent = {
			$schema: "http://adaptivecards.io/schemas/adaptive-card.json",
			type: "AdaptiveCard",
			version: "1.4",
			body: []
		};
		// Text block for summary
		let summaryBlock = {
			type: "TextBlock",
			text: `**Summary:** Using [OpenAI's DALL·E](https://openai.com/research/dall-e) we created:\n _${global.current_dalle_prompt}_`,
			wrap: true
		};
		adaptiveCardContent.body.push(summaryBlock);
	
		// Fact set for data
		let factSet = {
			type: "FactSet",
			facts: [
				{
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
				}]
		};
		adaptiveCardContent.body.push(factSet);
	
		// Text block for instructions
		let instructionBlock = {
			type: "TextBlock",
			text: "_Specializing your DallE calls:_ ",
			wrap: true,
			size: "medium",
			weight: "bolder"
		};
		adaptiveCardContent.body.push(instructionBlock);
	
		// Text block for command example
		let commandExampleBlock = {
			type: "TextBlock",
			text: "To request a standard 3 image large size set, just type `$dalle a dog drawn like a renaissance painter`.\nYou can also use commands like `--num [image number here]` and `--size [large/medium/small]`.\nSo, for example, `$dalle a dog drawn like a renaissance painter --num 7 --size small` would generate 7 images in small size for the same.",
			wrap: true,
			size: "default",
			weight: "lighter"
		};
		adaptiveCardContent.body.push(commandExampleBlock);
	
		return {
			type: "attachment",
			contentType: "application/vnd.microsoft.card.adaptive",
			contentUrl: null,
			content: adaptiveCardContent
		};
	},

	dalle_SlackResponse: function(prompt, numImages, imageSize, duration) {
		let slackMessage = {
		  "blocks": [
			{
				"type": "section",
				"text": {
					"type": "mrkdwn",
					"text": `*Your Image Request Summary:*\nPrompt: \`${prompt}\`\nNumber of Images: \`${numImages}\`\nImage Size: \`${imageSize}\`\nTime elapsed: \`${duration} seconds.\``
				}
			},
			{
				"type": "divider",
			},
			{
				"type": "section",
				"text": {
					"type": "mrkdwn",
					"text": `To request a standard 3 image large size set, just type \`\$dalle a dog drawn like a renaissance painter\`.\n\nYou can also use amplifiers like \`--num [image number here]\` and \`--size [large/medium/small]\` in your command.\n\nSo for example, \`\$dalle a dog drawn like a renaissance painter --num 7 --size small\` would generate 7 images in small size for the same.`
				}
			}
		]
		};
		  
		return slackMessage;
	},
};