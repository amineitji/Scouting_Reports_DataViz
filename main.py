import os
import sys
import time
import json
import http.server
import socketserver
import webbrowser
from threading import Thread

# Configuration
PORT = 8000
DATA_DIR = "data"
os.makedirs(DATA_DIR, exist_ok=True)

# Couleurs pour le terminal
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_banner():
    print(Colors.HEADER + r"""
   ⚽  SCOUTING REPORTS MANAGER  ⚽
   ================================
    """ + Colors.ENDC)

def interactive_scraper():
    print(Colors.BLUE + "\n--- MODULE DE SCRAPING ---" + Colors.ENDC)
    
    # Vérification des dépendances
    try:
        from scraper.whoscored_scraper import WhoScoredScraper
    except ImportError:
        print(Colors.FAIL + "❌ Erreur: Impossible de charger le module scraper." + Colors.ENDC)
        print("Vérifiez que vous avez bien le fichier 'scraper/whoscored_scraper.py'")
        return

    url = input(Colors.BOLD + "1. Collez l'URL WhoScored (Match ou Joueur) : " + Colors.ENDC).strip()
    if not url: return

    player = input(Colors.BOLD + "2. Nom exact du joueur à analyser : " + Colors.ENDC).strip()
    if not player: return

    print(Colors.WARNING + "\n⏳ Démarrage du navigateur (Chrome)... Patientez..." + Colors.ENDC)
    
    try:
        scraper = WhoScoredScraper(url)
        data = None
        
        if '/players/' in url:
            print("   ↳ Mode Saison détecté...")
            raw_data = scraper.scrape_season()
            data = scraper.extract_player_data(raw_data, player)
        else:
            print("   ↳ Mode Match unique détecté...")
            raw_data = scraper.scrape_match()
            data = scraper.extract_player_data(raw_data, player)
            
        if not data or not data.get('events'):
            print(Colors.FAIL + f"❌ Aucune donnée trouvée pour '{player}'." + Colors.ENDC)
            return

        filename = f"{player.replace(' ', '_')}_{int(time.time())}.json"
        filepath = os.path.join(DATA_DIR, filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            
        print(Colors.GREEN + f"\n✅ SUCCÈS ! Rapport généré : {filepath}" + Colors.ENDC)
        
    except Exception as e:
        print(Colors.FAIL + f"\n❌ Une erreur est survenue : {e}" + Colors.ENDC)

class ScoutingHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # API : Lister les fichiers JSON automatiquement
        if self.path == '/api/files':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            files = [f for f in os.listdir(DATA_DIR) if f.endswith('.json')]
            # Tri par date de modification (plus récent en premier)
            files.sort(key=lambda x: os.path.getmtime(os.path.join(DATA_DIR, x)), reverse=True)
            
            self.wfile.write(json.dumps(files).encode())
        else:
            super().do_GET()

def start_server():
    print(Colors.BLUE + "\n--- SERVEUR LOCAL ---" + Colors.ENDC)
    
    # Changer le répertoire de travail pour s'assurer qu'on sert la racine
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    with socketserver.TCPServer(("", PORT), ScoutingHandler) as httpd:
        url = f"http://localhost:{PORT}"
        print(Colors.GREEN + f"✅ Serveur en ligne : {url}" + Colors.ENDC)
        print("📂 Dossier des données : /data")
        print("Presser Ctrl+C pour arrêter le serveur.")
        
        # Ouvrir le navigateur automatiquement
        webbrowser.open(url)
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Arrêt du serveur.")

def main():
    while True:
        os.system('cls' if os.name == 'nt' else 'clear')
        print_banner()
        print("1. 🕵️  Lancer le Scraper (Nouveau rapport)")
        print("2. 🚀 Lancer la Visualisation (Serveur Web)")
        print("3. 🚪 Quitter")
        
        choice = input(Colors.BOLD + "\nVotre choix [1-3] : " + Colors.ENDC)
        
        if choice == '1':
            interactive_scraper()
            input(Colors.BOLD + "\nAppuyez sur Entrée pour revenir au menu..." + Colors.ENDC)
        elif choice == '2':
            start_server()
            break # Le serveur bloque, donc on sort de la boucle si on l'arrête
        elif choice == '3':
            print("À bientôt ! 👋")
            break
        else:
            print("Choix invalide.")
            time.sleep(1)

if __name__ == "__main__":
    main()