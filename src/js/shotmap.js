/**
 * src/js/shotmap.js
 * VERSION : FINAL (High Contrast + Cage 3D + Tooltips Complets)
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
        // Taille des points basée sur le xG
        this.rScale = d3.scaleSqrt().domain([0, 1]).range([6, 18]);
        
        this.render();
    }

    render() {
        this.pitch.clearDataLayer();
        const g = this.pitch.getGroup();

        if (this.shots.length === 0) return;

        const maxX = d3.max(this.shots, d => parseFloat(d.x)) || 0;
        const multiplier = maxX <= 1.5 ? 100 : 1;

        // --- FILTRE OMBRE PORTÉE ---
        const defs = g.append('defs');
        const filter = defs.append('filter').attr('id', 'drop-shadow').attr('height', '130%');
        filter.append('feGaussianBlur').attr('in', 'SourceAlpha').attr('stdDeviation', 2).attr('result', 'blur');
        filter.append('feOffset').attr('in', 'blur').attr('dx', 1).attr('dy', 1).attr('result', 'offsetBlur');
        filter.append('feFlood').attr('flood-color', 'rgba(0,0,0,0.6)').attr('result', 'color');
        filter.append('feComposite').attr('in', 'color').attr('in2', 'offsetBlur').attr('operator', 'in').attr('result', 'shadow');
        filter.append('feMerge').call(merge => {
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

            // Trajectoires
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

            let xGVal = this.getXGValue(shot);
            if (isNaN(xGVal) || xGVal <= 0) xGVal = 0.06;

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
                .style('filter', 'url(#drop-shadow)');

            // Interactions
            shotNode.on('mouseover', (e) => {
                d3.select(e.currentTarget)
                    .transition().duration(200)
                    .attr('r', radius * 1.3)
                    .attr('stroke', 'white') 
                    .attr('stroke-width', 3)
                    .attr('fill-opacity', 1);
                
                // 1. Tooltip Texte COMPLET (avec adversaire)
                this.showTooltip(e, shot, details, xGVal);
                
                // 2. Preview Cage 3D (si disponible)
                if (details.showGoalMouth) {
                    this.showGoalPreview(e, shot);
                }
            })
            .on('mouseout', (e) => {
                d3.select(e.currentTarget)
                    .transition().duration(200)
                    .attr('r', radius)
                    .attr('stroke', details.stroke)
                    .attr('stroke-width', details.strokeWidth)
                    .attr('fill-opacity', details.opacity);
                
                if (this.tooltip) this.tooltip.style.display = 'none';
                this.hideGoalPreview();
            });
        });

        this.addLegend(g);
    }

    getXGValue(shot) {
        if (shot.xG !== undefined) return parseFloat(shot.xG);
        if (shot.expectedGoals !== undefined) return parseFloat(shot.expectedGoals);
        if (shot.statisticallyExpectedGoals !== undefined) return parseFloat(shot.statisticallyExpectedGoals);
        if (shot.qualifiers && Array.isArray(shot.qualifiers)) {
            const xgQualifier = shot.qualifiers.find(q => q.type?.displayName === 'ExpectedGoals' || q.type?.displayName === 'xG');
            if (xgQualifier) return parseFloat(xgQualifier.value);
        }
        return 0.06;
    }

    getShotDetails(shot) {
        const type = shot.type?.displayName;
        const BLUE = '#3b82f6';
        const GREY = '#94a3b8';
        const WHITE = '#ffffff';
        const GOLD = '#eab308'; 

        if (type === 'Goal') {
            return { color: BLUE, fill: BLUE, stroke: WHITE, strokeWidth: 2.5, opacity: 1, label: 'But', isGoal: true, showGoalMouth: true };
        }
        if (type === 'SavedShot' || type === 'AttemptSaved') {
            return { color: BLUE, fill: 'rgba(59, 130, 246, 0.2)', stroke: BLUE, strokeWidth: 3, opacity: 1, label: 'Arrêté / Cadré', isGoal: false, showGoalMouth: true };
        }
        if (type === 'ShotOnPost') {
            return { color: GOLD, fill: 'rgba(234, 179, 8, 0.2)', stroke: GOLD, strokeWidth: 3, opacity: 1, label: 'Poteau', isGoal: false, showGoalMouth: true };
        }
        return { color: GREY, fill: GREY, stroke: 'rgba(255, 255, 255, 0.7)', strokeWidth: 1.5, opacity: 0.8, label: 'Non Cadré', isGoal: false, showGoalMouth: false };
    }

    // --- TOOLTIP TEXTE ENRICHI (ADVERSAIRE + DATE) ---
    showTooltip(e, shot, details, xG) {
        if (!this.tooltip) return;
        
        this.tooltip.style.display = 'block';
        this.tooltip.style.left = (e.pageX + 20) + 'px';
        this.tooltip.style.top = (e.pageY + 20) + 'px';

        let bodyPart = 'Inconnu';
        if (shot.qualifiers?.some(q => q.type?.displayName === 'Head')) bodyPart = 'Tête';
        else if (shot.qualifiers?.some(q => q.type?.displayName === 'RightFoot')) bodyPart = 'Pied Droit';
        else if (shot.qualifiers?.some(q => q.type?.displayName === 'LeftFoot')) bodyPart = 'Pied Gauche';

        // Extraction des infos de match
        const opponent = shot.opponent || '';
        const dateObj = shot.matchDate ? new Date(shot.matchDate) : null;
        const dateStr = dateObj ? dateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

        const content = `
            <div style="min-width: 200px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <div style="width: 10px; height: 10px; background: ${details.fill}; border: 2px solid ${details.stroke}; border-radius: 50%;"></div>
                    <strong style="font-size: 1rem; color:white;">${details.label}</strong>
                </div>

                ${opponent ? `
                <div style="background: rgba(59, 130, 246, 0.15); padding: 6px 8px; border-radius: 6px; margin-bottom: 8px; border: 1px solid rgba(59, 130, 246, 0.3);">
                    <div style="font-size: 0.7rem; color: #94a3b8; margin-bottom: 2px;">⚽ Match</div>
                    <div style="font-size: 0.85rem; color: #cbd5e1; font-weight: 600;">vs ${opponent}</div>
                    ${dateStr ? `<div style="font-size: 0.7rem; color: #94a3b8; margin-top: 2px;">${dateStr}</div>` : ''}
                </div>` : ''}

                <div style="font-size: 0.9rem; color: #cbd5e1;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                        <span>Minute:</span> <strong style="color:white;">${shot.minute}'</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                        <span>xG:</span> <strong style="color: ${xG > 0.3 ? '#60a5fa' : 'white'};">${xG.toFixed(2)}</strong>
                    </div>
                    <div style="font-size:0.8rem; color:#94a3b8; margin-top:6px; text-align:right; font-style:italic;">${bodyPart}</div>
                </div>
            </div>`;
        this.tooltip.innerHTML = content;
    }

    showGoalPreview(event, shot) {
        let preview = document.getElementById('goal-preview');
        if (!preview) {
            preview = document.createElement('div');
            preview.id = 'goal-preview';
            preview.style.cssText = 'position: fixed; background: rgba(10, 14, 26, 0.98); border: 2px solid rgba(59, 130, 246, 0.5); border-radius: 16px; padding: 20px; width: 400px; box-shadow: 0 12px 48px rgba(0, 0, 0, 0.7); z-index: 10000; pointer-events: none; backdrop-filter: blur(12px);';
            document.body.appendChild(preview);
        }
        const viewportWidth = window.innerWidth;
        const previewLeft = event.pageX + 420 < viewportWidth ? event.pageX + 20 : event.pageX - 420;
        preview.style.left = previewLeft + 'px';
        preview.style.top = (event.pageY - 150) + 'px';
        preview.style.display = 'block';

        const goalWidth = 360;
        const goalHeight = 220;
        let goalMouthY = 50;
        let goalMouthZ = 50;

        if (shot.qualifiers) {
            const yQualifier = shot.qualifiers.find(q => q.type?.displayName === 'GoalMouthY');
            const zQualifier = shot.qualifiers.find(q => q.type?.displayName === 'GoalMouthZ');
            if (yQualifier && yQualifier.value) goalMouthY = parseFloat(yQualifier.value);
            if (zQualifier && zQualifier.value) goalMouthZ = parseFloat(zQualifier.value);
        }
        if (shot.goalMouthY !== undefined) goalMouthY = shot.goalMouthY;
        if (shot.goalMouthZ !== undefined) goalMouthZ = shot.goalMouthZ;

        // SCALING ET CLAMPING CORRIGÉS
        const groundLine = goalHeight - 30;
        const cageHeightPx = 150;
        const cageBottom = groundLine;
        const cageTop = cageBottom - cageHeightPx;
        const cageLeftX = 25;
        const cageRightX = goalWidth - 25;

        const scaleYtoX = d3.scaleLinear().domain([44, 56]).range([cageLeftX, cageRightX]);
        const scaleZtoY = d3.scaleLinear().domain([0, 40]).range([cageBottom, cageTop]);

        const targetX = Math.max(cageLeftX + 2, Math.min(cageRightX - 2, scaleYtoX(goalMouthY)));
        const targetY = Math.max(cageTop + 2, Math.min(cageBottom - 2, scaleZtoY(goalMouthZ)));
        
        const isGoal = shot.type?.displayName === 'Goal';
        const isSaved = shot.type?.displayName === 'SavedShot';
        const isPost = shot.type?.displayName === 'ShotOnPost';
        const shotColor = isGoal ? '#eab308' : (isSaved ? '#f97316' : '#ef4444');
        
        const shotX = parseFloat(shot.x);
        const normalizedX = shotX > 1.5 ? shotX : shotX * 100;
        const distanceFromGoal = 100 - normalizedX;

        const matchDate = shot.matchDate ? new Date(shot.matchDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
        const opponent = shot.opponent || '';
        
        preview.innerHTML = `
            <div style="text-align: center; margin-bottom: 12px;">
                <div style="color: #cbd5e1; font-weight: 600; font-size: 1.1rem;">${isGoal ? '⚽ BUT MARQUÉ' : isSaved ? '🎯 TIR CADRÉ' : isPost ? '🥅 POTEAU' : 'TIR'}</div>
            </div>
            <svg width="${goalWidth}" height="${goalHeight}" style="border-radius: 8px; background: linear-gradient(180deg, #1a472a 0%, #0d2817 100%); overflow: visible;">
                <defs>
                    <linearGradient id="netGradient" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:rgba(255,255,255,0.5);stop-opacity:1"/><stop offset="50%" style="stop-color:rgba(255,255,255,0.25);stop-opacity:1"/><stop offset="100%" style="stop-color:rgba(255,255,255,0.1);stop-opacity:1"/></linearGradient>
                    <filter id="ballGlow"><feGaussianBlur stdDeviation="4" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                    <pattern id="netPattern" x="0" y="0" width="25" height="25" patternUnits="userSpaceOnUse"><line x1="0" y1="0" x2="0" y2="25" stroke="url(#netGradient)" stroke-width="2" opacity="0.7"/><line x1="0" y1="0" x2="25" y2="0" stroke="url(#netGradient)" stroke-width="2" opacity="0.7"/></pattern>
                </defs>
                <rect x="${cageLeftX}" y="${cageTop}" width="${cageRightX - cageLeftX}" height="${cageHeightPx}" fill="rgba(0,0,0,0.3)" rx="4"/>
                <rect x="${cageLeftX + 5}" y="${cageTop + 5}" width="${cageRightX - cageLeftX - 10}" height="${cageHeightPx - 10}" fill="url(#netPattern)" opacity="0.6"/>
                ${Array.from({length: 8}, (_, i) => { const backX = cageLeftX + 5 + (i * (cageRightX - cageLeftX - 10) / 7); const frontX = cageLeftX + (i * (cageRightX - cageLeftX) / 7); return `<line x1="${backX}" y1="${cageTop + 5}" x2="${frontX}" y2="${cageBottom}" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" opacity="0.5"/>`; }).join('')}
                <rect x="${cageLeftX - 5}" y="${cageTop}" width="10" height="${cageHeightPx}" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5" rx="5" style="filter: drop-shadow(3px 3px 6px rgba(0,0,0,0.6))"/>
                <rect x="${cageRightX - 5}" y="${cageTop}" width="10" height="${cageHeightPx}" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5" rx="5" style="filter: drop-shadow(3px 3px 6px rgba(0,0,0,0.6))"/>
                <rect x="${cageLeftX - 5}" y="${cageTop}" width="${cageRightX - cageLeftX + 10}" height="10" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5" rx="5" style="filter: drop-shadow(3px 3px 6px rgba(0,0,0,0.6))"/>
                <line x1="0" y1="${groundLine}" x2="${goalWidth}" y2="${groundLine}" stroke="rgba(34, 197, 94, 0.6)" stroke-width="3" stroke-dasharray="10,5"/>
                
                <path d="M ${goalWidth / 2} ${goalHeight} Q ${goalWidth / 2 + (targetX - goalWidth / 2) * 0.6} ${goalHeight - Math.max(distanceFromGoal * 3, 50)} ${targetX} ${targetY}" stroke="${shotColor}" stroke-width="3.5" stroke-dasharray="10,8" fill="none" opacity="0.8" style="filter: drop-shadow(0 0 8px ${shotColor})"><animate attributeName="stroke-dashoffset" from="150" to="0" dur="1.8s" repeatCount="indefinite"/></path>
                <circle cx="${targetX}" cy="${targetY}" r="13" fill="${shotColor}" stroke="white" stroke-width="3" filter="url(#ballGlow)" style="filter: drop-shadow(0 6px 16px ${shotColor})"><animate attributeName="r" values="13;15;13" dur="1.1s" repeatCount="indefinite"/></circle>
                ${isPost ? `<circle cx="${targetX < goalWidth / 2 ? cageLeftX : cageRightX}" cy="${targetY}" r="25" fill="none" stroke="#fbbf24" stroke-width="4" opacity="0.8"><animate attributeName="r" values="18;30;18" dur="0.9s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.8;0;0.8" dur="0.9s" repeatCount="indefinite"/></circle>` : ''}
            </svg>
            <div style="margin-top: 12px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; font-size: 0.8rem;">
                <div style="background: rgba(59, 130, 246, 0.15); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(59, 130, 246, 0.4);"><div style="color: #94a3b8; font-size: 0.7rem; margin-bottom: 2px;">Distance</div><div style="color: #3b82f6; font-weight: 700; font-size: 1.1rem;">${Math.abs(distanceFromGoal).toFixed(1)}m</div></div>
                <div style="background: rgba(234, 179, 8, 0.15); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(234, 179, 8, 0.4);"><div style="color: #94a3b8; font-size: 0.7rem; margin-bottom: 2px;">↔ Horizontal</div><div style="color: #eab308; font-weight: 700; font-size: 1.1rem;">${goalMouthY.toFixed(1)}%</div></div>
                <div style="background: rgba(34, 197, 94, 0.15); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(34, 197, 94, 0.4);"><div style="color: #94a3b8; font-size: 0.7rem; margin-bottom: 2px;">↕ Hauteur</div><div style="color: #22c55e; font-weight: 700; font-size: 1.1rem;">${goalMouthZ.toFixed(1)}%</div></div>
            </div>`;
    }

    hideGoalPreview() {
        const preview = document.getElementById('goal-preview');
        if (preview) preview.style.display = 'none';
    }

    addLegend(g) {
        const legendX = this.pitch.margin + 20;
        const legendY = this.pitch.margin + 20;

        g.append('rect').attr('x', legendX - 15).attr('y', legendY - 15).attr('width', 180).attr('height', 140).attr('fill', '#0f172a').attr('rx', 8).attr('stroke', '#3b82f6').attr('stroke-width', 1).style('filter', 'url(#drop-shadow)');
        g.append('text').attr('x', legendX).attr('y', legendY + 5).attr('fill', '#ffffff').style('font-size', '14px').style('font-weight', '700').style('text-transform', 'uppercase').style('letter-spacing', '1px').text('Carte des tirs');

        const items = [
            { y: 35, fill: '#3b82f6', stroke: '#ffffff', strokeWidth: 2, text: 'But' },
            { y: 65, fill: 'rgba(59, 130, 246, 0.2)', stroke: '#3b82f6', strokeWidth: 3, text: 'Arrêté / Cadré' },
            { y: 95, fill: '#94a3b8', stroke: 'rgba(255,255,255,0.7)', strokeWidth: 1.5, text: 'Non Cadré' }
        ];

        items.forEach(item => {
            const yPos = legendY + item.y;
            g.append('circle').attr('cx', legendX + 10).attr('cy', yPos - 4).attr('r', 7).attr('fill', item.fill).attr('stroke', item.stroke).attr('stroke-width', item.strokeWidth);
            g.append('text').attr('x', legendX + 30).attr('y', yPos).attr('fill', '#e2e8f0').style('font-size', '12px').text(item.text);
        });
        g.append('text').attr('x', legendX + 10).attr('y', legendY + 115).attr('fill', '#94a3b8').style('font-size', '10px').style('font-style', 'italic').text('Taille du point = Valeur xG');
    }
}