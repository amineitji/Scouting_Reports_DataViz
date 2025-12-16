import requests
from bs4 import BeautifulSoup

class PlayerImageScraper:
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }

    def get_profile_image_url(self, player_name):
        try:
            search_name = player_name.replace(' ', '+')
            search_url = f"https://www.transfermarkt.com/schnellsuche/ergebnis/schnellsuche?query={search_name}"
            
            response = requests.get(search_url, headers=self.headers, timeout=10)
            if response.status_code != 200: return None

            soup = BeautifulSoup(response.text, 'html.parser')
            table = soup.find('table', class_='items')
            if not table: return None
            
            first_row = table.find('tbody').find('tr')
            if not first_row: return None
            
            link_tag = first_row.find('td', class_='hauptlink').find('a', href=True)
            if not link_tag: return None
            
            profile_url = "https://www.transfermarkt.com" + link_tag['href']
            return self._extract_image_from_profile(profile_url)

        except: return None

    def _extract_image_from_profile(self, profile_url):
        try:
            response = requests.get(profile_url, headers=self.headers, timeout=10)
            soup = BeautifulSoup(response.text, 'html.parser')
            meta_img = soup.find('meta', property="og:image")
            if meta_img: return meta_img['content']
            img_tag = soup.find('img', class_='data-header__profile-image')
            if img_tag: return img_tag['src']
            return None
        except: return None