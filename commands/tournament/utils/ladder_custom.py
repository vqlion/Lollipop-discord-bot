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

class ladder_custom():
    def __init__(self, db_path, api_key):
        self.database = db_path
        self.api_key = api_key
        self.create_database()

    def get_db_tables(self):
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
        conn = sqlite3.connect(self.database)
        c = conn.cursor()
        ## on clean la database pour la compléter avec les données mis à jour
        c.execute('DELETE FROM champions')
        c.execute('DELETE FROM players')
        c.execute('DELETE FROM matchIds')

        #insertion des données màj
        for row in champions_stats:
            c.execute('INSERT INTO champions VALUES (?, ?, ?, ?, ?, ?)', row)
        for row in player_stats:
            c.execute('INSERT INTO players VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', row)
        for match_id in match_db:
            c.execute('INSERT INTO matchIds VALUES (?)', (match_id,))
        
        #on coupe la connexion avec la db
        conn.commit()
        conn.close()

    def add_match(self, match_list):        
        champions_stats, player_stats, match_db = self.get_db_tables()

        for match in match_list:
            if match not in match_db:
                match_db.append(match)
                #récupère les données du match à l'ID 'match'
                match_data = self.get_match_data(match)

                player_data = match_data['info']['participants']
                #on parcourt par participants
                for player in player_data:
                    i = 0
                    ##première étape on s'occupe des stats pour chaque champion
                    ##si il n'y a pas déjà le champion (par championId) dans la base de données (ici une liste 2d) on rajoute une ligne pour le champion
                    if self.test_table(str(player['championId']),champions_stats,5) == False:
                        champions_stats.append([player['championName'],0,0,0,0.0,player['championId']])
                    for j in range(len(champions_stats)):
                        if player['championId'] ==champions_stats[j][5]:
                            i = j
                            break
                    if player['win']:
                        champions_stats[i][1] += 1
                    else:
                        champions_stats[i][2] += 1
                    champions_stats[i][3] = champions_stats[i][2] + champions_stats[i][1]
                    champions_stats[i][4] = champions_stats[i][1] / champions_stats[i][3] * 100
                    
                    ##ensuite on s'occupe des stats par joueur
                    i = 0
                    ##si il n'y a pas déjà le champion (par summonerID) dans la base de données (ici une liste 2d) on rajoute une ligne pour le joueur
                    if self.test_table(player['summonerId'], player_stats, 0) == False:
                        player_stats.append([player['summonerId'],player['riotIdGameName'],0,0,0,0.0,0,0,0,0.0])
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
                        player_stats[i][9] = (player_stats[i][6]+player_stats[i][8])/player_stats[i][7]
                    else:
                        player_stats[i][9] = 999

        #affichage des stats sous forme de print

        print('\n\n----\nLes statistiques par joueurs sont les suivants :\n\n')
        for player in player_stats:
            print(player[1], ' : ', player[2], ' victoire(s) - ', player[3], ' défaite(s) - ',player[5],'% winrate - KDA de ', round(player[9],2),'\n')
        print('\n\n')

        self.update_database(champions_stats, player_stats, match_db)

    ## La fonction va cherche la base de donnée json dabs l'API Riot
    ## Match v5 est le module utilisé sur le site de Riot : https://developer.riotmatchs.com/apis#match-v5
    def get_match_data(self, match_id):
        url = f"https://europe.api.riotgames.com/lol/match/v5/matches/EUW1_{match_id}?api_key={self.api_key}"
        response = requests.get(url)
        if response.status_code == 200:
            return response.json()
        else:
            print("Erreur : ",response.status_code)
            return None
       
    # Ici on crée la database. Cette partie du code ne doit en théorique être
    # exécutée que la première fois, ou pour des tests.
    def create_database(self):

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
             (matchId TEXT)''')
        
        #table 2: champions
        #Structure: [0] = champion // [1] = wins // [2] = loses // [3] = games total //  [4] = winrate% // [5] = championId
        c.execute('''CREATE TABLE IF NOT EXISTS champions
             (champion TEXT, wins INTEGER, loses INTEGER, total_games INTEGER, winrate REAL, championId TEXT)''')
        
        #table 3: players
        #Structure: [0] = summonerId [1] = riotIdGameName [2] = wins [3] = loses [5] = %winrate [4] = games totales[6] = kills [7] = deaths [8] = assists [9] = KDA
        c.execute('''CREATE TABLE IF NOT EXISTS players
            (summonerId TEXT,riotIdGameName TEXT,wins INTEGER, loses INTEGER, total_games INTEGER, winrate REAL, kills INTEGER, deaths INTEGER, assists INTEGER, kda REAL)''')
        
        print('La base de donnée a été créée.s')
        conn.commit()
        conn.close()
    
    #test si un élément est présent dans un tableau
    def test_table(self, id, list, index):
        test = False
        for i in range(len(list)):
            if id==str(list[i][index]):
                test = True
                break
        return test
    
    
#####MAIN########
###VARIABLES
# La API Key est trouvable sur le Riot Developer Portal https://developer.riotmatchs.com/
# Elle doit être changée toutes les 24h ou une demande spéciale doit être faite à riot pour garder la même
# Les matchs (custom) doivent être laner avec un code tournoi, sinon elle ne seront pas trouvées par l'API

if len(sys.argv) == 3:
    match_id = sys.argv[1].split(',')
    api_key = sys.argv[2]
else:
    match_id = ['6911909323']
    api_key = 'RGAPI-096aba05-3118-48fd-8731-1e2a24ba1c7e'
    # print('Usage: python ladder_custom.py match_id api_key')
    # sys.exit()

match_id = [str(i).strip() for i in match_id]

database_file_path = './data/db_ladder.db'

ladder = ladder_custom(database_file_path, api_key)
ladder.add_match(match_id)
 
