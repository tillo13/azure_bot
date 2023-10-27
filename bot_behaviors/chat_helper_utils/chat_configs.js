function validateOpenAITokens(tokens) {
    let isValid = tokens > 0 && tokens <= 4096;
    
    // log the token count and if they are valid
    console.log(`Token count: ${tokens}, is valid: ${isValid}`);

    if (!isValid) {
      console.error('Invalid setting for MAX_OPENAI_TOKENS. It should be between 1 and 4096.');
      return;
    }

    return tokens;
}

module.exports = {
  validateOpenAITokens,
  // other functions can go here in the future...
};