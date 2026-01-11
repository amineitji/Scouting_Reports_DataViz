/**
 * zoneAnalysis.js
 */

export class ZoneAnalysis {
    constructor(containerId) {
        this.containerId = containerId;
        this.margin = 15;
        this.rows = 3;
        this.cols = 4;
        this.colors = {
            hot: d3.interpolateOrRd,
            cold: d3.interpolateBlues
        };
    }

    update(events) {
        const container = document.getElementById(this.containerId);
        if (!container || !events || events.length === 0) {
            this.showEmptyMessage(container);
            return;
        }

        container.innerHTML = '';

        // Wrapper principal
        const wrapper = document.createElement('div');
        wrapper.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 15px;
            width: 100%;
            height: 100%;
            padding: 15px;
            box-sizing: border-box;
        `;
        container.appendChild(wrapper);

        // Calculer les statistiques par zone
        const zoneStats = this.calculateZoneStats(events);

        // Header avec stats globales
        this.addStatsHeader(wrapper, zoneStats);

        // Conteneur du terrain
        const pitchContainer = document.createElement('div');
        pitchContainer.id = 'zone-pitch-container';
        pitchContainer.style.cssText = `
            flex: 1;
            background: rgba(15, 23, 42, 0.6);
            backdrop-filter: blur(10px);
            border-radius: 16px;
            border: 1px solid rgba(59, 130, 246, 0.2);
            padding: 20px;
            position: relative;
            min-height: 0;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        wrapper.appendChild(pitchContainer);

        // Calculer dimensions
        const containerRect = pitchContainer.getBoundingClientRect();
        const width = Math.max(containerRect.width || 700, 500);
        const height = Math.max(containerRect.height || 450, 350);

        const svg = d3.select(pitchContainer)
            .append("svg")
            .attr("viewBox", `0 0 ${width} ${height}`)
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("preserveAspectRatio", "xMidYMid meet");

        const pitch = svg.append("g")
            .attr("transform", `translate(${this.margin}, ${this.margin})`);

        const W = width - this.margin * 2;
        const H = height - this.margin * 2;

        // Dessiner le terrain avec proportions réalistes
        const pitchInfo = this.drawPitch(pitch, W, H);

        // Dessiner les zones avec heatmap sur le terrain réaliste
        this.drawZones(pitchInfo.pitchGroup, pitchInfo.pitchW, pitchInfo.pitchH, zoneStats);

        // Ajouter légende et contrôles
        this.addLegend(wrapper, zoneStats);
    }

    calculateZoneStats(events) {
        const zoneW = 100 / this.cols;
        const zoneH = 100 / this.rows;
        
        const zones = Array.from({ length: this.rows * this.cols }, (_, i) => ({
            id: i,
            count: 0,
            pct: 0,
            passes: 0,
            shots: 0,
            dribbles: 0,
            defensive: 0,
            successRate: 0,
            events: []
        }));

        // Agréger les événements par zone
        events.forEach(e => {
            if (e.x == null || e.y == null) return;

            const x = e.x;
            const y = 100 - e.y;

            const col = Math.min(Math.floor(x / zoneW), this.cols - 1);
            const row = Math.min(Math.floor(y / zoneH), this.rows - 1);
            const zoneId = row * this.cols + col;

            if (zoneId >= 0 && zoneId < zones.length) {
                zones[zoneId].count++;
                zones[zoneId].events.push(e);

                const type = e.type?.displayName;
                if (type === 'Pass') zones[zoneId].passes++;
                else if (['MissedShots', 'SavedShot', 'Goal', 'ShotOnPost'].includes(type))
                    zones[zoneId].shots++;
                else if (type === 'TakeOn') zones[zoneId].dribbles++;
                else if (['Tackle', 'Interception', 'BallRecovery', 'Clearance'].includes(type))
                    zones[zoneId].defensive++;
            }
        });

        // Calculer les pourcentages et taux de réussite
        const total = d3.sum(zones, d => d.count) || 1;
        zones.forEach(z => {
            z.pct = (z.count / total) * 100;
            
            const successful = z.events.filter(e => e.outcomeType?.value === 1).length;
            z.successRate = z.count > 0 ? (successful / z.count) * 100 : 0;
        });

        return {
            zones,
            total,
            maxPct: d3.max(zones, d => d.pct) || 0,
            hotZone: zones.reduce((max, z) => z.count > max.count ? z : max, zones[0]),
            avgSuccessRate: d3.mean(zones.filter(z => z.count > 0), z => z.successRate) || 0
        };
    }

    drawPitch(pitch, W, H) {
        // Calculer les dimensions réalistes du terrain (ratio 105m x 68m = 1.54:1)
        const targetRatio = 105 / 68; // ~1.544
        const currentRatio = W / H;
        
        let pitchW, pitchH, offsetX, offsetY;
        
        if (currentRatio > targetRatio) {
            // Conteneur plus large : limiter par la hauteur
            pitchH = H;
            pitchW = H * targetRatio;
            offsetX = (W - pitchW) / 2;
            offsetY = 0;
        } else {
            // Conteneur plus haut : limiter par la largeur
            pitchW = W;
            pitchH = W / targetRatio;
            offsetX = 0;
            offsetY = (H - pitchH) / 2;
        }

        // Groupe du terrain centré
        const pitchGroup = pitch.append("g")
            .attr("transform", `translate(${offsetX}, ${offsetY})`);

        // Fond pelouse avec proportions réalistes
        pitchGroup.append("rect")
            .attr("width", pitchW)
            .attr("height", pitchH)
            .attr("rx", 12)
            .attr("fill", "#14532d")
            .attr("stroke", "rgba(255,255,255,0.3)")
            .attr("stroke-width", 2);

        // Lignes du terrain
        const lines = pitchGroup.append("g")
            .attr("stroke", "rgba(255,255,255,0.7)")
            .attr("fill", "none")
            .attr("stroke-width", 2.5);

        // Contour
        lines.append("rect")
            .attr("width", pitchW)
            .attr("height", pitchH)
            .attr("rx", 12);

        // Ligne médiane
        lines.append("line")
            .attr("x1", pitchW / 2)
            .attr("y1", 0)
            .attr("x2", pitchW / 2)
            .attr("y2", pitchH);

        // Cercle central (rayon 9.15m sur 105m = 8.7%)
        const centerRadius = pitchW * 0.087;
        lines.append("circle")
            .attr("cx", pitchW / 2)
            .attr("cy", pitchH / 2)
            .attr("r", centerRadius)
            .attr("opacity", 0.8);

        lines.append("circle")
            .attr("cx", pitchW / 2)
            .attr("cy", pitchH / 2)
            .attr("r", 3)
            .attr("fill", "white");

        // Surfaces de réparation (16.5m sur 105m = 15.7%, largeur 40.32m sur 68m = 59.3%)
        const boxW = pitchW * 0.157;
        const boxH = pitchH * 0.593;

        lines.append("rect")
            .attr("x", 0)
            .attr("y", (pitchH - boxH) / 2)
            .attr("width", boxW)
            .attr("height", boxH);

        lines.append("rect")
            .attr("x", pitchW - boxW)
            .attr("y", (pitchH - boxH) / 2)
            .attr("width", boxW)
            .attr("height", boxH);

        // Surfaces de but (5.5m sur 105m = 5.2%, largeur 18.32m sur 68m = 26.9%)
        const smallBoxW = pitchW * 0.052;
        const smallBoxH = pitchH * 0.269;

        lines.append("rect")
            .attr("x", 0)
            .attr("y", (pitchH - smallBoxH) / 2)
            .attr("width", smallBoxW)
            .attr("height", smallBoxH);

        lines.append("rect")
            .attr("x", pitchW - smallBoxW)
            .attr("y", (pitchH - smallBoxH) / 2)
            .attr("width", smallBoxW)
            .attr("height", smallBoxH);

        // Points de penalty (11m sur 105m = 10.5%)
        const penaltySpot = pitchW * 0.105;
        lines.append("circle")
            .attr("cx", penaltySpot)
            .attr("cy", pitchH / 2)
            .attr("r", 2.5)
            .attr("fill", "white");

        lines.append("circle")
            .attr("cx", pitchW - penaltySpot)
            .attr("cy", pitchH / 2)
            .attr("r", 2.5)
            .attr("fill", "white");

        // Arcs de cercle des surfaces (rayon 9.15m)
        const arcRadius = centerRadius;
        
        // Arc gauche
        const arcLeft = d3.path();
        arcLeft.arc(penaltySpot, pitchH / 2, arcRadius, -Math.PI/2.5, Math.PI/2.5);
        lines.append("path")
            .attr("d", arcLeft.toString())
            .attr("fill", "none");

        // Arc droit
        const arcRight = d3.path();
        arcRight.arc(pitchW - penaltySpot, pitchH / 2, arcRadius, Math.PI - Math.PI/2.5, Math.PI + Math.PI/2.5);
        lines.append("path")
            .attr("d", arcRight.toString())
            .attr("fill", "none");

        // Flèche de direction
        this.drawDirectionArrow(pitchGroup, pitchW, pitchH);

        // Retourner les dimensions et offsets pour les zones
        return { pitchW, pitchH, offsetX, offsetY, pitchGroup };
    }

    drawDirectionArrow(pitch, W, H) {
        const arrowG = pitch.append("g")
            .attr("class", "direction-arrow")
            .attr("opacity", 0.7);

        const y = H - 15;
        const centerX = W / 2;

        // Ligne
        arrowG.append("line")
            .attr("x1", centerX - 70)
            .attr("y1", y)
            .attr("x2", centerX + 70)
            .attr("y2", y)
            .attr("stroke", "white")
            .attr("stroke-width", 3)
            .attr("stroke-linecap", "round");

        // Pointe
        arrowG.append("polygon")
            .attr("points", `
                ${centerX + 70},${y}
                ${centerX + 60},${y - 6}
                ${centerX + 60},${y + 6}
            `)
            .attr("fill", "white");

        // Texte
        arrowG.append("text")
            .attr("x", centerX)
            .attr("y", y - 12)
            .attr("text-anchor", "middle")
            .attr("fill", "white")
            .style("font-size", "11px")
            .style("font-weight", "700")
            .style("letter-spacing", "1px")
            .text("SENS DU JEU");
    }

    drawZones(pitch, W, H, zoneStats) {
        const zoneW = W / this.cols;
        const zoneH = H / this.rows;

        const colorScale = d3.scaleSequential()
            .domain([0, zoneStats.maxPct])
            .interpolator(this.colors.hot);

        const heat = pitch.append("g").attr("class", "heat-zones");

        // Tooltip
        const tooltip = d3.select('body')
            .append('div')
            .attr('class', 'zone-tooltip-advanced')
            .style('position', 'absolute')
            .style('display', 'none')
            .style('background', 'rgba(15, 23, 42, 0.98)')
            .style('color', 'white')
            .style('padding', '16px 20px')
            .style('border-radius', '12px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('z-index', '10000')
            .style('border', '1px solid rgba(59, 130, 246, 0.4)')
            .style('box-shadow', '0 10px 40px rgba(0,0,0,0.6)')
            .style('backdrop-filter', 'blur(20px)')
            .style('min-width', '250px');

        // Dessiner les rectangles de zone
        zoneStats.zones.forEach(zone => {
            const col = zone.id % this.cols;
            const row = Math.floor(zone.id / this.cols);
            const x = col * zoneW;
            const y = row * zoneH;

            // Rectangle de zone avec animation
            const rect = heat.append("rect")
                .attr("class", "zone-rect")
                .attr("x", x)
                .attr("y", y)
                .attr("width", zoneW)
                .attr("height", zoneH)
                .attr("fill", colorScale(zone.pct))
                .attr("opacity", 0)
                .attr("stroke", "rgba(255,255,255,0.2)")
                .attr("stroke-width", 1)
                .style("cursor", "pointer");

            // Animation d'entrée
            rect.transition()
                .duration(600)
                .delay(zone.id * 30)
                .attr("opacity", 0.75);

            // Texte du pourcentage
            const text = heat.append("text")
                .attr("class", "zone-text")
                .attr("x", x + zoneW / 2)
                .attr("y", y + zoneH / 2)
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "middle")
                .attr("fill", "white")
                .style("font-size", Math.min(zoneW, zoneH) * 0.15 + "px")
                .style("font-weight", "800")
                .style("text-shadow", "0 2px 8px rgba(0,0,0,0.8)")
                .style("pointer-events", "none")
                .attr("opacity", 0)
                .text(zone.count > 0 ? `${zone.pct.toFixed(1)}%` : '—');

            text.transition()
                .duration(600)
                .delay(zone.id * 30 + 200)
                .attr("opacity", zone.count > 0 ? 1 : 0.3);

            // Badge d'actions si zone active
            if (zone.count > 5) {
                const badge = heat.append("text")
                    .attr("x", x + zoneW / 2)
                    .attr("y", y + zoneH / 2 + Math.min(zoneW, zoneH) * 0.12)
                    .attr("text-anchor", "middle")
                    .attr("fill", "#eab308")
                    .style("font-size", Math.min(zoneW, zoneH) * 0.08 + "px")
                    .style("font-weight", "600")
                    .style("pointer-events", "none")
                    .attr("opacity", 0)
                    .text(`${zone.count} actions`);

                badge.transition()
                    .duration(600)
                    .delay(zone.id * 30 + 400)
                    .attr("opacity", 0.9);
            }

            // Interactions
            rect.on('mouseenter', (event) => {
                rect.transition()
                    .duration(200)
                    .attr("opacity", 0.95)
                    .attr("stroke", "#60a5fa")
                    .attr("stroke-width", 3);

                text.transition()
                    .duration(200)
                    .style("font-size", Math.min(zoneW, zoneH) * 0.18 + "px");

                this.showZoneTooltip(event, zone, tooltip);
            });

            rect.on('mouseleave', () => {
                rect.transition()
                    .duration(200)
                    .attr("opacity", 0.75)
                    .attr("stroke", "rgba(255,255,255,0.2)")
                    .attr("stroke-width", 1);

                text.transition()
                    .duration(200)
                    .style("font-size", Math.min(zoneW, zoneH) * 0.15 + "px");

                tooltip.style('display', 'none');
            });

            rect.on('mousemove', (event) => {
                tooltip
                    .style('left', (event.pageX + 15) + 'px')
                    .style('top', (event.pageY - 10) + 'px');
            });
        });
    }

    showZoneTooltip(event, zone, tooltip) {
        const zoneLabels = this.getZoneLabel(zone.id);
        const dominance = this.getDominanceType(zone);

        tooltip
            .style('display', 'block')
            .html(`
                <div style="border-bottom: 2px solid rgba(59,130,246,0.4); padding-bottom: 10px; margin-bottom: 10px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 15px;">
                        <strong style="font-size: 16px; color: #60a5fa;">${zoneLabels.name}</strong>
                        <span style="background: ${dominance.color}33; color: ${dominance.color}; padding: 4px 10px; border-radius: 6px; font-size: 10px; font-weight: 700;">
                            ${dominance.label}
                        </span>
                    </div>
                    <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">${zoneLabels.description}</div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px 16px; font-size: 11px; margin-bottom: 10px;">
                    <div style="display: flex; flex-direction: column; gap: 2px;">
                        <span style="color: #94a3b8;">Activité</span>
                        <strong style="color: white; font-size: 15px;">${zone.pct.toFixed(1)}%</strong>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 2px;">
                        <span style="color: #94a3b8;">Actions</span>
                        <strong style="color: white; font-size: 15px;">${zone.count}</strong>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 2px;">
                        <span style="color: #94a3b8;">Réussite</span>
                        <strong style="color: ${zone.successRate > 70 ? '#22c55e' : zone.successRate > 50 ? '#eab308' : '#ef4444'}; font-size: 15px;">
                            ${zone.successRate.toFixed(0)}%
                        </strong>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 2px;">
                        <span style="color: #94a3b8;">Type</span>
                        <strong style="color: white; font-size: 15px;">${dominance.emoji}</strong>
                    </div>
                </div>

                <div style="padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1);">
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 10px;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <div style="width: 6px; height: 6px; background: #3b82f6; border-radius: 50%;"></div>
                            <span style="color: #cbd5e1;">Passes</span>
                            <strong style="margin-left: auto; color: white;">${zone.passes}</strong>
                        </div>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <div style="width: 6px; height: 6px; background: #ef4444; border-radius: 50%;"></div>
                            <span style="color: #cbd5e1;">Tirs</span>
                            <strong style="margin-left: auto; color: white;">${zone.shots}</strong>
                        </div>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <div style="width: 6px; height: 6px; background: #22c55e; border-radius: 50%;"></div>
                            <span style="color: #cbd5e1;">Dribbles</span>
                            <strong style="margin-left: auto; color: white;">${zone.dribbles}</strong>
                        </div>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <div style="width: 6px; height: 6px; background: #8b5cf6; border-radius: 50%;"></div>
                            <span style="color: #cbd5e1;">Défense</span>
                            <strong style="margin-left: auto; color: white;">${zone.defensive}</strong>
                        </div>
                    </div>
                </div>
            `);
    }

    getZoneLabel(zoneId) {
        const col = zoneId % this.cols;
        const row = Math.floor(zoneId / this.cols);

        // ORIENTATION: Le terrain est en mode PAYSAGE, attaque vers la DROITE
        // Les colonnes représentent la progression longitudinale (Défensif → Offensif)
        // Les lignes représentent la position latérale du point de vue TV:
        //   - row 0 (Haut visuel) = Côté GAUCHE du terrain
        //   - row 2 (Bas visuel) = Côté DROIT du terrain
        
        const longitudinal = col === 0 ? 'Défensif' : col === 1 ? 'Défensif Centre' : col === 2 ? 'Offensif Centre' : 'Offensif';
        const lateral = row === 0 ? 'Gauche' : row === 1 ? 'Centre' : 'Droit';

        const descriptions = {
            0: 'Zone défensive gauche - Construction arrière côté gauche',
            1: 'Zone défensive centre-gauche - Relance axe gauche',
            2: 'Zone offensive centre-gauche - Approche finale gauche',
            3: 'Zone offensive gauche - Finition couloir gauche',
            4: 'Zone défensive centrale - Construction axiale',
            5: 'Zone défensive centre - Cœur défensif',
            6: 'Zone offensive centre - Cœur offensif',
            7: 'Zone offensive centrale - Finition centrale',
            8: 'Zone défensive droite - Construction arrière côté droit',
            9: 'Zone défensive centre-droit - Relance axe droit',
            10: 'Zone offensive centre-droit - Approche finale droite',
            11: 'Zone offensive droite - Finition couloir droit'
        };

        return {
            name: `${longitudinal} ${lateral}`,
            description: descriptions[zoneId] || 'Zone de jeu'
        };
    }

    getDominanceType(zone) {
        const total = zone.passes + zone.shots + zone.dribbles + zone.defensive;
        if (total === 0) return { label: 'Inactif', color: '#64748b', emoji: '—' };

        const max = Math.max(zone.passes, zone.shots, zone.dribbles, zone.defensive);

        if (zone.passes === max) return { label: 'Construction', color: '#3b82f6', emoji: '🎯' };
        if (zone.shots === max) return { label: 'Finition', color: '#ef4444', emoji: '⚽' };
        if (zone.dribbles === max) return { label: 'Dribbles', color: '#22c55e', emoji: '⚡' };
        if (zone.defensive === max) return { label: 'Défensif', color: '#8b5cf6', emoji: '🛡️' };

        return { label: 'Mixte', color: '#eab308', emoji: '🔄' };
    }

    addStatsHeader(wrapper, zoneStats) {
        const header = document.createElement('div');
        header.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 12px;
            width: 100%;
        `;

        const hotZone = zoneStats.hotZone;
        const hotZoneLabel = this.getZoneLabel(hotZone.id);

        const statCards = [
            { 
                label: 'Zone la + Active', 
                value: hotZoneLabel.name.split(' ')[0], 
                sub: `${hotZone.pct.toFixed(1)}%`,
                color: '#ef4444', 
                icon: '🔥' 
            },
            { 
                label: 'Total Actions', 
                value: zoneStats.total, 
                sub: `${zoneStats.zones.filter(z => z.count > 0).length}/${this.rows * this.cols} zones`,
                color: '#3b82f6', 
                icon: '📊' 
            },
            { 
                label: 'Taux Réussite Moy.', 
                value: `${zoneStats.avgSuccessRate.toFixed(0)}%`,
                sub: 'Toutes zones',
                color: '#22c55e', 
                icon: '✅' 
            },
            { 
                label: 'Zones Actives', 
                value: zoneStats.zones.filter(z => z.count > 5).length,
                sub: `+5 actions`,
                color: '#eab308', 
                icon: '⚡' 
            }
        ];

        statCards.forEach(stat => {
            const card = document.createElement('div');
            card.style.cssText = `
                background: rgba(15, 23, 42, 0.6);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(59, 130, 246, 0.2);
                border-radius: 10px;
                padding: 12px;
                display: flex;
                align-items: center;
                gap: 10px;
                transition: all 0.3s ease;
                min-height: 60px;
            `;

            card.innerHTML = `
                <div style="font-size: 1.8rem; opacity: 0.8; flex-shrink: 0;">${stat.icon}</div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 0.7rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${stat.label}
                    </div>
                    <div style="font-size: 1.3rem; font-weight: 700; color: ${stat.color}; margin-top: 2px;">
                        ${stat.value}
                    </div>
                    <div style="font-size: 0.65rem; color: #64748b; margin-top: 2px;">
                        ${stat.sub}
                    </div>
                </div>
            `;

            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-2px)';
                card.style.boxShadow = `0 8px 24px ${stat.color}33`;
                card.style.borderColor = stat.color;
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0)';
                card.style.boxShadow = 'none';
                card.style.borderColor = 'rgba(59, 130, 246, 0.2)';
            });

            header.appendChild(card);
        });

        wrapper.appendChild(header);
    }

    addLegend(wrapper, zoneStats) {
        const legendContainer = document.createElement('div');
        legendContainer.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
            padding: 12px;
            background: rgba(15, 23, 42, 0.4);
            border-radius: 12px;
            border: 1px solid rgba(59, 130, 246, 0.2);
        `;

        const legends = [
            { label: 'Très actif', color: '#dc2626', range: '> 12%' },
            { label: 'Actif', color: '#f97316', range: '8-12%' },
            { label: 'Modéré', color: '#fbbf24', range: '5-8%' },
            { label: 'Faible', color: '#fef3c7', range: '< 5%' }
        ];

        legends.forEach(legend => {
            const item = document.createElement('div');
            item.style.cssText = `
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 0.85rem;
            `;

            item.innerHTML = `
                <div style="width: 20px; height: 20px; background: ${legend.color}; border-radius: 4px; border: 1px solid rgba(255,255,255,0.3);"></div>
                <div style="flex: 1;">
                    <div style="color: white; font-weight: 600;">${legend.label}</div>
                    <div style="color: #94a3b8; font-size: 0.75rem;">${legend.range}</div>
                </div>
            `;

            legendContainer.appendChild(item);
        });

        wrapper.appendChild(legendContainer);
    }

    showEmptyMessage(container) {
        container.innerHTML = '';
        const div = document.createElement('div');
        div.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            text-align: center;
            color: #94a3b8;
            padding: 60px 20px;
        `;
        div.innerHTML = `
            <i class="fas fa-map-marked-alt" style="font-size: 4rem; margin-bottom: 20px; color: #475569; opacity: 0.5;"></i>
            <h3 style="font-size: 1.3rem; font-weight: 700; color: #cbd5e1; margin-bottom: 8px;">Aucune donnée</h3>
            <p style="font-size: 1rem; font-weight: 500;">Chargez un match pour voir l'analyse par zones</p>
        `;
        container.appendChild(div);
    }
}