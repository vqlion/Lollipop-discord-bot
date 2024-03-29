# Lollipop-discord-bot

Lollipop is my discord bot, built with discord.js.

## Features

- Music
  - Classic music commands (play, skip, queue...)
  - Displays the song currently playing and the next songs to come in a permanent message
   ![image](https://github.com/vqlion/Lollipop-discord-bot/assets/104720049/62e259fd-2e49-41de-8b29-9aa351ba24f4)
- Polling
  - Create a poll that displays the answers in a permanent message
  - Unique or multiple answers
  - Unlimited amount of possible answers
- Moderation
  - Create a lot of channels at once
  - Delete a lot of channels at once
  - Delete a lot of messages (purge)
  - Order channels alphabetically
  - Protect a server from a raid (blocks all access to any channel)
- Misc (only if the guild is marked as special guild in ```config.json```)
  - Deletes any voice message on the server (the feature we all wanted)
  - Responds "feur" to any message with "quoi"
  - You can also choose special guilds

## Usage

You need [node](https://nodejs.org) installed to run the bot.
Clone the repository:
```bash
git clone https://github.com/vqlion/Lollipop-discord-bot.git
```
Create a file name ```config.json``` based on the ```config.example.json```. Put your bot's [authentification token and application ID](https://discord.com/developers/docs/getting-started), and your [youtube API key](https://console.cloud.google.com/apis/). 

Then install the dependencies and run the bot:
```bash
npm install
node deploy-commands.js
node .
```

## Team

<a href="https://github.com/vqlion"><img src="https://avatars.githubusercontent.com/u/104720049?v=4" width="75"></a> 
