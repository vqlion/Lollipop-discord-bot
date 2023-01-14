from discord import option
from discord.ext import commands
from discord.ext.commands import has_permissions

class Channels(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    #Command to create text channels for x groups and y subgroups in a new category
    @commands.slash_command(name='create_channels', description="Creates y channels, x times. Names them iteratively.")
    @option("x", description="Number of groups")
    @option("y", description="Number of subgroups")
    @option("category_name", description="Name of the new category", default="Groups")
    @option("channel_syntax", description="Channel's name's syntax", default="g")
    @has_permissions(administrator=True)
    async def create_channels(self, ctx, x:int, y:int, category_name, channel_syntax):
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
    @commands.slash_command(name='delete_channels', description='WARNING! Deletes all text channels in the current category!')
    @has_permissions(administrator=True)
    async def delete_channels(self, ctx):
        channel = ctx.channel
        category = channel.category
        for channel in category.text_channels:
            await channel.delete()
        await category.delete()

    @delete_channels.error
    async def delete_channels_error(ctx, err):
        await ctx.respond(f'{err}')

def setup(bot):
    bot.add_cog(Channels(bot))