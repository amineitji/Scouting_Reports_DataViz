export class DataManager {
    constructor() {
        this.allEvents = [];
        this.meta = {};
    }

    setData(json) {
        this.meta = {
            name: json.player_name,
            matches: json.total_matches || 1,
            team: json.match_info?.home || 'Équipe',
            position: 'Attaquant' // Simplifié, à extraire si dispo
        };
        // Nettoyage initial
        this.allEvents = json.events.filter(e => e.x != null && e.y != null);
    }

    getFilteredEvents(filters) {
        return this.allEvents.filter(e => {
            // Filtre Temps
            const minute = e.expandedMinute || e.minute;
            if (minute < filters.timeRange[0] || minute > filters.timeRange[1]) return false;

            // Filtre Succès/Échec
            const isSuccess = e.outcomeType.value === 1;
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
        // Calculs basiques
        const passes = events.filter(e => e.type.displayName === 'Pass');
        const passSuccess = passes.filter(e => e.outcomeType.value === 1).length;

        const dribbles = events.filter(e => e.type.displayName === 'TakeOn');
        const shots = events.filter(e => ['MissedShots', 'SavedShot', 'Goal'].includes(e.type.displayName));
        
        // Estimation xG très naïve (basée sur la distance au but)
        // But est à (100, 50). Distance max ~110.
        const xG = shots.reduce((acc, s) => {
            const dist = Math.sqrt(Math.pow(100 - s.x, 2) + Math.pow(50 - s.y, 2));
            const prob = dist > 30 ? 0.02 : (dist > 15 ? 0.07 : 0.15); // Modèle simplifié
            return acc + prob;
        }, 0).toFixed(2);

        const tackles = events.filter(e => e.type.displayName === 'Tackle');
        const interceptions = events.filter(e => e.type.displayName === 'Interception');
        const recoveries = events.filter(e => e.type.displayName === 'BallRecovery');

        return {
            passing: {
                total: passes.length,
                success: passSuccess,
                rate: passes.length ? ((passSuccess / passes.length) * 100).toFixed(0) : 0
            },
            dribbling: {
                total: dribbles.length,
                success: dribbles.filter(e => e.outcomeType.value === 1).length
            },
            shooting: {
                total: shots.length,
                xg: xG
            },
            defense: {
                tackles: tackles.length,
                interceptions: interceptions.length,
                recoveries: recoveries.length
            }
        };
    }
}