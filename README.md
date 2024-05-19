# Use chatGPT for code review your pull requests

## How to use

1. create .env file from .env.template with the following content:
```
GITHUB_OWNER= # owner of the repository 
GITHUB_REPO= # your github repo name you want to review
GITHUB_USERNAME= # your github username
GITHUB_TOKEN= # your github token
OPENAI_API_KEY= # your openai api key
ASSISTANT_ID= # chatGPT assistant id
```

2. Run the following command to install the dependencies
```
npm install
npm run start
```

## How it works
 - The bot will search for the open pull request assigned to you.
 - The bot will fetch the pull request diff and send it to the chatGPT API.
 - The bot will send the code review comments to the pull request.