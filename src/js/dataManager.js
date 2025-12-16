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
            position: this.detectPosition(json.events)
        };
        
        this.allEvents = json.events.filter(e => e.x != null && e.y != null);
    }

    detectPosition(events) {
        if (!events || events.length === 0) return 'N/A';
        
        const avgX = events.reduce((sum, e) => sum + (e.x || 0), 0) / events.length;
        const defensive = events.filter(e => ['Tackle', 'Interception', 'Clearance'].includes(e.type?.displayName)).length;
        const offensive = events.filter(e => ['MissedShots', 'Goal', 'SavedShot'].includes(e.type?.displayName)).length;
        
        if (avgX < 35) return defensive > 5 ? 'Défenseur' : 'Milieu Défensif';
        if (avgX < 65) return 'Milieu';
        return offensive > 3 ? 'Attaquant' : 'Milieu Offensif';
    }

    getFilteredEvents(filters) {
        return this.allEvents.filter(e => {
            const minute = e.expandedMinute || e.minute;
            if (minute < filters.timeRange[0] || minute > filters.timeRange[1]) return false;

            const isSuccess = e.outcomeType?.value === 1;
            if (isSuccess && !filters.success) return false;
            if (!isSuccess && !filters.failed) return false;

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
            e.qualifiers?.some(q => ['KeyPass', 'Assist', 'IntentionalGoalAssist'].includes(q.type?.displayName))
        ).length;

        const dribbles = events.filter(e => e.type?.displayName === 'TakeOn');
        const dribbleSuccess = dribbles.filter(e => e.outcomeType?.value === 1).length;
        
        const shots = events.filter(e => 
            ['MissedShots', 'SavedShot', 'Goal', 'ShotOnPost'].includes(e.type?.displayName)
        );
        
        const goals = events.filter(e => e.type?.displayName === 'Goal').length;
        
        // xG calculation amélioré
        const xG = this.calculateXG(shots);
        
        const tackles = events.filter(e => e.type?.displayName === 'Tackle');
        const interceptions = events.filter(e => e.type?.displayName === 'Interception');
        const recoveries = events.filter(e => e.type?.displayName === 'BallRecovery');
        
        // Passes progressives (> 10m vers l'avant)
        const progressivePasses = passes.filter(e => {
            if (!e.endX) return false;
            const dx = e.endX - e.x;
            const dist = Math.abs(dx) * 1.05; // en mètres
            return dx > 0 && dist > 10;
        }).length;

        return {
            passing: {
                total: passes.length,
                success: passSuccess,
                rate: passes.length ? Math.round((passSuccess / passes.length) * 100) : 0,
                key: keyPasses,
                progressive: progressivePasses
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
                tackles: tackles.length,
                tacklesWon: tackles.filter(e => e.outcomeType?.value === 1).length,
                interceptions: interceptions.length,
                recoveries: recoveries.length
            },
            overall: {
                touches: events.filter(e => e.isTouch).length,
                duels: events.filter(e => ['Tackle', 'TakeOn', 'Aerial'].includes(e.type?.displayName)).length
            }
        };
    }

    calculateXG(shots) {
        return shots.reduce((acc, shot) => {
            // Distance au but
            const dx = 100 - shot.x;
            const dy = Math.abs(50 - shot.y);
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Angle de tir
            const angle = Math.atan2(dy, dx);
            
            // Modèle simplifié xG
            let xg = 0;
            
            // Base sur distance
            if (distance < 10) xg = 0.35;
            else if (distance < 15) xg = 0.18;
            else if (distance < 20) xg = 0.10;
            else if (distance < 30) xg = 0.05;
            else xg = 0.02;
            
            // Bonus angle central
            if (angle < 0.3) xg *= 1.5;
            
            // Bonus si c'est un but (rétro-ajustement)
            if (shot.type?.displayName === 'Goal') xg = Math.max(xg, 0.15);
            
            // Bonus grandes occasions
            const isBigChance = shot.qualifiers?.some(q => q.type?.displayName === 'BigChance');
            if (isBigChance) xg *= 1.8;
            
            return acc + xg;
        }, 0);
    }

    getEventsByMinute() {
        const byMinute = {};
        
        this.allEvents.forEach(e => {
            const min = e.minute || 0;
            if (!byMinute[min]) byMinute[min] = [];
            byMinute[min].push(e);
        });
        
        return byMinute;
    }

    getHeatmapData() {
        return this.allEvents
            .filter(e => e.isTouch)
            .map(e => ({ x: e.x, y: e.y }));
    }

    getPassNetwork() {
        const passes = this.allEvents.filter(e => 
            e.type?.displayName === 'Pass' && e.endX != null && e.outcomeType?.value === 1
        );
        
        return passes.map(p => ({
            from: { x: p.x, y: p.y },
            to: { x: p.endX, y: p.endY },
            success: p.outcomeType?.value === 1,
            length: Math.sqrt(Math.pow((p.endX - p.x) * 1.05, 2) + Math.pow((p.endY - p.y) * 0.68, 2))
        }));
    }
}