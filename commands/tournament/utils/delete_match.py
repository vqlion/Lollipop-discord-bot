from ladder_custom import ladder_custom
import sys

if len(sys.argv) == 2:
    match_id = sys.argv[1].split(',')
else:
    sys.stdout.write(f'{False}')
    sys.exit()

match_id = [str(i).strip() for i in match_id]

ladder = ladder_custom()
ladder.delete_match(match_id)
 