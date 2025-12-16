/**
 * dataManager.js
 * Gestion centrale des données avec traduction FR
 */

// Traduction des types d'événements en français
const EVENT_TRANSLATIONS = {
    'Pass': 'Passe',
    'Goal': 'But',
    'MissedShots': 'Tir manqué',
    'SavedShot': 'Tir arrêté',
    'ShotOnPost': 'Tir sur poteau',
    'TakeOn': 'Dribble',
    'Tackle': 'Tacle',
    'Interception': 'Interception',
    'Clearance': 'Dégagement',
    'BallRecovery': 'Récupération',
    'Foul': 'Faute',
    'Aerial': 'Duel aérien',
    'BallTouch': 'Touche de balle',
    'Dispossessed': 'Dépossédé',
    'BlockedPass': 'Passe bloquée',
    'CornerAwarded': 'Corner obtenu',
    'FreekickTaken': 'Coup franc tiré',
    'ThrowIn': 'Remise en touche',
    'OffsidePass': 'Passe en hors-jeu',
    'Successful': 'Réussie',
    'Unsuccessful': 'Ratée',
    'KeyPass': 'Passe clé',
    'Assist': 'Passe décisive',
    'IntentionalAssist': 'Passe décisive intentionnelle',
    'BigChanceCreated': 'Grosse occasion créée',
    'Longball': 'Long ballon',
    'Cross': 'Centre',
    'Throughball': 'Passe en profondeur',
    'Chipped': 'Lobée',
    'Head': 'Tête',
    'LeftFoot': 'Pied gauche',
    'RightFoot': 'Pied droit'
};

// Traduction des qualifiers
const QUALIFIER_TRANSLATIONS = {
    'Zone': 'Zone',
    'Back': 'Arrière',
    'Center': 'Centre',
    'Left': 'Gauche',
    'Right': 'Droite',
    'Offensive': 'Offensive',
    'Defensive': 'Défensive'
};

export class DataManager {
    constructor() {
        this.allEvents = [];
        this.meta = {};
        this.matchList = [];
    }

    // Traduire un nom d'événement
    translateEvent(eventName) {
        return EVENT_TRANSLATIONS[eventName] || eventName;
    }

    // Traduire un qualifier
    translateQualifier(qualifierName) {
        return QUALIFIER_TRANSLATIONS[qualifierName] || qualifierName;
    }

    setData(json) {
        this.meta = {
            name: json.player_name,
            matches: json.total_matches || 1,
            team: json.teams_played_for ? json.teams_played_for.join(', ') : 'Équipe',
            position: this.detectPosition(json.events),
            image: json.player_image_url || null
        };
        
        // Gestion des matchs
        if (json.matches_list && json.matches_list.length > 0) {
            this.matchList = json.matches_list.map(m => {
                const safeId = m.matchId ? m.matchId : m.date;
                const dateObj = new Date(m.date);
                const dateStr = !isNaN(dateObj) ? dateObj.toLocaleDateString('fr-FR') : m.date;
                
                return {
                    id: safeId,
                    label: `${dateStr} • vs ${m.opponent} (${m.score})`,
                    competition: m.competition,
                    fullDate: m.date
                };
            });
            this.matchList.sort((a, b) => new Date(b.fullDate) - new Date(a.fullDate));
        } else {
            this.extractMatchesFromEvents(json.events);
        }

        // Traitement des événements avec traduction
        this.allEvents = json.events.map(e => {
            let eMatchId = e.matchId || e.matchDate || 'unknown';
            
            // Traduire les types d'événements
            const translatedEvent = {
                ...e,
                matchId: eMatchId,
                typeFR: this.translateEvent(e.type?.displayName),
                outcomeTypeFR: this.translateEvent(e.outcomeType?.displayName)
            };

            // Traduire les qualifiers si présents
            if (e.qualifiers && e.qualifiers.length > 0) {
                translatedEvent.qualifiersFR = e.qualifiers.map(q => ({
                    ...q,
                    typeFR: this.translateQualifier(q.type?.displayName)
                }));
            }

            return translatedEvent;
        }).filter(e => e.x != null && e.y != null);
    }

    extractMatchesFromEvents(events) {
        const matchesMap = new Map();
        if (!events) return;

        events.forEach(e => {
            const mId = e.matchId || 'unknown';
            if (!matchesMap.has(mId)) {
                let label = `Match ${mId}`;
                if (mId === 'unknown') label = 'Match Unique';
                matchesMap.set(mId, { id: mId, label: label });
            }
        });
        this.matchList = Array.from(matchesMap.values());
    }

    getMatches() {
        return this.matchList;
    }

    detectPosition(events) {
        if (!events || events.length === 0) return 'Non défini';
        
        const avgX = events.reduce((sum, e) => sum + (e.x || 0), 0) / events.length;
        const defensiveActions = events.filter(e => 
            ['Tackle', 'Interception', 'Clearance'].includes(e.type?.displayName)
        ).length;
        
        if (avgX < 35) return defensiveActions > 5 ? 'Défenseur' : 'Milieu Défensif';
        if (avgX < 60) return 'Milieu';
        return 'Attaquant';
    }

    getFilteredEvents(filters) {
        return this.allEvents.filter(e => {
            // Filtre Match
            if (filters.matchIds && filters.matchIds.length > 0) {
                const currentId = String(e.matchId);
                const selectedIds = filters.matchIds.map(String);
                if (!selectedIds.includes(currentId)) return false;
            }

            // Filtre Temps
            const minute = e.expandedMinute || e.minute;
            if (minute < filters.timeRange[0] || minute > filters.timeRange[1]) return false;

            // Filtre Succès/Échec
            const isSuccess = e.outcomeType?.value === 1;
            if (isSuccess && !filters.success) return false;
            if (!isSuccess && !filters.failed) return false;

            // Filtre Zone
            if (filters.zone !== 'all') {
                if (filters.zone === 'def' && e.x > 33) return false;
                if (filters.zone === 'mid' && (e.x <= 33 || e.x >= 66)) return false;
                if (filters.zone === 'att' && e.x < 66) return false;
            }

            return true;
        });
    }

    getStats(events) {
        const passes = events.filter(e => e.type?.displayName === 'Pass');
        const passSuccess = passes.filter(e => e.outcomeType?.value === 1).length;
        
        const keyPasses = passes.filter(e => 
            e.qualifiers?.some(q => 
                ['KeyPass', 'Assist', 'IntentionalGoalAssist', 'BigChanceCreated'].includes(q.type?.displayName)
            )
        ).length;

        const dribbles = events.filter(e => e.type?.displayName === 'TakeOn');
        const dribbleSuccess = dribbles.filter(e => e.outcomeType?.value === 1).length;
        
        const shots = events.filter(e => 
            ['MissedShots', 'SavedShot', 'Goal', 'ShotOnPost'].includes(e.type?.displayName)
        );
        const goals = events.filter(e => e.type?.displayName === 'Goal').length;
        
        const xG = this.calculateXG(shots);
        
        const defenseEvents = events.filter(e => 
            ['Tackle', 'Interception', 'BallRecovery', 'Clearance'].includes(e.type?.displayName)
        );
        
        return {
            passing: {
                total: passes.length,
                success: passSuccess,
                rate: passes.length ? Math.round((passSuccess / passes.length) * 100) : 0,
                key: keyPasses
            },
            dribbling: {
                total: dribbles.length,
                success: dribbleSuccess,
                rate: dribbles.length ? Math.round((dribbleSuccess / dribbles.length) * 100) : 0
            },
            shooting: {
                total: shots.length,
                goals: goals,
                xg: xG.toFixed(2),
                accuracy: shots.length ? Math.round((goals / shots.length) * 100) : 0
            },
            defense: {
                total: defenseEvents.length,
                tackles: defenseEvents.filter(e => e.type?.displayName === 'Tackle').length,
                interceptions: defenseEvents.filter(e => e.type?.displayName === 'Interception').length,
                recoveries: defenseEvents.filter(e => e.type?.displayName === 'BallRecovery').length
            },
            overall: {
                touches: events.filter(e => e.isTouch).length
            }
        };
    }

    calculateXG(shots) {
        return shots.reduce((acc, shot) => {
            const dx = 100 - shot.x;
            const dy = Math.abs(50 - shot.y);
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Modèle xG simplifié
            let val = 0;
            if (distance < 10) val = 0.30;
            else if (distance < 20) val = 0.12;
            else val = 0.03;
            
            if (shot.type?.displayName === 'Goal') val = Math.max(val, 0.2);
            return acc + val;
        }, 0);
    }

    // Méthode pour obtenir un résumé textuel d'un événement
    getEventSummary(event) {
        let summary = event.typeFR || 'Action';
        
        if (event.outcomeTypeFR) {
            summary += ` (${event.outcomeTypeFR})`;
        }
        
        if (event.minute !== undefined) {
            summary += ` - ${event.minute}'`;
        }

        return summary;
    }
}