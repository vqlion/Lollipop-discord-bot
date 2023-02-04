from discord import option
from discord.ext import commands
import wavelink
from discord.ext.commands import has_permissions


class Music(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.slash_command(name="play", description='Plays any song from youtube!')
    @option('song', description='The song you want to play')
    async def play(self, ctx, song: str):
        vc = ctx.voice_client 

        if not vc: # check if the bot is not in a voice channel
            vc = await ctx.author.voice.channel.connect(cls=wavelink.Player) 

        if ctx.author.voice.channel.id != vc.channel.id: # check if the bot is not in the voice channel
            return await ctx.respond("You must be in the same voice channel as the bot.") 

        song = await wavelink.YouTubeTrack.search(query=song, return_first=True) 

        if not song: # check if the song is not found
            return await ctx.respond("No song found.") 

        await vc.play(song) # play the song
        await ctx.respond(f"Now playing: `{vc.source.title}`") 

def setup(bot):
    bot.add_cog(Music(bot))