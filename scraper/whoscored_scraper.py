from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
import re
import json
import time
import os

class WhoScoredScraper:
    def __init__(self, url):
        self.url = url
        self.driver = None
        
    def _init_driver(self):
        opts = Options()
        opts.add_argument('--headless')
        opts.add_argument('--no-sandbox')
        opts.add_argument('--disable-dev-shm-usage')
        opts.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
        
        self.driver = webdriver.Chrome(options=opts)
        self.driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        
    def _extract_json(self, html):
        regex = r'(?<=require\.config\.params\["args"\].=.)[\s\S]*?;'
        match = re.search(regex, html)
        
        if not match:
            return None
            
        txt = match.group(0)
        txt = txt.replace('matchId', '"matchId"')
        txt = txt.replace('matchCentreData', '"matchCentreData"')
        txt = txt.replace('matchCentreEventTypeJson', '"matchCentreEventTypeJson"')
        txt = txt.replace('formationIdNameMappings', '"formationIdNameMappings"')
        txt = txt.replace('};', '}')
        
        try:
            return json.loads(txt)
        except:
            return None
    
    def scrape_match(self):
        self._init_driver()
        try:
            self.driver.get(self.url)
            WebDriverWait(self.driver, 15).until(
                EC.presence_of_element_located((By.ID, "layout-wrapper"))
            )
            html = self.driver.page_source
            return self._extract_json(html)
        finally:
            if self.driver:
                self.driver.quit()
    
    def scrape_season(self):
        self._init_driver()
        all_data = []
        
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
            
            for i, murl in enumerate(match_urls):
                print(f"Scraping match {i+1}/{len(match_urls)}...")
                self.driver.get(murl)
                WebDriverWait(self.driver, 10).until(
                    EC.presence_of_element_located((By.ID, "layout-wrapper"))
                )
                data = self._extract_json(self.driver.page_source)
                if data:
                    all_data.append(data)
                time.sleep(1)
                
            return all_data
        finally:
            if self.driver:
                self.driver.quit()
    
    def extract_player_data(self, data, player_name):
        if isinstance(data, list):
            return self._aggregate_season(data, player_name)
        return self._extract_match(data, player_name)
    
    def _extract_match(self, data, player_name):
        mc = data.get('matchCentreData', {})
        player_id = None
        
        for pid, name in mc.get('playerIdNameDictionary', {}).items():
            if name.lower() == player_name.lower():
                player_id = pid
                break
        
        if not player_id:
            return None
        
        events = [e for e in mc.get('events', []) if e.get('playerId') == int(player_id)]
        
        player_info = None
        for team in ['home', 'away']:
            for p in mc.get(team, {}).get('players', []):
                if p.get('playerId') == int(player_id):
                    player_info = p
                    break
        
        return {
            'player_name': player_name,
            'playerId': int(player_id),
            'stats': player_info.get('stats', {}) if player_info else {},
            'events': events,
            'match_info': {
                'home': mc.get('home', {}).get('name'),
                'away': mc.get('away', {}).get('name')
            }
        }
    
    def _aggregate_season(self, data_list, player_name):
        all_events = []
        agg_stats = {}
        player_id = None
        
        for match in data_list:
            mc = match.get('matchCentreData', {})
            
            pid = None
            for p, n in mc.get('playerIdNameDictionary', {}).items():
                if n.lower() == player_name.lower():
                    pid = p
                    break
            
            if not pid:
                continue
            
            if not player_id:
                player_id = pid
            
            events = [e for e in mc.get('events', []) if e.get('playerId') == int(pid)]
            all_events.extend(events)
            
            for team in ['home', 'away']:
                for p in mc.get(team, {}).get('players', []):
                    if p.get('playerId') == int(pid):
                        for k, v in p.get('stats', {}).items():
                            if isinstance(v, (int, float)):
                                agg_stats[k] = agg_stats.get(k, 0) + v
        
        return {
            'player_name': player_name,
            'playerId': int(player_id) if player_id else 0,
            'stats': agg_stats,
            'events': all_events,
            'total_matches': len(data_list)
        }

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 3:
        print("Usage: python whoscored_scraper.py <url> <player_name>")
        sys.exit(1)
    
    url = sys.argv[1]
    player_name = sys.argv[2]
    
    scraper = WhoScoredScraper(url)
    
    if '/players/' in url:
        data = scraper.scrape_season()
    else:
        data = scraper.scrape_match()
    
    player_data = scraper.extract_player_data(data, player_name)
    
    os.makedirs('../data', exist_ok=True)
    output = f"../data/{player_name.replace(' ', '_')}.json"
    
    with open(output, 'w', encoding='utf-8') as f:
        json.dump(player_data, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Données exportées: {output}")