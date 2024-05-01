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

The bot is able to track League of Legends games from a 'tournament'. We use that because we do a lot of 5v5 games on our server. The games have to be tournament games.

- Tournament
  - Add a match to the database
  - Delete a match from the database
  - Display the leaderboard
  - Display the stats of a player
  - Display the stats of a champion
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
Create a file name ```config.json``` based on the ```config.example.json```. Put your bot's [authentification token and application ID](https://discord.com/developers/docs/getting-started), your [youtube API key](https://console.cloud.google.com/apis/) and your [riot games API key](https://developer.riotgames.com/) (youtube API key is optional, just to fetch the song's title when a URL is passed).

Then install the dependencies and run the bot:
```bash
npm install
npm start
```

## Team

<a href="https://github.com/vqlion"><img src="https://avatars.githubusercontent.com/u/104720049?v=4" width="75"></a>
<a href="https://github.com/Yayadelaplaya/"><img src="https://avatars.githubusercontent.com/u/81352733?v=4" width="75"></a> 
<a href="https://github.com/LordOfGnou/"><img src="https://avatars.githubusercontent.com/u/83947403?v=4" width="75"></a> 
<a href="https://github.com/fkyro/"><img src="https://avatars.githubusercontent.com/u/94193573?v=4" width="75"></a> 
