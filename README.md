# Pro Scouting Dashboard - Mise à jour TODO

## Nouvelles fonctionnalités ajoutées

J'ai étendu le dashboard avec **4 nouveaux slides de visualisation** avec des templates TODO prêts à être implémentés.

### 📊 Slides existants (fonctionnels)

1. **Analyse Terrain** - Heatmap, Passes, Actions
2. **Profil Performance** - Radar Chart
3. **Métriques Détaillées** - Stats détaillées
4. **Timeline Match** - Activité par minute

### 🚧 Nouveaux slides TODO (placeholders)

5. **Shot Map** - Carte des tirs avec xG
6. **Zone Analysis** - Analyse statistique par zone
7. **Progressive Passes** - Passes progressives
8. **Defensive Actions** - Actions défensives détaillées

## Structure des fichiers

```
/
├── index.html          # Page principale (8 slides au lieu de 4)
├── main.py            # Serveur Python
├── style.css          # Styles globaux
└── src/
    └── js/
        ├── main.js                  # ✅ Mise à jour (intègre les nouveaux modules)
        ├── dataManager.js           # ✅ Existant
        ├── pitch.js                 # ✅ Existant
        ├── heatmap.js              # ✅ Existant
        ├── passmap.js              # ✅ Existant
        ├── actions.js              # ✅ Existant
        ├── radarChart.js           # ✅ Existant
        ├── timeline.js             # ✅ Existant
        ├── shotmap.js              # 🆕 TODO Template
        ├── zoneAnalysis.js         # 🆕 TODO Template
        ├── progressivePasses.js    # 🆕 TODO Template
        └── defensiveActions.js     # 🆕 TODO Template
```

## Fonctionnalités TODO

### 1. Shot Map (shotmap.js)

**Objectif** : Visualiser tous les tirs avec calcul xG

Fonctionnalités prévues :

- Carte des tirs sur le terrain
- Calcul et affichage du xG (Expected Goals)
- Distinction : buts / tirs cadrés / tirs non cadrés
- Zones de tirs avec probabilité de but
- Taille des points proportionnelle au xG

**Icône** : 🎯 (bullseye)
**Couleur** : Bleu (#3b82f6)

---

### 2. Zone Analysis (zoneAnalysis.js)

**Objectif** : Statistiques détaillées par zone du terrain

Fonctionnalités prévues :

- Division du terrain en zones (3x3 ou 4x4)
- Stats détaillées par zone (passes, tirs, dribbles)
- Taux de réussite par zone
- Comparaison zones défensive/milieu/attaque
- Heatmap avancée avec métriques

**Icône** : 📊 (grid)
**Couleur** : Vert (#22c55e)

---

### 3. Progressive Passes (progressivePasses.js)

**Objectif** : Analyse des passes qui font progresser l'équipe

Fonctionnalités prévues :

- Détection des passes progressives (>10m vers l'avant)
- Visualisation des changements de jeu
- Passes vers le dernier tiers
- Création d'espaces et passes pénétrantes
- Métriques de progression territoriale

**Icône** : ➡️ (arrow-right)
**Couleur** : Orange (#f59e0b)

---

### 4. Defensive Actions (defensiveActions.js)

**Objectif** : Analyse détaillée du travail défensif

Fonctionnalités prévues :

- Carte des tacles et interceptions
- Zones de pressing et récupération
- Taux de réussite des duels
- Analyse du positionnement défensif
- Stats de contre-pressing

**Icône** : 🛡️ (shield)
**Couleur** : Violet (#8b5cf6)

## Modifications effectuées

### index.html

- ✅ Ajout de 4 nouveaux indicateurs dans le carrousel (8 au total)
- ✅ Ajout de 4 nouvelles slides avec leurs conteneurs

### main.js

- ✅ Import des 4 nouveaux modules
- ✅ Initialisation des nouveaux charts dans le constructeur
- ✅ Mise à jour des charts dans `goToSlide()`
- ✅ Appel de `update()` pour chaque nouveau chart dans `updateFilters()`

### Nouveaux fichiers créés

- ✅ `shotmap.js` - Template avec message TODO
- ✅ `zoneAnalysis.js` - Template avec message TODO
- ✅ `progressivePasses.js` - Template avec message TODO
- ✅ `defensiveActions.js` - Template avec message TODO

## Comment utiliser

1. **Démarrer le serveur** :

```bash
python main.py
```

2. **Naviguer dans le dashboard** :

   - Utilisez les flèches ← → ou les indicateurs en bas
   - Les 4 premiers slides sont fonctionnels
   - Les 4 derniers affichent des messages TODO élégants

3. **Pour implémenter un slide TODO** :
   - Ouvrez le fichier `.js` correspondant (ex: `shotmap.js`)
   - Remplacez la méthode `showTodoMessage()` par votre logique de visualisation
   - Utilisez `Pitch.js` pour dessiner sur le terrain si nécessaire
   - Référez-vous aux autres fichiers comme `actions.js` ou `passmap.js` pour des exemples

## Design des messages TODO

Chaque slide TODO affiche :

- Une icône colorée (grande taille, semi-transparente)
- Le titre du slide
- "TODO: À implémenter"
- Un encadré avec les fonctionnalités prévues
- Design cohérent avec le reste du dashboard

## Prochaines étapes

Pour chaque TODO, vous devrez :

1. Filtrer les événements pertinents depuis `events`
2. Créer les visualisations D3.js appropriées
3. Ajouter l'interactivité (tooltips, filtres)
4. Intégrer avec le système de filtres existant

Tous les templates suivent la même structure :

```javascript
export class MyChart {
  constructor(containerId) {
    this.containerId = containerId;
  }

  update(events) {
    // Votre logique ici
  }
}
```

## Support

Les données sont disponibles via `events` qui contient tous les événements filtrés.
Structure d'un événement :

```javascript
{
    x: 0-100,           // Position X (%)
    y: 0-100,           // Position Y (%)
    minute: 0-100,      // Minute du match
    type: {
        displayName: "Pass" | "Goal" | "TakeOn" | ...
    },
    outcomeType: {
        value: 1,       // 1 = succès
        displayName: "Successful" | "Unsuccessful"
    },
    endX: 0-100,        // Pour les passes
    endY: 0-100,
    qualifiers: [...]   // Qualificatifs supplémentaires
}
```

Bon développement ! 🚀⚽
