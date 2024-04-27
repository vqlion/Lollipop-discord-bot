#ladder_custom --> crée une database si elle n'existe pas, la parcourt et ajoute les games qui ne sont pas déjà ajoutées.
#Yayadelaplaya
#19.04.2024 18:25 par yaya

#Le programme va cherche la match désirée dans l'API Riot
#Et l'intégrer à une base de données.
#L'idée de base est de créer 4 leaders boards
#Winrate Joueur
#Présence Champion (Ban+Pick) ##pas encore
#Winrate Champion
#KDA Joueur
#Ces idées peuvent être soumises à modifications en fonction de l'envie
#Ou des possibilités offertes par le code

#L'idée du premier code est de donner rajouter manuellement chaque game jouée et il va refaire les calculs à chaque game ajoutée
#On pourra plus tard créer une base de données sql pour automatiser tout ça
#Ce qui pourrait être sympa c'est d'avoir un salon discord où quand on rentre l'id de la game, cela le fait automatiquement
import sqlite3
import requests
import os
import sys
import json

with open('config.json') as f:
    config = json.load(f)
    
API_KEY = config['riot_api_key']

DATABASE_FILE_PATH = './data/db_ladder.db'

class ladder_custom():
    def __init__(self):
        self.database = DATABASE_FILE_PATH
        self.api_key = API_KEY
        self.create_database()

    def get_db_tables(self):
            """
            Retrieves data from the database tables.

            Returns:
                - champions_stats: A list of champion statistics.
                - player_stats: A list of player statistics.
                - match_db: A list of match IDs.
            """
            conn = sqlite3.connect(self.database)
            c = conn.cursor()
            c.execute ('SELECT * FROM champions')
            data = c.fetchall()
            champions_stats = [list(row) for row in data]
            c.execute ('SELECT * FROM players')
            data = c.fetchall()
            player_stats = [list(row1) for row1 in data]
            c.execute ('SELECT * FROM matchIds')
            data = c.fetchall()
            match_db = [list(row2)[0] for row2 in data]
            conn.close()
            return champions_stats, player_stats, match_db
    
    def update_database(self, champions_stats, player_stats, match_db):
        """
        Updates the database with the provided champion stats, player stats, and match IDs.

        Args:
            champions_stats (list): A list of tuples containing champion stats to be inserted into the 'champions' table.
            player_stats (list): A list of tuples containing player stats to be inserted into the 'players' table.
            match_db (list): A list of match IDs to be inserted into the 'matchIds' table.

        Returns:
            None
        """
        conn = sqlite3.connect(self.database)
        c = conn.cursor()

        # Clean the database to update it with the new data
        c.execute('DELETE FROM champions')
        c.execute('DELETE FROM players')
        c.execute('DELETE FROM matchIds')

        # Insert the updated data
        for row in champions_stats:
            c.execute('INSERT INTO champions VALUES (?, ?, ?, ?, ?, ?)', row)
        for row in player_stats:
            c.execute('INSERT INTO players VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', row)
        for match_id in match_db:
            c.execute('INSERT INTO matchIds VALUES (?)', (match_id,))

        # Commit the changes and close the connection
        conn.commit()
        conn.close()

    def add_match(self, match_list):
        """
        Add matches to the database and update statistics for champions and players.

        Args:
            match_list (list): A list of match IDs to be added to the database.

        Returns:
            None
        """
        champions_stats, player_stats, match_db = self.get_db_tables()

        for match in match_list:
            if match not in match_db:
                match_db.append(match)
                # récupère les données du match à l'ID 'match'
                match_data = self.get_match_data(match)

                player_data = match_data['info']['participants']
                # on parcourt par participants
                for player in player_data:
                    ## première étape on s'occupe des stats pour chaque champion
                    ## si il n'y a pas déjà le champion (par championId) dans la base de données (ici une liste 2d) on rajoute une ligne pour le champion
                    if self.test_table(str(player['championId']), champions_stats, 5) == False:
                        champions_stats.append([player['championName'], 0, 0, 0, 0.0, player['championId']])
                    i = len(champions_stats) - 1
                    for j in range(len(champions_stats)):
                        if str(player['championId']) == champions_stats[j][5]:
                            i = j
                            break
                    if player['win']:
                        champions_stats[i][1] += 1
                    else:
                        champions_stats[i][2] += 1
                    champions_stats[i][3] = champions_stats[i][2] + champions_stats[i][1]
                    champions_stats[i][4] = champions_stats[i][1] / champions_stats[i][3] * 100

                    ## ensuite on s'occupe des stats par joueur
                    ## si il n'y a pas déjà le champion (par summonerID) dans la base de données (ici une liste 2d) on rajoute une ligne pour le joueur
                    if self.test_table(player['summonerId'], player_stats, 0) == False:
                        player_stats.append([player['summonerId'], player['riotIdGameName'], 0, 0, 0, 0.0, 0, 0, 0, 0.0])
                    i = len(player_stats) - 1
                    for j in range(len(player_stats)):
                        if player['summonerId'] == player_stats[j][0]:
                            i = j
                            break
                    if player['win']:
                        player_stats[i][2] += 1
                    else:
                        player_stats[i][3] += 1
                    player_stats[i][4] = player_stats[i][3] + player_stats[i][2]
                    player_stats[i][5] = player_stats[i][2] / player_stats[i][4] * 100
                    player_stats[i][6] += player['kills']
                    player_stats[i][7] += player['deaths']
                    player_stats[i][8] += player['assists']
                    if player_stats[i][7] != 0:
                        player_stats[i][9] = (player_stats[i][6] + player_stats[i][8]) / player_stats[i][7]
                    else:
                        player_stats[i][9] = player_stats[i][6] + player_stats[i][8]

        self.update_database(champions_stats, player_stats, match_db)
        sys.stdout.write(f'{True}')

    def delete_match(self, match_list):
        champions_stats, player_stats, match_db = self.get_db_tables()

        for match in match_list:
            if match not in match_db:
                sys.stdout.write(f'{False}')
                sys.exit()
            match_db.remove(match)
            match_data = self.get_match_data(match)
            player_data = match_data['info']['participants']
            # on parcourt par participants
            for player in player_data:
                i = 0
                ## première étape on s'occupe des stats pour chaque champion
                ## si il n'y a pas déjà le champion (par championId) dans la base de données (ici une liste 2d) on rajoute une ligne pour le champion
                if self.test_table(str(player['championId']), champions_stats, 5):
                    for index, champion in enumerate(champions_stats):
                        if champion[5] != str(player['championId']):
                            continue
                        champion[3] -= 1
                        if champion[3] == 0:
                            champions_stats.pop(index)
                            continue
                        if player['win']:
                            champion[1] -= 1
                        else:
                            champion[2] -= 1
                        champion[4] = champion[1] / champion[3] * 100

                if self.test_table(player['summonerId'], player_stats, 0):
                    for index, summoner in enumerate(player_stats):
                        if summoner[0] != player['summonerId']:
                            continue
                        summoner[4] -= 1
                        if summoner[4] == 0:
                            player_stats.pop(index)
                            continue
                        if player['win']:
                            summoner[2] -= 1
                        else:
                            summoner[3] -= 1
                        summoner[5] = summoner[2] / summoner[4] * 100
                        summoner[6] -= player['kills']
                        summoner[7] -= player['deaths']
                        summoner[8] -= player['assists']
                        if summoner[7] != 0:
                            summoner[9] = (summoner[6] + summoner[8]) / summoner[7]
                        else:
                            summoner[9] = summoner[6] + summoner[8]
        self.update_database(champions_stats, player_stats, match_db)
        sys.stdout.write(f'{True}')

    ## La fonction va cherche la base de donnée json dabs l'API Riot
    ## Match v5 est le module utilisé sur le site de Riot : https://developer.riotmatchs.com/apis#match-v5
    def get_match_data(self, match_id):
        """
        Retrieves match data from the Riot Games API.

        Args:
            match_id (str): The ID of the match to retrieve data for.

        Returns:
            dict: The match data in JSON format.

        Raises:
            SystemExit: If the API request fails.

        """
        url = f"https://europe.api.riotgames.com/lol/match/v5/matches/EUW1_{match_id}?api_key={self.api_key}"
        response = requests.get(url)
        if response.status_code == 200:
            return response.json()
        else:
            sys.stdout.write(f'{False}')
            sys.exit()
       
    # Ici on crée la database. Cette partie du code ne doit en théorique être
    # exécutée que la première fois, ou pour des tests.
    def create_database(self):
        """
        Creates the database if it doesn't already exist and initializes the required tables.

        Returns:
            None
        """
        if os.path.isfile(self.database):
            return

        # création de la db
        conn = sqlite3.connect(self.database)
        c = conn.cursor()

        ####Création des tables
        ###Organisation
        #Table1: id des games
        #Table2: stats des champions
        #Table3: stats des joueurs

        #table 1: match_ids
        c.execute('''CREATE TABLE IF NOT EXISTS matchIds
             (matchId TEXT PRIMARY KEY)''')
        
        #table 2: champions
        #Structure: [0] = champion // [1] = wins // [2] = loses // [3] = games total //  [4] = winrate% // [5] = championId
        c.execute('''CREATE TABLE IF NOT EXISTS champions
             (champion TEXT, wins INTEGER, loses INTEGER, total_games INTEGER, winrate REAL, championId TEXT PRIMARY KEY)''')
        
        #table 3: players
        #Structure: [0] = summonerId [1] = riotIdGameName [2] = wins [3] = loses [5] = %winrate [4] = games totales[6] = kills [7] = deaths [8] = assists [9] = KDA
        c.execute('''CREATE TABLE IF NOT EXISTS players
            (summonerId TEXT PRIMARY KEY,riotIdGameName TEXT,wins INTEGER, loses INTEGER, total_games INTEGER, winrate REAL, kills INTEGER, deaths INTEGER, assists INTEGER, kda REAL)''')
        
        conn.commit()
        conn.close()
    
    #test si un élément est présent dans un tableau
    def test_table(self, id, list, index):
        """
        Check if a given ID exists in a list of lists at a specific index.

        Parameters:
        - id (str): The ID to search for.
        - list (list): The list of lists to search in.
        - index (int): The index at which to check for the ID.

        Returns:
        - bool: True if the ID is found, False otherwise.
        """
        test = False
        for i in range(len(list)):
            if id == str(list[i][index]):
                test = True
                break
        return test
