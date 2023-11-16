//2023nov16 add tree nation defaults
const plantMessage = {
	title: "Tree-Nation Planting Confirmation",
	successNote: "Thank you for taking a step towards a greener future!",
	errorNote: "Uh oh, something went wrong while planting your tree. We apologize for any inconvenience.",
  };
  
  function formatTreeDetails(treeDetails) {
	return treeDetails.map(tree => {
	  return `Tree ID: ${tree.id}\n` +
			 `Token: ${tree.token}\n` +
			 `Collect URL: ${tree.collect_url}\n` +
			 `Certificate URL: ${tree.certificate_url}`;
	}).join('\n\n');
  }

//2023oct31 add defaults for configs
const global_configs = require('../utilities/global_configs.js');


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
		"$train is a way to teach this bot to be smarter! (v1)",
		"If things just are not working for you, try `$idea [type description here]' to create a ticket in ESS ticket queue for any assistance."
	]
};

const footer_msteams = [
	{ // Simulate an <HR> for a footer
		type: "TextBlock",
		text: "_____",
		horizontalAlignment: "right",
		separator: true
	},
	{
		type: "TextBlock",
		text: "_v1.031.g35_",
		wrap: true,
		size: "small",
		horizontalAlignment: "right",
		isSubtle: true
	}
];

const high5Message ={
	title: "You just high5'd someone!",
	note:  "way to be nice!"
};

const trainMessage = {
    title: "RLHF training path... (in dev)",
    note: "Here is a question and answer set from our 10,000 QA we set up for ask-ai. Please rate it 1-5 where 1 is 'not close at all' and 5 is 'exactly correct'. Also, feel free to type 'skip' if you do not know the answer. There are no wrong answers."
};

function formatQA(questionAnswer) {
    return `**Question**: ${questionAnswer.question} || \n **Answer**: ${questionAnswer.answer}`;
}

module.exports = {

	plant_msteamsResponse: function(treeDetails, isError, environment) {
		let contentBody = [
			{
				type: "TextBlock",
				size: "Medium",
				weight: "Bolder",
				text: plantMessage.title,
				wrap: true
			},
			{
				type: "TextBlock",
				text: "A tree has been planted successfully via Tree-Nation! Here are the details:",
				wrap: true
			},
			{
				type: "TextBlock",
				text: "---", // Placeholder text for horizontal line (separator)
				horizontalAlignment: "Center",
				spacing: "Padding",
				separator: true
			},
		];
	
		// Adding Environment block
		contentBody.push({
			type: "TextBlock",
			text: `**Environment**: _${environment}_`, // Bold for label, Italic for value
			wrap: true
		});
	
		// Create new TextBlock for each tree detail with URLs displayed
		treeDetails.forEach(tree => {
			contentBody.push({
				type: "TextBlock",
				text: `**Tree ID**: _${tree.id}_`, // Bold for label, Italic for value
				wrap: true
			});
			contentBody.push({
				type: "TextBlock",
				text: `**Token**: _${tree.token}_`, // Bold for label, Italic for value
				wrap: true
			});
			contentBody.push({
				type: "TextBlock",
				text: `**Tree-Nation values**: [Collect URL](${tree.collect_url}) | [Certificate PDF](${tree.certificate_url})`, // The links are clickable
				wrap: true
			});
			// Add a separator for visual distinction between tree details (except for the last tree)
			if (tree !== treeDetails[treeDetails.length - 1]) {
				contentBody.push({
					type: "TextBlock",
					text: "---", // Placeholder text for horizontal line (separator)
					horizontalAlignment: "Center",
					spacing: "Padding",
					separator: true
				});
			}
		});
	
		if (isError) {
			contentBody.push({
				type: "TextBlock",
				text: plantMessage.errorNote,
				wrap: true,
				weight: "Lighter",
				color: "Attention"
			});
		}
	
		const adaptiveCardContent = {
			$schema: "http://adaptivecards.io/schemas/adaptive-card.json",
			type: "AdaptiveCard",
			version: "1.4",
			body: contentBody
		};
	
		return {
			type: "attachment",
			contentType: "application/vnd.microsoft.card.adaptive",
			contentUrl: null,
			content: adaptiveCardContent
		};
	},
	
	plant_SlackResponse: function(treeDetails, isError, environment, context) {
		let detailsText = formatTreeDetails(treeDetails);
		let text = isError ? plantMessage.errorNote :
			`A tree has been planted successfully via Tree-Nation! Here are the details:\n\nEnvironment: ${environment}\n${detailsText}`;
	
		let response = {
			text: text,
			mrkdwn: true
		};
	
		// Handle thread_ts for Slack threading
		const thread_ts = context.activity.channelData?.SlackMessage?.event?.thread_ts ||
						  context.activity.channelData?.SlackMessage?.event?.ts;
		if (thread_ts) {
			response.thread_ts = thread_ts;  // Append thread_ts to the response object for threading
		}
	
		return response;
	},
	
	plant_WebchatResponse: function(treeDetails, isError, environment) {
	  let detailsText = formatTreeDetails(treeDetails);
	  let text = isError ? plantMessage.errorNote :
		`A tree has been planted successfully via Tree-Nation! Here are the details:\n\nEnvironment: ${environment}\n${detailsText}`;
	  
	  return text;
	},
	
	plant_DefaultResponse: function(treeDetails, isError, environment) {
	  let detailsText = formatTreeDetails(treeDetails);
	  let text = isError ? plantMessage.errorNote :
		`A tree has been planted successfully via Tree-Nation! Here are the details:\n\nEnvironment: ${environment}\n${detailsText}`;
	  
	  return text;
	},

  // train path START
  train_DefaultResponse: function(questionAndAnswer) {
	return `*${trainMessage.title}* \n${trainMessage.note}\n\n${formatQA(questionAndAnswer)}`;
},

train_msteamsResponse: function(questionAndAnswer) {
    const adaptiveCardContent = {
        type: "AdaptiveCard",
        body: [
            {
                type: "TextBlock",
                size: "Large",
                weight: "Bolder",
                text: "Training via MSteams...",
                wrap: true,
            },
            {
                type: "TextBlock",
                text: `*${trainMessage.title}*`,
                wrap: true
            },
            {
                type: "TextBlock",
                text: trainMessage.note,
                wrap: true
            },
            {
                type: "TextBlock",
                text: formatQA(questionAndAnswer),
                wrap: true,
            },
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

// Add more platform specific responses...
// train path END
	

	//////high5 path START//////
high5_DefaultResponse: function() {
	return `*${high5Message.title}* \n${high5Message.note}`;
},

high5_WebchatResponse: function(context, restOfMessage, recognizedUser) {
    const adaptiveCardContent = {
        type: "AdaptiveCard",
        body: [
            {
                type: "TextBlock",
                size: "Large",
                weight: "Bolder",
                text: "High5 results...",
                wrap: true,
            },
            {
                type: "TextBlock",
                text: `*${high5Message.title}*`,
                wrap: true,
            },
            {
                type: "TextBlock",
                text: high5Message.note,
                wrap: true,
            },
            {
                type: "TextBlock",
                text: `Your ingress was: ${context.activity.channelId}`,
                wrap: true,
            },
            {
                type: "TextBlock",
                text: `Your messageID was: ${context.activity.id}`,
                wrap: true,
            },
            {
                type: "TextBlock",
                text: `Your recipientID was: ${context.activity.recipient.id}`,
                wrap: true,
            },
			{
				type: "TextBlock",
				text: `You said: ${restOfMessage}`, // Include the rest of the user's message
				wrap: true,
			},
			{
				type: "TextBlock",
				text: `The user you recognized was: ${recognizedUser ? `@${recognizedUser}` : 'none'}`,
				wrap: true,
			},
            {
                type: "TextBlock",
                text: "Thank you!",
                wrap: true,
            },
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

high5_SlackResponse: function() {
	return `:robot_face: _${high5Message.title}_\n\n${high5Message.note}\n\n`;
},

high5_SlackParsedResponse: function(userMessage, recognizedUser) {
	return `:robot_face: _${high5Message.title}_\n\nUser said: ${userMessage}\n\nRecognized User: ${recognizedUser}\n\n${high5Message.note}\n\n`;
},


high5_msteamsResponse: function(userMessage, recognizedUser) {
    const adaptiveCardContent = {
        type: "AdaptiveCard",
        body: [
            {
                type: "TextBlock",
                size: "Large",
                weight: "Bolder",
                text: "High5 results...",
                wrap: true,
            },
            {
                type: "TextBlock",
                text: `*${high5Message.title}*`,
                wrap: true
            },
            {
                type: "TextBlock",
                text: high5Message.note,
                wrap: true
            },
            {
				type: "TextBlock",
		        text: `You said: ${userMessage}`, // Include the rest of the user's message
		        wrap: true,
            },
            {
                type: "TextBlock",
                text: `The user you recognized was: ${recognizedUser ? `@${recognizedUser}` : 'none'}`,
                wrap: true,
            },
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
/////high5 path END//////

				/////help path START//////
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
			$schema: "http://adaptivecards.io/schemas/adaptive-card.json",
			type: "AdaptiveCard",
			version: "1.4",
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
					text: `**1.**  Ask basic questions, no keywords necessary!  Try something like 'How do I do a table join in Teradata Database? to get started perhaps...'`,
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
					text: `**7.**  Want to help get this bot smarter?  Please try **$train**!`,
					wrap: true
				},
				{
					type: "TextBlock",
					text: `**8.**  Type **$idea** [description here] to create a ticket in ESS ticket queue for any assistance.`,
					wrap: true
				},
				{
					type: "ColumnSet",
					columns: [
						{
							type: "Column",
							width: "stretch",
							items: footer_msteams
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
	//////////help path END///////
//////////dalle path START///////

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

//////////dalle path END///////
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
		let channelConfig = global_configs.INGRESS_CONFIGS['slack'];
		let slackMessage = {
		  "blocks": [
			{
			  "type": "section",
			  "text": {
				"type": "mrkdwn",
				"text": `${channelConfig.messagePrefix} *Your Image Request Summary:*\nPrompt: \`${prompt}\`\nNumber of Images: \`${numImages}\`\nImage Size: \`${imageSize}\`\nTime elapsed: \`${duration} seconds.\`` 
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
			},
			...channelConfig.footer
		  ]
		};
		  
		return slackMessage;
	  },

	  
};