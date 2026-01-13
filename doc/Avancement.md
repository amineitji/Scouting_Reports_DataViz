# Cahier d'avancement - Projet Data Visualization

**Groupe :** Amine, Youssef, Joubrane, Amir  
**Sujet :** Scouting Reports DataViz (Analyse de données footballistiques)

## 📅 12/11 - Phase de conception et analyse critique

**Objectif :** Définition du périmètre et analyse de l'existant

### Livrable Tomuss

Soumission individuelle d'une critique de visualisation de données (analyse des types d'encodage, interactions et pertinence)

### Évolution du projet

- **Point de départ :** Statistiques simples via Excel
- **Pivot majeur :** Passage aux données événementielles précises (coordonnées X,Y, timestamps) pour des visualisations géographiques et tactiques avancées

## 📅 09/12 - Acquisition des données (Backend)

**Objectif :** Mise en place du pipeline de données

### Développement Python

- Scripts de web scraping : `whoscored_scraper.py` et `image_scraper.py`
- Automatisation de la récupération des données de matchs

### Traitement

- Exploration des fichiers JSON (événements, IDs joueurs)
- Nettoyage pour extraction des informations pertinentes (passes, tirs, actions défensives)

## 📅 16/12 - Développement du MVP

**Objectif :** Premier prototype fonctionnel

### Architecture Web

Structure HTML/CSS de base

### Visualisations initiales

1. **Heatmaps** (`heatmap.js`) : Densité de présence sur le terrain
2. **Passmaps** (`passmap.js`) : Connexions et trajectoires de balles

**Résultat :** Affichage interactif des données d'un joueur spécifique

## 📅 07/01 - Enrichissement et diversification

**Objectif :** Finalisation des fonctionnalités

### Nouvelles visualisations

- **Radar Charts** (`radarChart.js`) : Comparaison de profils
- **Shotmaps** (`shotmap.js`) : Localisation des tirs et buts
- **Analyse de Zones** (`zoneAnalysis.js`) : Statistiques sectorielles
- **Passes Progressives** : Distinction des passes clés

### Intégration

Dashboard unifié (`dashboard.js`) pour navigation entre joueurs (Ounahi, Cherki, Doku, etc.)

## 📅 13/01 - Polissage et déploiement (Bonus)

**Objectif :** Rendu final et mise en ligne

### Améliorations finales

- Design UX/UI (`style.css`) pour lisibilité optimale
- Déploiement en ligne pour accès public
- Tests de cohérence des données affichées

**Décision collective :** Aller au-delà du local pour démontrer la robustesse du projet
