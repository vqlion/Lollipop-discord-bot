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
from operator import attrgetter

with open('config.json') as f:
    config = json.load(f)
    
API_KEY = config['riot_api_key']

DATABASE_FILE_PATH = './data/db_ladder.db'

class ladder_custom():
    def __init__(self):
        self.database = DATABASE_FILE_PATH
        self.api_key = API_KEY
        self.create_database()

    class Champion():
        """
        Represents a champion in the database.

        Attributes:
        - name (str): The name of the champion.
        - wins (int): The number of wins the champion has.
        - loses (int): The number of losses the champion has.
        - total_games (int): The total number of games the champion has played.
        - winrate (float): The win rate of the champion.
        - id (int): The ID of the champion.
        """

        def __init__(self, stats):
            self.name = stats[0]
            self.wins = stats[1]
            self.loses = stats[2]
            self.total_games = stats[3]
            self.winrate = stats[4]
            self.id = stats[5]

        def test_id(self, id_tested):
            """
            Check if the given ID matches the champion's ID.

            Parameters:
            - id_tested (int): The ID to be tested.

            Returns:
            - bool: True if the given ID matches the champion's ID, False otherwise.
            """
            return self.id == id_tested
        
        def update_total_games(self):
            """
            Update the total number of games played by the champion.
            """
            self.total_games = self.wins + self.loses

        def update_winrate(self):
            """
            Update the win rate of the champion.
            """
            self.winrate = (self.wins / self.total_games) * 100

        def to_row(self):
            """
            Convert the champion object to a list representing a row of data.

            Returns:
            - list: A list containing the champion's name, wins, losses, total games, win rate, and ID.
            """
            return [self.name, self.wins, self.loses, self.total_games, self.winrate, self.id]
        
        def to_json(self):
            """
            Converts the Champion object to a JSON string.

            Returns:
                str: A JSON string representation of the object.
            """
            data = {
                'name': self.name,
                'wins': self.wins,
                'loses': self.loses,
                'total_games': self.total_games,
                'winrate': self.winrate,
                'id': self.id
            }
            return json.dumps(data)
        
        def to_dict(self):
            """
            Converts the Champion object to a dictionary.

            Returns:
                dict: A dictionary representation of the object.
            """
            data = {
                'name': self.name,
                'wins': self.wins,
                'loses': self.loses,
                'total_games': self.total_games,
                'winrate': self.winrate,
                'id': self.id
            }
            return data

    class Summoner():
        """
        Represents a summoner in the database.

        Attributes:
        - id (int): The ID of the summoner.
        - name (str): The name of the summoner.
        - wins (int): The number of wins the summoner has.
        - loses (int): The number of losses the summoner has.
        - total_games (int): The total number of games the summoner has played.
        - winrate (float): The win rate of the summoner.
        - kills (int): The number of kills the summoner has.
        - deaths (int): The number of deaths the summoner has.
        - assists (int): The number of assists the summoner has.
        - kda (float): The kill-death-assist ratio of the summoner.
        """

        def __init__(self, stats):
            self.id = stats[0]
            self.name = stats[1]
            self.wins = stats[2]
            self.loses = stats[3]
            self.total_games = stats[4]
            self.winrate = stats[5]
            self.kills = stats[6]
            self.deaths = stats[7]
            self.assists = stats[8]
            self.kda = stats[9]  

        def test_id(self, id_tested):
            """
            Check if the summoner's ID matches the given ID.

            Parameters:
            - id_tested (int): The ID to test against.

            Returns:
            - bool: True if the summoner's ID matches the given ID, False otherwise.
            """
            return self.id == id_tested
        
        def update_total_games(self):
            """
            Update the total number of games played by the summoner.
            """
            self.total_games = self.wins + self.loses

        def update_winrate(self):
            """
            Update the win rate of the summoner.
            """
            self.winrate = (self.wins / self.total_games) * 100

        def update_kda(self):
            """
            Update the kill-death-assist ratio of the summoner.
            """
            self.kda = (self.kills + self.assists) / self.deaths if self.deaths != 0 else (self.kills + self.assists)

        def to_row(self):
            """
            Convert the summoner object to a list representing a row of data.

            Returns:
            - list: A list containing the summoner's ID, name, wins, losses, total games, win rate, kills, deaths, assists, and kda.
            """
            return [self.id, self.name, self.wins, self.loses, self.total_games, self.winrate, self.kills, self.deaths, self.assists, self.kda]
        
        def to_json(self, icon_id=None):
            """
            Converts the Summoner object to a JSON string.

            Args:
                icon_id (int, optional): The ID of the player's icon. Defaults to None.

            Returns:
                str: A JSON string representing the ladder_custom object.
            """
            data = {
                'id': self.id,
                'name': self.name,
                'wins': self.wins,
                'loses': self.loses,
                'total_games': self.total_games,
                'winrate': self.winrate,
                'kills': self.kills,
                'deaths': self.deaths,
                'assists': self.assists,
                'kda': self.kda,
                'icon_id': icon_id
            }
            return json.dumps(data)
        
        def to_dict(self, icon_id=None):
            """
            Converts the object attributes into a dictionary.

            Args:
                icon_id (int, optional): The ID of the player's icon. Defaults to None.

            Returns:
                dict: A dictionary containing the object attributes.
            """
            data = {
                'id': self.id,
                'name': self.name,
                'wins': self.wins,
                'loses': self.loses,
                'total_games': self.total_games,
                'winrate': self.winrate,
                'kills': self.kills,
                'deaths': self.deaths,
                'assists': self.assists,
                'kda': self.kda,
                'icon_id': icon_id
            }
            return data


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
            champions_stats = [self.Champion(row) for row in data]
            c.execute ('SELECT * FROM players')
            data = c.fetchall()
            player_stats = [self.Summoner(row1) for row1 in data]
            c.execute ('SELECT * FROM matchIds')
            data = c.fetchall()
            match_db = [list(row2)[0] for row2 in data]
            conn.close()
            return champions_stats, player_stats, match_db
    
    def update_database(self, champions_stats, player_stats, match_db):
        """
        Updates the database with the provided champion stats, player stats, and match IDs.

        Args:
            champions_stats (list): A list of Champion instances to be inserted into the 'champions' table.
            player_stats (list): A list of Summoner instances to be inserted into the 'players' table.
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

        champions_stats = [champion.to_row() for champion in champions_stats]
        player_stats = [summoner.to_row() for summoner in player_stats]

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
                    player_champion_id = str(player['championId'])
                    if not self.test_table(player_champion_id, champions_stats):
                        champions_stats.append(self.Champion([player['championName'], 0, 0, 0, 0.0, player['championId']]))
                    i = len(champions_stats) - 1
                    for j, champion in enumerate(champions_stats):
                        if champion.test_id(player_champion_id):
                            i = j
                            break
                    if player['win']:
                        champions_stats[i].wins += 1
                    else:
                        champions_stats[i].loses += 1

                    champions_stats[i].update_total_games()
                    champions_stats[i].update_winrate()

                    ## ensuite on s'occupe des stats par joueur
                    ## si il n'y a pas déjà le champion (par summonerID) dans la base de données (ici une liste 2d) on rajoute une ligne pour le joueur
                    player_summoner_id = player['summonerId']
                    if not self.test_table(player_summoner_id, player_stats):
                        player_stats.append(self.Summoner([player['summonerId'], player['riotIdGameName'], 0, 0, 0, 0.0, 0, 0, 0, 0.0]))
                    i = len(player_stats) - 1
                    for j, summoner in enumerate(player_stats):
                        if summoner.test_id(player_summoner_id):
                            i = j
                            break
                    if player['win']:
                        player_stats[i].wins += 1
                    else:
                        player_stats[i].loses += 1

                    player_stats[i].update_total_games()
                    player_stats[i].update_winrate()

                    player_stats[i].kills += player['kills']
                    player_stats[i].deaths += player['deaths']
                    player_stats[i].assists += player['assists']
                    player_stats[i].update_kda()

        self.update_database(champions_stats, player_stats, match_db)
        sys.stdout.write(f'{True}')

    def delete_match(self, match_list):
        """
        Deletes matches from the database and updates player and champion statistics.

        Args:
            match_list (list): A list of matches to be deleted.

        Returns:
            None
        """
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
                player_champion_id = str(player['championId'])
                if self.test_table(player_champion_id, champions_stats):
                    for index, champion in enumerate(champions_stats):
                        if not champion.test_id(player_champion_id):
                            continue
                        if player['win']:
                            champion.wins -= 1
                        else:
                            champion.loses -= 1
                        champion.update_total_games()
                        if champion.total_games == 0:
                            champions_stats.pop(index)
                            continue
                        champion.update_winrate()
                
                player_summoner_id = player['summonerId']
                if self.test_table(player_summoner_id, player_stats):
                    for index, summoner in enumerate(player_stats):
                        if not summoner.test_id(player_summoner_id):
                            continue
                        if player['win']:
                            summoner.wins -= 1
                        else:
                            summoner.loses -= 1
                        summoner.update_total_games()
                        if summoner.total_games == 0:
                            player_stats.pop(index)
                            continue
                        summoner.update_winrate()
                        summoner.kills -= player['kills']
                        summoner.deaths -= player['deaths']
                        summoner.assists -= player['assists']
                        summoner.update_kda()

        self.update_database(champions_stats, player_stats, match_db)
        sys.stdout.write(f'{True}')

    def player_stats(self, player_name, player_tag):
        """
        Retrieves the player statistics based on the given player name and tag.

        Args:
            player_name (str): The name of the player.
            player_tag (str): The tag of the player.

        Returns:
            str: The player's stats in JSON format.
        """
        player_puuid = self.get_summoner_puuid(player_name, player_tag)
        player_puuid = player_puuid['puuid']
        summoner_id = self.get_summoner_id(player_puuid)
        summoner_icon_id = summoner_id['profileIconId']
        summoner_id = summoner_id['id']

        _, player_stats, _ = self.get_db_tables()

        if not self.test_table(summoner_id, player_stats):
            sys.stdout.write(f'{False}')
            sys.exit()

        for player in player_stats:
            if not player.test_id(summoner_id):
                continue
            sys.stdout.write(f'{player.to_json(summoner_icon_id)}')

    def champion_stats(self, champion_name):
        """
        Retrieves the statistics of a specific champion.

        Args:
            champion_name (str): The name of the champion.

        Returns:
            False: If the champion is not found in the statistics.
            str: The JSON representation of the champion's statistics.
        """
        champions_stats, _, _ = self.get_db_tables()

        for champion in champions_stats:
            if champion.name.lower() == champion_name.lower():
                sys.stdout.write(f'{champion.to_json()}')
                return

        sys.stdout.write(f'{False}')

    def leaderboard(self):
        """
        Retrieves the leaderboard of players based on their winrate/kda.

        Returns:
            str: A JSON string representing the leaderboard list.
        """
        _, player_stats, _ = self.get_db_tables()

        leaderboard_list = []
        max_leaderboard_length = 10

        for player in player_stats:
            if player.total_games < 3:
                continue
            leaderboard_list.append(player)

        leaderboard_list.sort(key=attrgetter('winrate', 'kda'), reverse=True)
        leaderboard_list = leaderboard_list[:max_leaderboard_length]

        leaderboard_list = [p.to_dict() for p in leaderboard_list]
        sys.stdout.write(f'{json.dumps(leaderboard_list)}')

    def get_summoner_puuid(self, name, tag):
        """
        Retrieves the PUUID of a summoner.

        Args:
            name (str): The summoner's name.
            tag (str): The summoner's tag.

        Returns:
            dict: A dictionary containing the summoner's PUUID.

        Raises:
            SystemExit: If the API request fails.

        """
        url = f'https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/{name}/{tag}?api_key={self.api_key}'
        response = requests.get(url)
        if response.status_code == 200:
            return response.json()
        else: 
            sys.stdout.write(f'{False}')
            sys.exit()

    def get_summoner_id(self, puuid):
        """
        Retrieves the summoner ID associated with the given PUUID.

        Args:
            puuid (str): The PUUID of the summoner.

        Returns:
            dict: A dictionary containing the summoner information if the request is successful.

        Raises:
            SystemExit: If tthe API request fails.

        """
        url = f'https://euw1.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/{puuid}?api_key={self.api_key}'
        response = requests.get(url)
        if response.status_code == 200:
            return response.json()
        else: 
            sys.stdout.write(f'{False}')
            sys.exit()
    
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
    def test_table(self, id, list):
        """
        Check if an instance with the given ID exists in a list of Champions or Summoner instances.

        Parameters:
        - id (str): The ID to search for.
        - list (list): The list to search in.

        Returns:
        - bool: True if the ID is found, False otherwise.
        """
        test = False
        for elem in list:
            test = elem.test_id(id)
            if test: return test
        return test