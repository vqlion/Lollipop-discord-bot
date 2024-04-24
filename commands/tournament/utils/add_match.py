from ladder_custom import ladder_custom, DATABASE_FILE_PATH
import sys

if len(sys.argv) == 3:
    match_id = sys.argv[1].split(',')
    api_key = sys.argv[2]
else:
    print(False)
    sys.exit()

match_id = [str(i).strip() for i in match_id]

ladder = ladder_custom(DATABASE_FILE_PATH, api_key)
ladder.add_match(match_id)
 