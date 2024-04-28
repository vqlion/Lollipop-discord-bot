from ladder_custom import ladder_custom
import sys

if len(sys.argv) == 2:
    name = sys.argv[1]
else:
    sys.stdout.write(f'{False}')
    sys.exit()

ladder = ladder_custom()
ladder.champion_stats(name.replace(' ', ''))
