import os
import sys
import time
import json
import http.server
import socketserver
import webbrowser
from threading import Thread

# Import du module de scraping
# On tente d'importer depuis le dossier scraper/
try:
    from scraper.whoscored_scraper import WhoScoredScraper
except ImportError:
    print("⚠️ Module scraper non trouvé. Assurez-vous d'avoir 'scraper/whoscored_scraper.py'")
    WhoScoredScraper = None

# Configuration
PORT = 8000
DATA_DIR = "data"
os.makedirs(DATA_DIR, exist_ok=True)

class ScoutingHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # API : Lister les fichiers
        if self.path == '/api/files':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            try:
                files = [f for f in os.listdir(DATA_DIR) if f.endswith('.json')]
                files.sort(key=lambda x: os.path.getmtime(os.path.join(DATA_DIR, x)), reverse=True)
                self.wfile.write(json.dumps(files).encode())
            except Exception as e:
                self.wfile.write(json.dumps([]).encode())
        else:
            # Comportement par défaut (servir les fichiers statiques HTML/JS/CSS)
            super().do_GET()

    def do_POST(self):
        # API : Lancer le Scraping
        if self.path == '/api/scrape':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                request_data = json.loads(post_data)
                url = request_data.get('url')
                player = request_data.get('name')

                if not url or not player:
                    self._send_json_response(400, {'error': 'URL et Nom requis'})
                    return

                if not WhoScoredScraper:
                    self._send_json_response(500, {'error': 'Module Scraper introuvable côté serveur (fichier scraper/whoscored_scraper.py manquant)'})
                    return

                print(f"\n🚀 Scraping demandé pour : {player}")
                print(f"🔗 URL : {url}")
                
                # Exécution du Scraper
                scraper = WhoScoredScraper(url)
                
                # Détection automatique match/saison
                raw_data = scraper.scrape_url()
                
                if not raw_data:
                    self._send_json_response(404, {'error': 'Impossible de récupérer les données brutes (URL invalide ou blocage)'})
                    return

                final_data = scraper.extract_player_data(raw_data, player)
                
                if final_data['total_matches'] == 0:
                    self._send_json_response(404, {'error': f"Joueur '{player}' introuvable dans les données récupérées. Vérifiez l'orthographe exacte."})
                    return

                # Sauvegarde du fichier
                filename = f"{player.replace(' ', '_')}_{int(time.time())}.json"
                filepath = os.path.join(DATA_DIR, filename)
                
                with open(filepath, 'w', encoding='utf-8') as f:
                    json.dump(final_data, f, ensure_ascii=False, indent=2)

                print(f"✅ Fichier généré avec succès : {filename}")
                
                self._send_json_response(200, {
                    'success': True, 
                    'file': filename, 
                    'message': 'Scraping réussi !'
                })

            except Exception as e:
                print(f"❌ Erreur serveur pendant le scraping : {e}")
                import traceback
                traceback.print_exc()
                self._send_json_response(500, {'error': str(e)})

    def _send_json_response(self, status, data):
        self.send_response(status)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

def start_server():
    print(f"\n--- SERVEUR SCOUTING PRO ACTIF SUR LE PORT {PORT} ---")
    
    # S'assurer qu'on est dans le bon dossier racine
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # Permet de redémarrer le serveur rapidement sans erreur "Address already in use"
    socketserver.TCPServer.allow_reuse_address = True
    
    try:
        with socketserver.TCPServer(("", PORT), ScoutingHandler) as httpd:
            url = f"http://localhost:{PORT}"
            print(f"✅ Dashboard accessible ici : {url}")
            print("🌐 Ouvrez cette adresse dans votre navigateur.")
            print("⌨️  Appuyez sur Ctrl+C pour arrêter le serveur.")
            
            # Ouverture automatique
            webbrowser.open(url)
            
            httpd.serve_forever()
    except OSError as e:
        if e.errno == 98:
            print(f"❌ Erreur : Le port {PORT} est déjà utilisé.")
            print("👉 Solution : Changez la variable PORT dans main.py ou fermez l'autre instance.")
        else:
            raise

if __name__ == "__main__":
    start_server()