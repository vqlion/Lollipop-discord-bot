from ladder_custom import ladder_custom, DATABASE_FILE_PATH
import sys

if len(sys.argv) == 3:
    match_id = sys.argv[1].split(',')
    api_key = sys.argv[2]
else:
    match_id = ['6911909323']
    api_key = 'RGAPI-096aba05-3118-48fd-8731-1e2a24ba1c7e'
    # print('Usage: python ladder_custom.py match_id api_key')
    # sys.exit()

match_id = [str(i).strip() for i in match_id]

ladder = ladder_custom(DATABASE_FILE_PATH, api_key)
ladder.add_match(match_id)
 