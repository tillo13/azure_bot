module.exports = {
    'slack': {
      "blocks": [
        {
          "type": "header",
          "text": {
            "type": "plain_text",
            "text": "Dall-E Summary"
          }
        },
        {
          "type": "section",
          "fields": [
            {
              "type": "plain_text",
              "text": "Prompt"
            },
            {
              "type": "plain_text",
              "text": "${prompt}"
            },
            {
              "type": "plain_text",
              "text": "Number of images"
            },
            {
              "type": "plain_text",
              "text": "${numImages}"
            },
            {
              "type": "plain_text",
              "text": "Size of images"
            },
            {
              "type": "plain_text",
              "text": "${size}"
            }
          ]
        },
        {
          "type": "context",
          "elements": [
            {
              "type": "plain_text",
              "text": "Please hold while we create..."
            }
          ]
        }
      ]
    },
    'msteams': {
      "@type": "MessageCard",
      "@context": "http://schema.org/extensions",
      "summary": "Dall-E Summary",
      "sections": [
        {
          "facts": [
            {
              "name": "Prompt",
              "value": "${prompt}"
            },
            {
              "name": "Number of images",
              "value": "${numImages}"
            },
            {
              "name": "Size of images",
              "value": "${size}"
            }
          ],
          "text": "Please hold while we create..."
        }
      ]
    },
    'webchat': {
      "type": "AdaptiveCard",
      "version": "1.2",
      "body": [
        {
            "type": "Image",
            "url": "${generatedImageUrl}",
            "size": "Stretch"
        },
        { 
            "type": "TextBlock",
            "text": `Prompt: ${prompt}\nNumber of images: ${numImages}\nSize of images: ${size}\nPlease wait while we generate your images...`,
            "wrap": true 
        }
      ]
    },
    'default': {
      "text": "Summary: We used DallE to create...\nPrompt: ${prompt}\nNumber of images: ${numImages}\nSize of images: ${size}\nPlease hold while we create..."
    }
  }