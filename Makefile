.PHONY: help setup install clean scrape-match scrape-season serve dev

# Variables
PYTHON := python3
PIP := pip3
PORT := 8000
SCRAPER_DIR := scraper
DATA_DIR := data

# Couleurs pour les messages
GREEN := \033[0;32m
YELLOW := \033[0;33m
NC := \033[0m

help: ## Affiche l'aide
	@echo "$(GREEN)Football Scouting Reports - Commandes disponibles:$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2}'

setup: ## Crée la structure complète du projet
	@echo "$(GREEN)📁 Création de la structure du projet...$(NC)"
	@mkdir -p $(DATA_DIR)
	@mkdir -p src/js
	@mkdir -p src/css
	@mkdir -p public
	@mkdir -p $(SCRAPER_DIR)
	@touch index.html
	@touch src/js/main.js
	@touch src/js/pitch.js
	@touch src/js/heatmap.js
	@touch src/js/passmap.js
	@touch src/js/stats.js
	@touch src/css/style.css
	@touch $(SCRAPER_DIR)/whoscored_scraper.py
	@touch $(SCRAPER_DIR)/requirements.txt
	@echo "$(GREEN)✅ Structure créée avec succès!$(NC)"

install: ## Installe les dépendances Python
	@echo "$(GREEN)📦 Installation des dépendances Python...$(NC)"
	@cd $(SCRAPER_DIR) && $(PIP) install -r requirements.txt
	@echo "$(GREEN)✅ Dépendances installées!$(NC)"

clean: ## Nettoie les fichiers temporaires et données
	@echo "$(YELLOW)🧹 Nettoyage des fichiers temporaires...$(NC)"
	@rm -rf $(DATA_DIR)/*.json
	@rm -rf __pycache__
	@rm -rf $(SCRAPER_DIR)/__pycache__
	@find . -name "*.pyc" -delete
	@echo "$(GREEN)✅ Nettoyage terminé!$(NC)"

scrape-match: ## Scrape un match (usage: make scrape-match URL="..." PLAYER="...")
	@if [ -z "$(URL)" ] || [ -z "$(PLAYER)" ]; then \
		echo "$(YELLOW)⚠️  Usage: make scrape-match URL=\"https://...\" PLAYER=\"Nom Joueur\"$(NC)"; \
		exit 1; \
	fi
	@echo "$(GREEN)⚽ Scraping du match pour $(PLAYER)...$(NC)"
	@cd $(SCRAPER_DIR) && $(PYTHON) whoscored_scraper.py "$(URL)" "$(PLAYER)"
	@echo "$(GREEN)✅ Données extraites dans $(DATA_DIR)/$(NC)"

scrape-season: ## Scrape une saison (usage: make scrape-season URL="..." PLAYER="...")
	@if [ -z "$(URL)" ] || [ -z "$(PLAYER)" ]; then \
		echo "$(YELLOW)⚠️  Usage: make scrape-season URL=\"https://...\" PLAYER=\"Nom Joueur\"$(NC)"; \
		exit 1; \
	fi
	@echo "$(GREEN)📊 Scraping de la saison pour $(PLAYER)...$(NC)"
	@cd $(SCRAPER_DIR) && $(PYTHON) whoscored_scraper.py "$(URL)" "$(PLAYER)"
	@echo "$(GREEN)✅ Données agrégées dans $(DATA_DIR)/$(NC)"

serve: ## Lance le serveur web local
	@echo "$(GREEN)🚀 Démarrage du serveur sur http://localhost:$(PORT)$(NC)"
	@echo "$(YELLOW)📂 Chargez un fichier JSON via l'interface web$(NC)"
	@$(PYTHON) -m http.server $(PORT)

dev: install serve ## Installation + Lancement du serveur (raccourci)

list-data: ## Liste les fichiers de données disponibles
	@echo "$(GREEN)📋 Fichiers JSON disponibles:$(NC)"
	@ls -lh $(DATA_DIR)/*.json 2>/dev/null || echo "$(YELLOW)Aucun fichier trouvé$(NC)"

example-match: ## Exemple de commande pour scraper un match
	@echo "$(YELLOW)Exemple de scraping d'un match:$(NC)"
	@echo "  make scrape-match URL=\"https://www.whoscored.com/matches/1234567/Live/France-Ligue-1-2024-2025-PSG-Lyon\" PLAYER=\"Kylian Mbappé\""

example-season: ## Exemple de commande pour scraper une saison
	@echo "$(YELLOW)Exemple de scraping d'une saison:$(NC)"
	@echo "  make scrape-season URL=\"https://www.whoscored.com/players/123456/Fixtures/Kylian-Mbappé\" PLAYER=\"Kylian Mbappé\""

init: setup install ## Initialisation complète du projet
	@echo "$(GREEN)🎉 Projet initialisé avec succès!$(NC)"
	@echo "$(YELLOW)Prochaine étape: make serve$(NC)"

check: ## Vérifie que tout est prêt
	@echo "$(GREEN)🔍 Vérification de l'environnement...$(NC)"
	@command -v $(PYTHON) >/dev/null 2>&1 || { echo "$(YELLOW)⚠️  Python3 non trouvé$(NC)"; exit 1; }
	@echo "  ✓ Python: $$($(PYTHON) --version)"
	@command -v $(PIP) >/dev/null 2>&1 || { echo "$(YELLOW)⚠️  Pip3 non trouvé$(NC)"; exit 1; }
	@echo "  ✓ Pip installé"
	@[ -f $(SCRAPER_DIR)/requirements.txt ] && echo "  ✓ requirements.txt présent" || echo "  $(YELLOW)⚠️  requirements.txt manquant$(NC)"
	@[ -f index.html ] && echo "  ✓ index.html présent" || echo "  $(YELLOW)⚠️  index.html manquant$(NC)"
	@echo "$(GREEN)✅ Environnement prêt!$(NC)"

stats: ## Affiche les statistiques du projet
	@echo "$(GREEN)📊 Statistiques du projet:$(NC)"
	@echo "  Fichiers JS: $$(find src/js -name '*.js' 2>/dev/null | wc -l)"
	@echo "  Fichiers CSS: $$(find src/css -name '*.css' 2>/dev/null | wc -l)"
	@echo "  Données JSON: $$(find $(DATA_DIR) -name '*.json' 2>/dev/null | wc -l)"
	@echo "  Lignes de code JS: $$(find src/js -name '*.js' -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $$1}')"

watch: ## Lance le serveur avec rechargement auto (nécessite browser-sync)
	@command -v browser-sync >/dev/null 2>&1 || { echo "$(YELLOW)⚠️  Installez browser-sync: npm install -g browser-sync$(NC)"; exit 1; }
	@echo "$(GREEN)🔄 Serveur avec rechargement automatique...$(NC)"
	@browser-sync start --server --files "**/*.html, **/*.css, **/*.js"

# Alias courts
s: serve ## Alias pour 'serve'
i: install ## Alias pour 'install'
c: clean ## Alias pour 'clean'