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

#Command to create text channels for x groups and y subgroups in a new category
@bot.slash_command(name='create_channels', description="Creates y channels, x times. Names them iteratively.")
@option("x", description="Number of groups")
@option("y", description="Number of subgroups")
@option("category_name", description="Name of the new category", default="Groups")
@option("channel_syntax", description="Channel's name's syntax", default="g")
@has_permissions(administrator=True)
async def create_channels(ctx, x:int, y:int, category_name, channel_syntax):
    await ctx.respond(f'Got it! Creating {y} channels, {x} times')
    guild = ctx.guild
    category = await ctx.guild.create_category(category_name)

    for i in range(1, int(x) + 1):
        for j in range(1, int(y) + 1):
            await guild.create_text_channel(f"{channel_syntax}{i}-{j}", category=category)

@create_channels.error
async def create_channels_error(ctx, err):
    await ctx.respond(f'{err}')

#Command to delete all the channels in the current category (the one the command is typed in)
@bot.slash_command(name='delete_channels', description='WARNING! Deletes all text channels in the current category!')
@has_permissions(administrator=True)
async def delete_channels(ctx):
    channel = ctx.channel
    category = channel.category
    for channel in category.text_channels:
        await channel.delete()
    await category.delete()

@delete_channels.error
async def delete_channels_error(ctx, err):
    await ctx.respond(f'{err}')

@bot.slash_command(name='purge', description='Deletes the x last messages (max 100)')
@option('x', description='Number of messages to delete')
@has_permissions(administrator=True)
async def purge(ctx, x:int):
    channel = ctx.channel
    await ctx.respond(f'Got it! Deleting the {x} last messages in this channel')
    async for message in channel.history(limit=min(x + 1, 100)):
        await message.delete()

@purge.error
async def purge_error(ctx, err):
    await ctx.respond(f'{err}')

async def connect_nodes():
  """Connect to our Lavalink nodes."""
  await bot.wait_until_ready()

  await wavelink.NodePool.create_node(
    bot=bot,
    host='127.0.0.1',
    port=2333,
    password='youshallnotpass'
  )

@bot.slash_command(name="play")
async def play(ctx, search: str):
  vc = ctx.voice_client 

  if not vc: # check if the bot is not in a voice channel
    vc = await ctx.author.voice.channel.connect(cls=wavelink.Player) 

  if ctx.author.voice.channel.id != vc.channel.id: # check if the bot is not in the voice channel
    return await ctx.respond("You must be in the same voice channel as the bot.") 

  song = await wavelink.YouTubeTrack.search(query=search, return_first=True) 

  if not song: # check if the song is not found
    return await ctx.respond("No song found.") 

  await vc.play(song) # play the song
  await ctx.respond(f"Now playing: `{vc.source.title}`") 

bot.run(TOKEN)