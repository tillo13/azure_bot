//2023oct31 add defaults for configs
const global_configs = require('../utilities/global_configs.js');



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