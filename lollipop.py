import discord
from discord import option
from discord.ext import commands
from discord.ext.commands import has_permissions
import os
from dotenv import load_dotenv

load_dotenv()
TOKEN = os.getenv('TOKEN')
bot = commands.Bot()

@bot.event
async def on_ready():
    print(f'Logged in as {bot.user} :D') #Bot Name

bot.load_extension("cogs.channels")
bot.load_extension("cogs.utils")

bot.run(TOKEN)