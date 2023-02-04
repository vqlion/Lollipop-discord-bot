import discord
import wavelink
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
    await connect_nodes()

@bot.event
async def on_wavelink_node_ready(node: wavelink.Node):
  print(f"{node.identifier} is ready.")

async def connect_nodes():
  """Connect to our Lavalink nodes."""
  await bot.wait_until_ready()

  await wavelink.NodePool.create_node(
    bot=bot,
    host='127.0.0.1',
    port=2333,
    password='youshallnotpass'
  )

bot.load_extension("cogs.music")

bot.run(TOKEN)