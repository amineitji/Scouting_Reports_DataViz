/**
 * src/js/shotmap.js
 * VERSION : HIGH CONTRAST (Ombres + Contours Blancs)
 */
import { Pitch } from './pitch.js';

export class ShotMap {
    constructor(containerId, events) {
        const container = d3.select(`#${containerId}`);
        let svgId = containerId;
        const node = container.node();
        
        if (node && node.tagName.toLowerCase() !== 'svg') {
            container.selectAll('*').remove();
            svgId = `${containerId}-svg`;
            container.append('svg')
                .attr('id', svgId)
                .style('width', '100%')
                .style('height', '100%')
                .style('display', 'block');
        }

        this.pitch = new Pitch(svgId);
        
        const safeEvents = events || [];
        this.shots = safeEvents.filter(e => 
            ['Goal', 'MissedShots', 'SavedShot', 'ShotOnPost', 'AttemptSaved'].includes(e.type?.displayName) || 
            e.isShot === true
        );

        this.tooltip = document.getElementById('tooltip');
        // On augmente la taille minimale des points (6px -> 18px)
        this.rScale = d3.scaleSqrt().domain([0, 1]).range([6, 18]);
        
        this.render();
    }

    render() {
        this.pitch.clearDataLayer();
        const g = this.pitch.getGroup();

        if (this.shots.length === 0) return;

        const maxX = d3.max(this.shots, d => parseFloat(d.x)) || 0;
        const multiplier = maxX <= 1.5 ? 100 : 1;

        // --- 1. AJOUT DU FILTRE D'OMBRE (DROP SHADOW) ---
        // C'est ça qui va faire ressortir les points du fond vert
        const defs = g.append('defs');
        const filter = defs.append('filter')
            .attr('id', 'drop-shadow')
            .attr('height', '130%');
        
        filter.append('feGaussianBlur')
            .attr('in', 'SourceAlpha')
            .attr('stdDeviation', 2) // Flou de l'ombre
            .attr('result', 'blur');

        filter.append('feOffset')
            .attr('in', 'blur')
            .attr('dx', 1) // Décalage X
            .attr('dy', 1) // Décalage Y
            .attr('result', 'offsetBlur');

        filter.append('feFlood')
            .attr('flood-color', 'rgba(0,0,0,0.6)') // Ombre noire semi-opaque
            .attr('result', 'color');

        filter.append('feComposite')
            .attr('in', 'color')
            .attr('in2', 'offsetBlur')
            .attr('operator', 'in')
            .attr('result', 'shadow');

        filter.append('feMerge')
            .call(merge => {
                merge.append('feMergeNode').attr('in', 'shadow');
                merge.append('feMergeNode').attr('in', 'SourceGraphic');
            });


        const trajectoriesGroup = g.append('g').attr('class', 'trajectories-layer');
        const shotsGroup = g.append('g').attr('class', 'shots-layer');

        this.shots.forEach(shot => {
            const details = this.getShotDetails(shot);
            
            let shotX = parseFloat(shot.x);
            let shotY = parseFloat(shot.y);
            
            if (isNaN(shotX) || isNaN(shotY)) return;

            shotX = shotX * multiplier;
            shotY = shotY * multiplier;

            const [x1, y1] = this.pitch.toPixels(shotX, shotY);

            // Trajectoires (Plus claires : Blanc cassé)
            if ((details.isGoal || shot.xG > 0.2) && shot.endX != null && shot.endY != null) {
                let endX = parseFloat(shot.endX);
                let endY = parseFloat(shot.endY);
                if (!isNaN(endX) && !isNaN(endY)) {
                    endX = endX * multiplier;
                    endY = endY * multiplier;
                    const [x2, y2] = this.pitch.toPixels(endX, endY);
                    
                    trajectoriesGroup.append('line')
                        .attr('x1', x1).attr('y1', y1)
                        .attr('x2', x2).attr('y2', y2)
                        .attr('stroke', 'rgba(255, 255, 255, 0.5)')
                        .attr('stroke-width', 1.5)
                        .attr('stroke-dasharray', '4,3');
                }
            }

            // Points
            let xGVal = parseFloat(shot.xG || shot.statisticallyExpectedGoals || 0.05);
            if (isNaN(xGVal)) xGVal = 0.05;

            const radius = this.rScale(xGVal);

            const shotNode = shotsGroup.append('circle')
                .attr('cx', x1)
                .attr('cy', y1)
                .attr('r', radius)
                .attr('fill', details.fill)
                .attr('stroke', details.stroke)
                .attr('stroke-width', details.strokeWidth)
                .attr('fill-opacity', details.opacity)
                .style('cursor', 'pointer')
                .style('filter', 'url(#drop-shadow)'); // APPLIQUER L'OMBRE ICI

            // Interactions
            shotNode.on('mouseover', (e) => {
                d3.select(e.currentTarget)
                    .transition().duration(200)
                    .attr('r', radius * 1.3)
                    .attr('stroke', 'white') 
                    .attr('stroke-width', 3)
                    .attr('fill-opacity', 1);
                
                this.showTooltip(e, shot, details, xGVal);
            })
            .on('mouseout', (e) => {
                d3.select(e.currentTarget)
                    .transition().duration(200)
                    .attr('r', radius)
                    .attr('stroke', details.stroke)
                    .attr('stroke-width', details.strokeWidth)
                    .attr('fill-opacity', details.opacity);
                
                if (this.tooltip) this.tooltip.style.display = 'none';
            });
        });

        this.addLegend(g);
    }

    getShotDetails(shot) {
        const type = shot.type?.displayName;
        
        // --- PALETTE HAUTE VISIBILITÉ ---
        const BLUE = '#3b82f6';
        const GREY = '#94a3b8';
        const WHITE = '#ffffff';
        const GOLD = '#fbbf24';

        // 1. BUT : Bleu plein + Contour Blanc ÉPAIS
        if (type === 'Goal') {
            return { 
                color: BLUE, 
                fill: BLUE, 
                stroke: WHITE, 
                strokeWidth: 2.5, 
                opacity: 1, 
                label: 'But', 
                isGoal: true, 
                showGoalMouth: true 
            };
        }
        
        // 2. CADRÉ / ARRÊTÉ : Anneau Bleu ÉPAIS + Fond légèrement teinté
        if (type === 'SavedShot' || type === 'AttemptSaved') {
            return { 
                color: BLUE, 
                fill: 'rgba(59, 130, 246, 0.2)', // Fond bleu très léger (20%) pour ne pas voir l'herbe à travers
                stroke: BLUE, 
                strokeWidth: 3, // Très visible
                opacity: 1, 
                label: 'Arrêté / Cadré', 
                isGoal: false, 
                showGoalMouth: true 
            };
        }
        
        // 3. POTEAU : Or
        if (type === 'ShotOnPost') {
            return { 
                color: GOLD, 
                fill: 'rgba(251, 191, 36, 0.2)', 
                stroke: GOLD, 
                strokeWidth: 3, 
                opacity: 1, 
                label: 'Poteau', 
                isGoal: false, 
                showGoalMouth: false 
            };
        }
        
        // 4. NON CADRÉ : Gris + CONTOUR BLANC (Crucial pour le contraste)
        return { 
            color: GREY, 
            fill: GREY, 
            stroke: 'rgba(255, 255, 255, 0.7)', // Contour blanc semi-transparent
            strokeWidth: 1.5, 
            opacity: 0.8, // Plus opaque qu'avant
            label: 'Non Cadré', 
            isGoal: false, 
            showGoalMouth: false 
        };
    }

    showTooltip(e, shot, details, xG) {
        if (!this.tooltip) return;
        
        const tooltipWidth = 220; 
        let leftPos = e.pageX + 20;
        if (leftPos + tooltipWidth > window.innerWidth) {
            leftPos = e.pageX - tooltipWidth - 20;
        }

        this.tooltip.style.display = 'block';
        this.tooltip.style.left = leftPos + 'px';
        this.tooltip.style.top = (e.pageY - 20) + 'px';

        const qualifiers = shot.qualifiers || [];
        let bodyPart = 'Inconnu';
        if (qualifiers.some(q => q.type?.displayName === 'Head')) bodyPart = 'Tête';
        else if (qualifiers.some(q => q.type?.displayName === 'RightFoot')) bodyPart = 'Pied Droit';
        else if (qualifiers.some(q => q.type?.displayName === 'LeftFoot')) bodyPart = 'Pied Gauche';

        let content = `
            <div style="min-width: 200px;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <div style="width: 14px; height: 14px; background: ${details.fill}; border: 2px solid ${details.stroke}; border-radius: 50%;"></div>
                    <strong style="font-size: 1.1rem; color:white;">${details.label}</strong>
                    ${details.isGoal ? '<span style="font-size:1.2rem">⚽</span>' : ''}
                </div>
                <div style="display: flex; flex-direction: column; gap: 6px; font-size: 0.95rem;">
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: #94a3b8;">Minute:</span>
                        <strong style="color:white;">${shot.minute}'</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items:center;">
                        <span style="color: #94a3b8;">xG:</span>
                        <div style="display:flex; align-items:center; gap:6px;">
                            <strong style="color: ${xG > 0.3 ? '#60a5fa' : 'white'}; font-size:1.05rem;">${xG.toFixed(2)}</strong>
                        </div>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: #94a3b8;">Type:</span>
                        <strong style="color:white;">${bodyPart}</strong>
                    </div>
        `;

        if (details.showGoalMouth) {
            content += this.getGoalMouthVis(shot, details.color);
        }

        content += `</div></div>`;
        this.tooltip.innerHTML = content;
    }

    getGoalMouthVis(shot, color) {
        let gmY = shot.goalMouthY;
        let gmZ = shot.goalMouthZ;

        if (gmY == null || gmZ == null) return '';
        gmY = parseFloat(gmY);
        gmZ = parseFloat(gmZ);
        if (isNaN(gmY) || isNaN(gmZ)) return '';

        if (gmY <= 1 && gmZ <= 1) { gmY *= 100; gmZ *= 100; }

        const width = 180;
        const height = 60;

        const scaleY = d3.scaleLinear().domain([44, 56]).range([0, width]);
        const scaleZ = d3.scaleLinear().domain([0, 40]).range([height, 0]);

        const ballX = scaleY(gmY);
        const ballY = scaleZ(gmZ);
        const clampedX = Math.max(5, Math.min(width - 5, ballX));
        const clampedY = Math.max(5, Math.min(height - 5, ballY));

        return `
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1);">
                <strong style="font-size: 0.9rem; color: #cbd5e1; display:block; margin-bottom:8px;">Placement :</strong>
                <svg width="${width}" height="${height + 5}" style="display:block; margin:auto; overflow:visible;">
                    <rect x="2" y="2" width="${width - 4}" height="${height}" fill="rgba(0,0,0,0.4)" stroke="#cbd5e1" stroke-width="2"/>
                    <line x1="0" y1="${height + 2}" x2="${width}" y2="${height + 2}" stroke="#cbd5e1" stroke-width="3" stroke-linecap="round"/>
                    <circle cx="${clampedX}" cy="${clampedY}" r="7" fill="${color}" stroke="white" stroke-width="2" style="filter: drop-shadow(0 0 4px ${color});"/>
                </svg>
            </div>
        `;
    }

    addLegend(g) {
        const legendX = this.pitch.margin + 20;
        const legendY = this.pitch.margin + 20;

        // Fond plus opaque
        g.append('rect')
            .attr('x', legendX - 15)
            .attr('y', legendY - 15)
            .attr('width', 180)
            .attr('height', 140)
            .attr('fill', '#0f172a') 
            .attr('rx', 8)
            .attr('stroke', '#3b82f6')
            .attr('stroke-width', 1)
            .style('filter', 'url(#drop-shadow)'); // Ombre sur la légende aussi

        g.append('text')
            .attr('x', legendX)
            .attr('y', legendY + 5)
            .attr('fill', '#ffffff')
            .style('font-size', '14px')
            .style('font-weight', '700')
            .style('text-transform', 'uppercase')
            .style('letter-spacing', '1px')
            .text('Carte des tirs');

        const items = [
            { y: 35, fill: '#3b82f6', stroke: '#ffffff', strokeWidth: 2, text: 'But' },
            { y: 65, fill: 'rgba(59, 130, 246, 0.2)', stroke: '#3b82f6', strokeWidth: 3, text: 'Arrêté / Cadré' },
            { y: 95, fill: '#94a3b8', stroke: 'rgba(255,255,255,0.7)', strokeWidth: 1.5, text: 'Non Cadré' }
        ];

        items.forEach(item => {
            const yPos = legendY + item.y;
            
            g.append('circle')
                .attr('cx', legendX + 10)
                .attr('cy', yPos - 4)
                .attr('r', 7)
                .attr('fill', item.fill)
                .attr('stroke', item.stroke)
                .attr('stroke-width', item.strokeWidth);

            g.append('text')
                .attr('x', legendX + 30)
                .attr('y', yPos)
                .attr('fill', '#e2e8f0')
                .style('font-size', '12px')
                .text(item.text);
        });
        
        g.append('text')
            .attr('x', legendX + 10)
            .attr('y', legendY + 115)
            .attr('fill', '#94a3b8')
            .style('font-size', '10px')
            .style('font-style', 'italic')
            .text('Taille du point = Valeur xG');
    }
}