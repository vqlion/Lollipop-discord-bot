from discord import option
from discord.ext import commands
from discord.ext.commands import has_permissions

class Utils(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.slash_command(name='purge', description='Deletes the x last messages (max 100)')
    @option('x', description='Number of messages to delete')
    @has_permissions(administrator=True)
    async def purge(self, ctx, x:int):
        channel = ctx.channel
        await ctx.respond(f'Got it! Deleting the {x} last messages in this channel')
        async for message in channel.history(limit=min(x + 1, 100)):
            await message.delete()

    @purge.error
    async def purge_error(ctx, err):
        await ctx.respond(f'{err}')

def setup(bot):
    bot.add_cog(Utils(bot))