from ladder_custom import ladder_custom
import sys

if len(sys.argv) == 2:
    match_id = sys.argv[1].split(',')
else:
    print(False)
    sys.exit()

match_id = [str(i).strip() for i in match_id]

ladder = ladder_custom()
ladder.add_match(match_id)
 