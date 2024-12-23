# Lollipop-discord-bot

Lollipop is a discord bot that plays music and tracks League Of Legends games results. Built with [discord.js](https://discord.js.org/), [sequelize](https://sequelize.org/) and mysql.

## Features

- Music
  - Classic music commands (play, skip, queue...) 
  - Play from Youtube (video or playlist, search or link), Deezer (playlist link) or Spotify (playlist link) 
  - Displays the song currently playing and the next songs to come in a permanent message
   ![image](https://github.com/vqlion/Lollipop-discord-bot/assets/104720049/62e259fd-2e49-41de-8b29-9aa351ba24f4)
- Polling
  - Create a poll that displays the answers in a permanent message
 
    ![image](https://github.com/user-attachments/assets/6713c622-501e-473b-9617-0cd961a57fd9)
  - Unique or multiple answers
  - Unlimited amount of possible answers
- Moderation
  - Create a lot of channels at once
  - Delete a lot of channels at once
  - Delete a lot of messages (purge)
  - Order channels alphabetically
  - Protect a server from a raid (blocks all access to any channel)

The bot is able to track League of Legends games from a 'tournament'. We use that to track 5v5 games results on our Discord sever. The games have to be tournament games.

- Tournament
  - Add a match to the database
  - Delete a match from the database
  - Display the leaderboard
    
    ![image](https://github.com/user-attachments/assets/d1fe3991-6dd6-47c5-afb6-fb8d8cf75e05)
  - Display the stats of a player
 
    ![image](https://github.com/user-attachments/assets/a9b5c20e-98a6-4e64-8629-e613970d6b83)
  - Display the stats of a champion
 
    ![image](https://github.com/user-attachments/assets/d323664b-e10b-4791-bf80-75a9822442ad)
  - Display an "awards" leaderboard with fun stats (most kills per game, best overall KDA, biggest champion pool,...)
- Misc (only applies to guilds marked as special guild in ```config.json```)
  - Deletes any voice message on the server (the feature we all wanted)
  - Responds "feur" to any message with "quoi" (a critically acclaimed feature)
 
    ![image](https://github.com/user-attachments/assets/4b2f7e32-a839-4326-a853-eac01ebe15df)


## Usage

### Prerequisites

You need [node](https://nodejs.org) installed to run the bot.
Clone the repository:
```bash
git clone https://github.com/vqlion/Lollipop-discord-bot.git
```
Create a file name ```config.json``` based on the ```config.example.json```. You'll need:

 - your bot's [authentification token and application ID](https://discord.com/developers/docs/getting-started)
 - a [youtube API key](https://console.cloud.google.com/apis/) (optional)
 - a [spotify API key](https://developer.spotify.com/documentation/web-api)
 - a [riot games API key](https://developer.riotgames.com/) (for tournament features)

### Running the bot

It is recommended to run the bot with docker compose. It handles the database and dependencies for you. Be aware you'll need a `.env` file with the fields for mysql.
```bash
docker compose up
```

Alternatively, you can run the bot without docker from node. You'll need to set up your own database.

```bash
npm install
npm start
```

## Contributors

<a href="https://github.com/vqlion"><img src="https://avatars.githubusercontent.com/u/104720049?v=4" width="75"></a>
<a href="https://github.com/Yayadelaplaya/"><img src="https://avatars.githubusercontent.com/u/81352733?v=4" width="75"></a> 

Contributions are welcome! Head on to the [issues tab](https://github.com/vqlion/Lollipop-discord-bot/issues) to report bugs or request new features.
