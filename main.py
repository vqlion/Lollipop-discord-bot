import discord
from discord.ext import commands
from discord.ext.commands import has_permissions
import os
from dotenv import load_dotenv

load_dotenv()
TOKEN = os.getenv('TOKEN')
bot = commands.Bot(intents=discord.Intents.all(), command_prefix='$')

#Command to create text channels for x groups and y subgroups in a new category
@bot.command(name='createChannels', help="Syntax : \"createChannels x y category_name channel_syntax\". Creates y channels x times.")
@has_permissions(administrator=True)
async def createChannels(ctx, x: int = commands.parameter(description="The number of greater groups"), y: int = commands.parameter(description="The number of subgroups"), category_name: str = commands.parameter(default='groups', description='The name of the new category'), channel_syntax: str = commands.parameter(default='g', description='The syntax of the channels names (channel_syntax-x-y)')):

    await ctx.send(f'Ok! Creating {y} channels, {x} times')
    guild = ctx.message.guild
    category = await ctx.guild.create_category(category_name)

    for i in range(1, int(x) + 1):
        for j in range(1, int(y) + 1):
            await guild.create_text_channel(f"{channel_syntax}{i}-{j}", category=category)

#Command to delete all the channels in the current category (the one the command is typed in)
@bot.command(name='deleteChannels', help='WARNING! Deletes all channels in the current category!')
@has_permissions(administrator=True)
async def deleteChannels(ctx):
    channel = ctx.channel
    category = channel.category
    for channel in category.text_channels:
        await channel.delete()
    await category.delete()


bot.run(TOKEN)