from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
import re
import json
import time

try:
    from scraper.image_scraper import PlayerImageScraper
except ImportError:
    try:
        from image_scraper import PlayerImageScraper
    except:
        PlayerImageScraper = None

class WhoScoredScraper:
    def __init__(self, url):
        self.url = url
        self.driver = None
        self.image_scraper = PlayerImageScraper() if PlayerImageScraper else None
        
    def _init_driver(self):
        opts = Options()
        opts.add_argument('--headless')
        opts.add_argument('--no-sandbox')
        opts.add_argument('--disable-dev-shm-usage')
        opts.add_argument('--disable-gpu')
        opts.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
        
        self.driver = webdriver.Chrome(options=opts)
        
    def _extract_json(self, html):
        regex = r'(?<=require\.config\.params\["args"\].=.)[\s\S]*?;'
        match = re.search(regex, html)
        if not match: return None
        txt = match.group(0)
        txt = txt.replace('matchId', '"matchId"').replace('matchCentreData', '"matchCentreData"').replace('matchCentreEventTypeJson', '"matchCentreEventTypeJson"').replace('formationIdNameMappings', '"formationIdNameMappings"').replace('};', '}')
        try: return json.loads(txt)
        except: return None
    
    def scrape_url(self):
        if '/players/' in self.url:
            return self.scrape_season()
        else:
            data = self.scrape_single_match_page(self.url)
            return [data] if data else []

    def scrape_single_match_page(self, url):
        self._init_driver()
        try:
            self.driver.get(url)
            WebDriverWait(self.driver, 15).until(EC.presence_of_element_located((By.ID, "layout-wrapper")))
            return self._extract_json(self.driver.page_source)
        except Exception: return None
        finally:
            if self.driver: self.driver.quit()
    
    def scrape_season(self):
        self._init_driver()
        all_matches_data = []
        try:
            self.driver.get(self.url)
            time.sleep(3)
            soup = BeautifulSoup(self.driver.page_source, 'html.parser')
            base = 'https://fr.whoscored.com' if 'fr.whoscored' in self.url else 'https://www.whoscored.com'
            match_urls = set()
            for link in soup.find_all('a', href=True):
                href = link['href']
                if '/matches/' in href and re.search(r'/matches/\d+', href):
                    if '/live/' in href or '/show/' in href:
                        url = base + href if not href.startswith('http') else href
                        url = url.replace("/Show/", "/Live/")
                        match_urls.add(url)
            self.driver.quit()
            
            match_list = list(match_urls)
            for i, murl in enumerate(match_list):
                data = self.scrape_single_match_page(murl)
                if data: all_matches_data.append(data)
                time.sleep(1)
            return all_matches_data
        except:
            if self.driver: self.driver.quit()
            return []

    def extract_player_data(self, matches_raw_data, player_name):
        final_data = {
            'player_name': player_name,
            'player_image_url': None,
            'total_matches': 0,
            'teams_played_for': [],
            'matches_list': [],
            'events': []
        }

        if self.image_scraper:
            final_data['player_image_url'] = self.image_scraper.get_profile_image_url(player_name)

        processed_matches = 0
        for match_json in matches_raw_data:
            if not match_json: continue
            mc = match_json.get('matchCentreData', {})
            
            player_id = None
            for pid, name in mc.get('playerIdNameDictionary', {}).items():
                if name.lower() == player_name.lower():
                    player_id = pid
                    break
            
            if not player_id: continue

            processed_matches += 1
            pid_int = int(player_id)
            
            match_info = {
                'matchId': mc.get('matchId'),
                'date': mc.get('timeStamp'),
                'competition': mc.get('commonName'),
                'score': mc.get('score'),
                'homeTeam': mc.get('home', {}).get('name'),
                'awayTeam': mc.get('away', {}).get('name')
            }
            
            player_team_id = None
            opponent_team_name = "Unknown"
            
            for p in mc.get('home', {}).get('players', []):
                if p.get('playerId') == pid_int:
                    player_team_id = mc.get('home', {}).get('teamId')
                    final_data['teams_played_for'].append(mc.get('home', {}).get('name'))
                    opponent_team_name = mc.get('away', {}).get('name')
                    break
            
            if not player_team_id:
                for p in mc.get('away', {}).get('players', []):
                    if p.get('playerId') == pid_int:
                        player_team_id = mc.get('away', {}).get('teamId')
                        final_data['teams_played_for'].append(mc.get('away', {}).get('name'))
                        opponent_team_name = mc.get('home', {}).get('name')
                        break
            
            match_info['opponent'] = opponent_team_name
            final_data['matches_list'].append(match_info)

            raw_events = [e for e in mc.get('events', []) if e.get('playerId') == pid_int]
            for ev in raw_events:
                ev['matchId'] = match_info['matchId']
                ev['matchDate'] = match_info['date']
                ev['opponent'] = match_info['opponent']
                final_data['events'].append(ev)

        final_data['total_matches'] = processed_matches
        final_data['teams_played_for'] = list(set(final_data['teams_played_for']))
        return final_data