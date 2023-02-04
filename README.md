# Lollipop-discord-bot
Lollipop is my utility discord bot.
When I need to automate something that's useful, I just add it :)

## Usage
First you have to create a discord bot: check [this page](https://discord.com/developers/docs/getting-started) or other internet sources if needed.

Then install the [discord.py library](https://discordpy.readthedocs.io/en/stable/intro.html) and the [pycord library](https://guide.pycord.dev/installation) using the following commands. You also need python installed, of course...

On linux, type these commands to install the libraries (check the docs for other OS):
```bash
python3 -m pip install -U discord.py
pip install py-cord
```

Once this is done, get your bot's token and create a .env file with ```TOKEN:your_token``` in it. Then you're good to go! 
```python3 lollipop.py``` to run the bot.