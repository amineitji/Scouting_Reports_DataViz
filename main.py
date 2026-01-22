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
# --- MODIFICATION POUR RENDER ---
# Récupère le port défini par Render (variable d'env) ou utilise 8000 par défaut (local)
PORT = int(os.environ.get("PORT", 8000))

DATA_DIR = "data"
os.makedirs(DATA_DIR, exist_ok=True)

class ScoutingHandler(http.server.SimpleHTTPRequestHandler):
    def log_error(self, format, *args):
        # Ignorer les BrokenPipeError (client ferme connexion)
        if args and isinstance(args[0], str) and 'Broken pipe' in args[0]:
            return
        super().log_error(format, *args)
    
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
    
    def end_headers(self):
        # Désactiver le cache pour forcer le rechargement
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

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
                    self._send_json_response(500, {'error': 'Module Scraper introuvable côté serveur'})
                    return

                print(f"\n🚀 Scraping demandé pour : {player}")
                print(f"🔗 URL : {url}")
                
                # Déterminer le type (match unique ou saison)
                is_season = '/Players/' in url or '/History' in url
                scrape_type = 'saison' if is_season else 'match'
                
                # Exécution du Scraper
                scraper = WhoScoredScraper(url)
                
                print(f"📊 Type de scraping : {scrape_type}")
                
                # Détection automatique match/saison
                raw_data = scraper.scrape_url()
                
                if not raw_data:
                    self._send_json_response(404, {'error': 'Impossible de récupérer les données'})
                    return

                # Compter les matchs
                num_matches = len(raw_data) if isinstance(raw_data, list) else 1
                print(f"📁 {num_matches} match(s) trouvé(s)")

                final_data = scraper.extract_player_data(raw_data, player)
                
                if final_data['total_matches'] == 0:
                    self._send_json_response(404, {'error': f"Joueur '{player}' introuvable"})
                    return

                # Sauvegarde du fichier
                filename = f"{player.replace(' ', '_')}_{int(time.time())}.json"
                filepath = os.path.join(DATA_DIR, filename)
                
                with open(filepath, 'w', encoding='utf-8') as f:
                    json.dump(final_data, f, ensure_ascii=False, indent=2)

                print(f"✅ Fichier généré : {filename}")
                
                # Créer la liste des matchs pour le frontend
                matches_info = []
                if final_data.get('matches_list'):
                    for m in final_data['matches_list']:
                        matches_info.append({
                            'date': m.get('date', ''),
                            'opponent': m.get('opponent', 'Unknown'),
                            'score': m.get('score', ''),
                            'competition': m.get('competition', '')
                        })
                
                self._send_json_response(200, {
                    'success': True, 
                    'file': filename,
                    'type': scrape_type,
                    'total_matches': final_data['total_matches'],
                    'matches': matches_info,
                    'player_name': player,
                    'total_events': len(final_data.get('events', [])),
                    'message': f'{num_matches} match(s) scrapé(s) avec succès !'
                })

            except Exception as e:
                print(f"❌ Erreur : {e}")
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
    # Note : Sur Render, le chemin peut varier, mais os.path.dirname(__file__) reste sûr
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # Permet de redémarrer le serveur rapidement sans erreur "Address already in use"
    socketserver.TCPServer.allow_reuse_address = True
    
    try:
        # Écoute sur 0.0.0.0 (nécessaire pour Render) via ""
        with socketserver.TCPServer(("", PORT), ScoutingHandler) as httpd:
            url = f"http://localhost:{PORT}"
            print(f"✅ Dashboard accessible ici : {url}")
            
            # L'ouverture du navigateur peut échouer sur un serveur headless (Render), on ignore l'erreur
            try:
                if "RENDER" not in os.environ: # Évite d'essayer d'ouvrir le navigateur sur Render
                    print("🌐 Ouvrez cette adresse dans votre navigateur.")
                    webbrowser.open(url)
            except:
                pass

            print("⌨️  Appuyez sur Ctrl+C pour arrêter le serveur.")
            httpd.serve_forever()
    except OSError as e:
        if e.errno == 98:
            print(f"❌ Erreur : Le port {PORT} est déjà utilisé.")
            print("👉 Solution : Changez la variable PORT ou fermez l'autre instance.")
        else:
            raise

if __name__ == "__main__":
    start_server()