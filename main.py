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

bot.run(TOKEN)