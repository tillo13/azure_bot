const formats = require('./endpoint_formats.js');


const {
	MessageFactory
} = require('botbuilder');
const generateImages = require('./dalle_utils');
const {
	addReaction,
	removeReaction
} = require('./slack_utils');
const https = require("https");

const commands = new Proxy({
	'$dig': useShovel,
	'$help': contactHelp,
	'$dalle': createDalleImages,
}, {
	get: function(target, property) {
		if (property in target) {
			return target[property];
		} else {
			for (let key in target) {
				if (property.startsWith(key)) {
					return target[key];
				}
			}
		}
	}
});

async function useShovel(context) {
	var randNum = Math.random() * 102;
	randNum = randNum.toFixed(3); // truncates to 3 decimal places.

	return sendMessageResponse(context, `Hmm... well look at that, you just unearthed _${randNum}_ Tera-bits...`); // concatenation of the random number with the string
}

async function contactHelp(context) {
	let message;

	try {
		switch (context.activity.channelId) {
			case 'webchat':
				message = formats.help_WebchatResponse();
				console.log('\n******SPECIAL_COMMANDS: help path Chose Webchat format');
				break;
			case 'slack':
				message = formats.help_SlackResponse();
				console.log('\n******SPECIAL_COMMANDS: help path Chose Slack format');
				break;
			case 'msteams':
				message = formats.help_msteamsResponse();
				console.log('\n******SPECIAL_COMMANDS:help path Chose MSTeams format');
				break;
			default:
				message = formats.help_DefaultResponse();
				console.log('\n******SPECIAL_COMMANDS: help path Chose default format');
		}
	} catch (error) {
		console.error('\n******SPECIAL_COMMANDS: help path Failed to format the message:', error);
		message = formats.help_DefaultResponse();
	}

	return sendMessageResponse(context, message);
}

async function sendMessageResponse(context, messageOrAttachment) {
	let replyActivity;

	if (typeof messageOrAttachment === 'string') {
		replyActivity = MessageFactory.text(messageOrAttachment);
	} else {
		// Assume it's an attachment (AdaptiveCard, image etc.)
		replyActivity = {
			type: 'message',
			attachments: [messageOrAttachment]
		};
	}

	try {
		replyActivity.conversation = context.activity.conversation;

		if (context.activity.channelId === 'slack') {
			const thread_ts = context.activity.channelData?.SlackMessage?.event?.thread_ts ||
				context.activity.channelData?.SlackMessage?.event?.ts;
			if (!replyActivity.conversation.id.includes(thread_ts)) {
				replyActivity.conversation.id += ':' + thread_ts;
			}
		}
	} catch (error) {
		console.error('\n******SPECIAL_COMMANDS: Error occurred while trying to reply in the thread:', error);
	}
	console.log('\n******SPECIAL_COMMANDS: Payload we will send on:\n', replyActivity);  
	return await context.sendActivity(replyActivity);
}
//set prompt globally
global.current_dalle_prompt = '';

async function createDalleImages(context) {
	const messageText = context.activity.text.replace('$dalle', '').trim();
	const startTime = new Date().getTime();
	const channelId = context.activity.channelId;
	const {
		prompt,
		numImages,
		imageSize,
		originalRequestedImages
	} = parseArguments(messageText, channelId);
	global.current_dalle_prompt = prompt;
	let thread_ts;

	// Check if requested number of images is more than 10
	if (originalRequestedImages > 10) {
		await sendMessageWithThread(context, `_I think you've asked for_ ${originalRequestedImages} _images. The maximum is 10, because 10 seems like a decent max, right? However, worry not we'll still create 10 rad images. Coming right up..._`, thread_ts);
	}

	const apiToken = context.activity.channelData?.ApiToken;
	const slackChannelId = context.activity.channelData?.SlackMessage?.event?.channel;

	//Define thread_ts only if platform is slack
	if (channelId === 'slack') {
		thread_ts = context.activity.channelData?.SlackMessage?.event?.thread_ts ||
			context.activity.channelData?.SlackMessage?.event?.ts;
		await addReaction(slackChannelId, thread_ts, 'hourglass_flowing_sand', apiToken);
	}

	if (!messageText) {
		await sendMessageWithThread(context, `You did not ask for any image in particular, so get the default of... \n\n_${prompt}_\n\n\nPlease wait a moment while we wire it up...`, thread_ts);
	} else {
		await sendMessageWithThread(context, defaultMessage(prompt, numImages, imageSize), thread_ts);
	}

	const filenameBase = getFileName(prompt);

	for (let i = 0; i < numImages; i++) {
		const filename = `${filenameBase}_${(i+1).toString().padStart(2, '0')}.png`;
		await sendMessageWithThread(context, `Hold please, creating something neat and calling it: ${filename}...`, thread_ts);
		await sendTypingIndicator(context);

		await generateImages(prompt, 1, imageSize, async (imageUrl) => {
			const replyActivity = getReplyActivity(context, thread_ts, imageUrl);
			await context.sendActivity(replyActivity);
		});
	}

  // Reaction code after image generation and before endTime
  if(channelId === 'slack') {
    const slackChannelId = context.activity.channelData?.SlackMessage?.event?.channel;
    await removeReaction(slackChannelId, thread_ts, 'hourglass_flowing_sand', apiToken);
    await addReaction(slackChannelId, thread_ts, 'white_check_mark', apiToken);
  }

  // Existing code after images generation
  const endTime = new Date().getTime();
  const seconds = getElapsedTime(startTime, endTime);
  await sendSummary(context, prompt, numImages, imageSize, seconds, thread_ts);
}

function parseArguments(messageText, channelId) {
    const defaultSettings = {
        prompt: "A painting reminiscent of Rembrandt, with various sprockets and springs in motion while steampunk-styled humans work alongside robots actively engaged operating Teradata's secure and trustworthy A.I. hub!",
        numImages: 3,
        imageSize: channelId === 'slack' ? '512x512' : '1024x1024'
    }

    // Regex to find --num followed by a number
    const numRegEx = /--num [0-9]+/g;
    const numMatch = messageText.match(numRegEx);
    
    let numImages;
    if (numMatch) {
        numImages = parseInt(numMatch[0].split(' ')[1], 10);
        numImages = numImages > 10 ? 10 : numImages; // Set to 10 if requested number is more than 10
    } else {
	    numImages = defaultSettings.numImages;
    }

    // Remove the instances of --num from messageText
    messageText = messageText.replace(numRegEx, '').trim();

    let imageSize;
    const sizeRegEx = /--size (large|medium|small)/g;
    const sizeMatch = messageText.match(sizeRegEx);

    if (sizeMatch) {
        switch (sizeMatch[0].split(' ')[1]) {
            case 'large':
                imageSize = '1024x1024';
                break;
            case 'medium':
                imageSize = '512x512';
                break;
            case 'small':
                imageSize = '256x256';
                break;
        }
        messageText = messageText.replace(sizeRegEx, '').trim();
	} else {
		imageSize = defaultSettings.imageSize;
	}

    let settings = {
        prompt: messageText || defaultSettings.prompt,
        numImages: numImages,
        imageSize: imageSize
    }

    if (channelId === 'slack') {
        settings.imageSize = '512x512';
    }

    return settings;
}

function defaultMessage(prompt, numImages, imageSize) {
	return `Summary: We are going to use Dall-E to create: ${prompt}||Number of images: ${numImages}||Size of images: ${imageSize}||Please hold while we align 1s and 0s...`;
}

function getFileName(prompt) {
    // If prompt is not defined, return a default filename
    if (!prompt) {
        return 'default_filename';
    }
    
    // Replace all non-alphanumeric characters with underscore
    let filenameBase = prompt.replace(/[^a-z0-9_]/gi, '_').replace(/\s+/g, '').replace(/_+/g, "_").substring(0, 25);
    
    // Ensure the filename does not only consist of underscores
    return filenameBase !== '_' ? filenameBase.trim('_') : filenameBase;
}

function sendTypingIndicator(context) {
	return context.sendActivity({
		type: 'typing'
	});
}
async function sendMessageWithThread(context, message, thread_ts) {
	const newActivity = MessageFactory.text(message);
	newActivity.conversation = context.activity.conversation;

	if (context.activity.channelId === 'slack' && thread_ts && !newActivity.conversation.id.includes(thread_ts)) {
		newActivity.conversation.id += ':' + thread_ts;
	}

	await context.sendActivity(newActivity);
}

function getReplyActivity(context, thread_ts, imageUrl) {
	const replyActivity = MessageFactory.attachment({
		contentType: 'image/png',
		contentUrl: imageUrl,
	});

	if (context.activity.channelId === 'slack') {
		replyActivity.conversation = replyActivity.conversation || context.activity.conversation;
		if (thread_ts && !replyActivity.conversation.id.includes(thread_ts)) {
			replyActivity.conversation.id += ':' + thread_ts;
		}
	}

	return replyActivity;
}

async function reactToMessage(context, thread_ts, emoji) {
	const channelId = context.activity.channelData?.SlackMessage?.event?.channel;
	const apiToken = context.activity.channelData?.ApiToken;

	return emoji === 'hourglass_flowing_sand' ?
		addReaction(channelId, thread_ts, emoji, apiToken) :
		removeReaction(channelId, thread_ts, emoji, apiToken);
}

// async function postProcess(context, thread_ts, channelId, apiToken) {
// 	if (context.activity.channelId === 'slack') {
// 		await removeReaction(channelId, thread_ts, 'hourglass_flowing_sand', apiToken);
// 		await addReaction(channelId, thread_ts, 'white_check_mark', apiToken);
// 	}
// }
async function sendSummary(context, prompt, numImages, imageSize, seconds, thread_ts) {
	if (context.activity.channelId === 'webchat') {
		// send to endpoint_formats.js
		let message = formats.dalle_WebchatResponse(numImages, imageSize, seconds);
		await sendMessageResponse(context, message);
	} else if (context.activity.channelId === 'slack') {
		let slackMessage = formats.dalle_SlackResponse(prompt, numImages, imageSize, seconds);
		slackMessage.thread_ts = thread_ts; // Add thread_ts to the slackMessage
		let replyActivity = {
			type: 'message',
			text: '',
			channelData: slackMessage
		};
		try {
			await context.sendActivity(replyActivity);
			console.log('\n******SPECIAL_COMMANDS: Slack summary message sent successfully');
		} catch (error) {
			console.error('\n******SPECIAL_COMMANDS: Failed to send Slack summary message:', error);
		}
	} else if (context.activity.channelId === 'msteams') {
		try {
			let message = formats.dalle_msteamsResponse(numImages, imageSize, seconds);
			await sendMessageResponse(context, message);
		} catch (error) {
			console.error('\n******SPECIAL_COMMANDS: msteams path Failed to format the message:', error);
			message = formats.help_DefaultResponse();
		}
	} else {
		// This is the default case when none of the above matches
		let message = formats.dalle_DefaultResponse(numImages, imageSize, seconds);
		await sendMessageResponse(context, message);

	}
}

function getElapsedTime(startTime, endTime) {
	const difference = endTime - startTime;
	return (difference / 1000).toFixed(3);
}


module.exports = commands;