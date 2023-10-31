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
		text: "_v1.024.g35_",
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