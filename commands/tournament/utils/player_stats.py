from ladder_custom import ladder_custom
import sys

if len(sys.argv) == 3:
    name = sys.argv[1]
    tag = sys.argv[2]
else:
    sys.stdout.write(f'{False}')
    sys.exit()

ladder = ladder_custom()
ladder.player_stats(name, tag)
