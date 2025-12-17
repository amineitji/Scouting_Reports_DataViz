/**
 * actions.js - Visualisation des actions
 */
import { Pitch } from './pitch.js';

export class ActionMap {
    constructor(svgId, events) {
        this.pitch = new Pitch(svgId);
        this.events = events;
        this.options = { showShots: true, showGoals: true, showDribbles: true, showDefensive: true };
        this.tooltip = document.getElementById('tooltip');
        this.render();
    }

    updateOptions(newOptions) {
        this.options = { ...this.options, ...newOptions };
        this.render();
    }

    render() {
        this.pitch.clearDataLayer();
        if (!this.events || this.events.length === 0) {
            this.showEmptyMessage();
            return;
        }
        const g = this.pitch.getGroup();
        const eventsByType = { goals: [], shots: [], dribbles: [], defensive: [] };
        this.events.forEach(ev => {
            const type = ev.type?.displayName;
            if (type === 'Goal' && this.options.showGoals) eventsByType.goals.push(ev);
            else if (['MissedShots', 'SavedShot', 'ShotOnPost'].includes(type) && this.options.showShots) eventsByType.shots.push(ev);
            else if (type === 'TakeOn' && this.options.showDribbles) eventsByType.dribbles.push(ev);
            else if (['Tackle', 'Interception', 'Clearance', 'BallRecovery'].includes(type) && this.options.showDefensive) eventsByType.defensive.push(ev);
        });
        this.drawGoals(g, eventsByType.goals);
        this.drawShots(g, eventsByType.shots);
        this.drawDribbles(g, eventsByType.dribbles);
        this.drawDefensive(g, eventsByType.defensive);
        this.addLegend(g);
    }

    drawGoals(g, goals) {
        goals.forEach(goal => {
            const [x, y] = this.pitch.toPixels(goal.x, goal.y);
            this.drawArrowToGoal(g, goal, 0.6);
            const outerCircle = g.append('circle').attr('cx', x).attr('cy', y).attr('r', 12).attr('fill', 'none').attr('stroke', '#eab308').attr('stroke-width', 2).attr('opacity', 0.6);
            outerCircle.transition().duration(1500).ease(d3.easeQuadInOut).attr('r', 18).attr('opacity', 0).on('end', function repeat() {
                d3.select(this).attr('r', 12).attr('opacity', 0.6).transition().duration(1500).ease(d3.easeQuadInOut).attr('r', 18).attr('opacity', 0).on('end', repeat);
            });
            const circle = g.append('circle').attr('cx', x).attr('cy', y).attr('r', 8).attr('fill', '#eab308').attr('stroke', 'white').attr('stroke-width', 2.5).style('cursor', 'pointer').style('filter', 'drop-shadow(0 0 8px rgba(234, 179, 8, 0.6))').on('mouseover', (event) => {
                circle.transition().duration(150).attr('r', 11).style('filter', 'drop-shadow(0 0 12px rgba(234, 179, 8, 0.9))');
                this.showEnhancedTooltip(event, goal, 'But ⚽', '#eab308');
                this.showGoalPreview(event, goal);
            }).on('mouseout', () => {
                circle.transition().duration(150).attr('r', 8).style('filter', 'drop-shadow(0 0 8px rgba(234, 179, 8, 0.6))');
                this.tooltip.style.display = 'none';
                this.hideGoalPreview();
            });
            g.append('text').attr('x', x).attr('y', y + 1).attr('text-anchor', 'middle').attr('dominant-baseline', 'middle').attr('fill', 'white').style('font-size', '10px').style('pointer-events', 'none').text('★');
        });
    }

    drawShots(g, shots) {
        shots.forEach(shot => {
            const [x, y] = this.pitch.toPixels(shot.x, shot.y);
            this.drawArrowToGoal(g, shot, 0.4);
            const isOnTarget = ['SavedShot', 'ShotOnPost'].includes(shot.type?.displayName);
            const color = isOnTarget ? '#f97316' : '#ef4444';
            const circle = g.append('circle').attr('cx', x).attr('cy', y).attr('r', 5).attr('fill', color).attr('stroke', 'white').attr('stroke-width', 2).attr('opacity', 0.85).style('cursor', 'pointer').style('filter', `drop-shadow(0 0 4px ${color})`).on('mouseover', (event) => {
                circle.transition().duration(150).attr('r', 7.5).attr('opacity', 1).style('filter', `drop-shadow(0 0 8px ${color})`);
                const label = shot.type?.displayName === 'SavedShot' ? 'Tir cadré 🎯' : shot.type?.displayName === 'ShotOnPost' ? 'Sur le poteau 🥅' : 'Tir non-cadré';
                this.showEnhancedTooltip(event, shot, label, color);
                this.showGoalPreview(event, shot);
            }).on('mouseout', () => {
                circle.transition().duration(150).attr('r', 5).attr('opacity', 0.85).style('filter', `drop-shadow(0 0 4px ${color})`);
                this.tooltip.style.display = 'none';
                this.hideGoalPreview();
            });
        });
    }

    drawDribbles(g, dribbles) {
        dribbles.forEach(dribble => {
            const [x, y] = this.pitch.toPixels(dribble.x, dribble.y);
            const isSuccess = dribble.outcomeType?.value === 1;
            const color = isSuccess ? '#22c55e' : '#ef4444';
            const size = 6;
            const diamond = g.append('path').attr('d', `M ${x},${y-size} L ${x+size},${y} L ${x},${y+size} L ${x-size},${y} Z`).attr('fill', color).attr('stroke', 'white').attr('stroke-width', 2).attr('opacity', 0.85).style('cursor', 'pointer').style('filter', `drop-shadow(0 0 4px ${color})`).on('mouseover', (event) => {
                diamond.transition().duration(150).attr('d', `M ${x},${y-size*1.3} L ${x+size*1.3},${y} L ${x},${y+size*1.3} L ${x-size*1.3},${y} Z`).attr('opacity', 1).style('filter', `drop-shadow(0 0 8px ${color})`);
                this.showEnhancedTooltip(event, dribble, isSuccess ? 'Dribble réussi 🏃' : 'Dribble raté', color);
            }).on('mouseout', () => {
                diamond.transition().duration(150).attr('d', `M ${x},${y-size} L ${x+size},${y} L ${x},${y+size} L ${x-size},${y} Z`).attr('opacity', 0.85).style('filter', `drop-shadow(0 0 4px ${color})`);
                this.tooltip.style.display = 'none';
            });
        });
    }

    drawDefensive(g, defensive) {
        defensive.forEach(action => {
            const [x, y] = this.pitch.toPixels(action.x, action.y);
            const type = action.type?.displayName;
            const color = '#8b5cf6';
            const size = 6;
            const triangle = g.append('path').attr('d', `M ${x},${y-size} L ${x+size},${y+size} L ${x-size},${y+size} Z`).attr('fill', color).attr('stroke', 'white').attr('stroke-width', 2).attr('opacity', 0.85).style('cursor', 'pointer').style('filter', `drop-shadow(0 0 4px ${color})`).on('mouseover', (event) => {
                triangle.transition().duration(150).attr('d', `M ${x},${y-size*1.3} L ${x+size*1.3},${y+size*1.3} L ${x-size*1.3},${y+size*1.3} Z`).attr('opacity', 1).style('filter', `drop-shadow(0 0 8px ${color})`);
                const label = type === 'Tackle' ? 'Tacle 🛡️' : type === 'Interception' ? 'Interception 🛡️' : type === 'Clearance' ? 'Dégagement 🛡️' : 'Récupération 🛡️';
                this.showEnhancedTooltip(event, action, label, color);
            }).on('mouseout', () => {
                triangle.transition().duration(150).attr('d', `M ${x},${y-size} L ${x+size},${y+size} L ${x-size},${y+size} Z`).attr('opacity', 0.85).style('filter', `drop-shadow(0 0 4px ${color})`);
                this.tooltip.style.display = 'none';
            });
        });
    }

    drawArrowToGoal(g, event, opacity = 0.5) {
        const [x, y] = this.pitch.toPixels(event.x, event.y);
        const [goalX, goalY] = this.pitch.toPixels(100, 50);
        const dx = goalX - x;
        const dy = goalY - y;
        const angle = Math.atan2(dy, dx);
        const arrowLength = Math.min(Math.sqrt(dx*dx + dy*dy) * 0.8, 150);
        const endX = x + arrowLength * Math.cos(angle);
        const endY = y + arrowLength * Math.sin(angle);
        const isGoal = event.type?.displayName === 'Goal';
        const arrowColor = isGoal ? '#eab308' : '#ef4444';
        const gradientId = `arrowGradient-${Math.random().toString(36).substr(2, 9)}`;
        const defs = g.append('defs');
        const gradient = defs.append('linearGradient').attr('id', gradientId).attr('x1', '0%').attr('y1', '0%').attr('x2', '100%').attr('y2', '0%');
        gradient.append('stop').attr('offset', '0%').attr('stop-color', arrowColor).attr('stop-opacity', opacity * 0.8);
        gradient.append('stop').attr('offset', '100%').attr('stop-color', arrowColor).attr('stop-opacity', 0);
        const markerId = `arrowhead-${isGoal ? 'goal' : 'shot'}-${Math.random().toString(36).substr(2, 9)}`;
        defs.append('marker').attr('id', markerId).attr('viewBox', '0 0 10 10').attr('refX', 9).attr('refY', 5).attr('markerWidth', 3).attr('markerHeight', 3).attr('orient', 'auto').append('path').attr('d', 'M 0 0 L 10 5 L 0 10 z').attr('fill', arrowColor).attr('opacity', opacity * 0.8);
        g.append('line').attr('x1', x).attr('y1', y).attr('x2', endX).attr('y2', endY).attr('stroke', `url(#${gradientId})`).attr('stroke-width', 5).attr('stroke-linecap', 'round').attr('marker-end', `url(#${markerId})`).style('pointer-events', 'none');
    }

    hideGoalPreview() {
        const preview = document.getElementById('goal-preview');
        if (preview) preview.style.display = 'none';
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
        const groundLine = goalHeight - 30;
        const cageHeightPx = 150;
        const cageBottom = groundLine;
        const cageTop = cageBottom - cageHeightPx;
        const cageLeftX = 25;
        const cageRightX = goalWidth - 25;
        const cageWidth = cageRightX - cageLeftX;
        const targetX = cageLeftX + (goalMouthY / 100) * cageWidth;
        const targetY = cageBottom - (goalMouthZ / 100) * cageHeightPx;
        const isGoal = shot.type?.displayName === 'Goal';
        const isSaved = shot.type?.displayName === 'SavedShot';
        const isPost = shot.type?.displayName === 'ShotOnPost';
        const shotColor = isGoal ? '#eab308' : (isSaved ? '#f97316' : '#ef4444');
        const distanceFromGoal = 100 - shot.x;
        let shotPosition = 'Centre';
        const positionQualifiers = shot.qualifiers?.filter(q => ['LowLeft', 'LowCentre', 'LowRight', 'HighLeft', 'HighCentre', 'HighRight'].includes(q.type?.displayName));
        if (positionQualifiers && positionQualifiers.length > 0) shotPosition = positionQualifiers[0].type.displayName;
        // Informations du match
        const matchDate = shot.matchDate ? new Date(shot.matchDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
        const opponent = shot.opponent || '';
        
        preview.innerHTML = `<div style="text-align: center; margin-bottom: 12px;">
                ${matchDate || opponent ? `<div style="background: rgba(59, 130, 246, 0.1); padding: 6px 10px; border-radius: 8px; margin-bottom: 8px; border: 1px solid rgba(59, 130, 246, 0.25);">
                    <div style="color: #60a5fa; font-weight: 600; font-size: 0.85rem;">vs ${opponent}</div>
                    ${matchDate ? `<div style="color: #94a3b8; font-size: 0.7rem; margin-top: 2px;">${matchDate}</div>` : ''}
                </div>` : ''}
                <div style="color: #3b82f6; font-weight: 700; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Vue de face • 7.32m × 2.44m</div><div style="color: #cbd5e1; font-weight: 600; font-size: 1.1rem;">${isGoal ? '⚽ BUT MARQUÉ' : isSaved ? '🎯 TIR CADRÉ' : isPost ? '🥅 POTEAU' : '❌ À CÔTÉ'}</div><div style="color: #94a3b8; font-size: 0.85rem; margin-top: 4px;">${shotPosition}</div></div><svg width="${goalWidth}" height="${goalHeight}" style="border-radius: 8px; background: linear-gradient(180deg, #1a472a 0%, #0d2817 100%); overflow: visible;"><defs><linearGradient id="netGradient" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:rgba(255,255,255,0.5);stop-opacity:1"/><stop offset="50%" style="stop-color:rgba(255,255,255,0.25);stop-opacity:1"/><stop offset="100%" style="stop-color:rgba(255,255,255,0.1);stop-opacity:1"/></linearGradient><filter id="ballGlow"><feGaussianBlur stdDeviation="4" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter><pattern id="netPattern" x="0" y="0" width="25" height="25" patternUnits="userSpaceOnUse"><line x1="0" y1="0" x2="0" y2="25" stroke="url(#netGradient)" stroke-width="2" opacity="0.7"/><line x1="0" y1="0" x2="25" y2="0" stroke="url(#netGradient)" stroke-width="2" opacity="0.7"/></pattern></defs><rect x="${cageLeftX}" y="${cageTop}" width="${cageWidth}" height="${cageHeightPx}" fill="rgba(0,0,0,0.3)" rx="4"/><rect x="${cageLeftX + 5}" y="${cageTop + 5}" width="${cageWidth - 10}" height="${cageHeightPx - 10}" fill="url(#netPattern)" opacity="0.6"/>${Array.from({length: 8}, (_, i) => { const backX = cageLeftX + 5 + (i * (cageWidth - 10) / 7); const frontX = cageLeftX + (i * cageWidth / 7); return `<line x1="${backX}" y1="${cageTop + 5}" x2="${frontX}" y2="${cageBottom}" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" opacity="0.5"/>`; }).join('')}${Array.from({length: 5}, (_, i) => { const y = cageTop + 5 + (i * (cageHeightPx - 10) / 4); return `<line x1="${cageLeftX + 5}" y1="${y}" x2="${cageRightX - 5}" y2="${y}" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" opacity="0.5"/>`; }).join('')}<g id="goalFrame"><rect x="${cageLeftX - 5}" y="${cageTop}" width="10" height="${cageHeightPx}" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5" rx="5" style="filter: drop-shadow(3px 3px 6px rgba(0,0,0,0.6))"/><rect x="${cageLeftX - 3}" y="${cageTop}" width="3" height="${cageHeightPx}" fill="rgba(255,255,255,0.4)" rx="2"/><rect x="${cageRightX - 5}" y="${cageTop}" width="10" height="${cageHeightPx}" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5" rx="5" style="filter: drop-shadow(3px 3px 6px rgba(0,0,0,0.6))"/><rect x="${cageRightX - 3}" y="${cageTop}" width="3" height="${cageHeightPx}" fill="rgba(255,255,255,0.4)" rx="2"/><rect x="${cageLeftX - 5}" y="${cageTop}" width="${cageWidth + 10}" height="10" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5" rx="5" style="filter: drop-shadow(3px 3px 6px rgba(0,0,0,0.6))"/><rect x="${cageLeftX - 5}" y="${cageTop + 2}" width="${cageWidth + 10}" height="3" fill="rgba(255,255,255,0.4)" rx="2"/></g><path d="M ${cageLeftX} ${cageTop + 10} L ${cageLeftX} ${cageBottom} L ${cageLeftX + 5} ${cageTop + cageHeightPx - 5} L ${cageLeftX + 5} ${cageTop + 10} Z" fill="url(#netPattern)" opacity="0.4"/><path d="M ${cageRightX} ${cageTop + 10} L ${cageRightX} ${cageBottom} L ${cageRightX - 5} ${cageTop + cageHeightPx - 5} L ${cageRightX - 5} ${cageTop + 10} Z" fill="url(#netPattern)" opacity="0.4"/><line x1="0" y1="${groundLine}" x2="${goalWidth}" y2="${groundLine}" stroke="rgba(34, 197, 94, 0.6)" stroke-width="3" stroke-dasharray="10,5"/><text x="5" y="${groundLine - 5}" fill="rgba(34, 197, 94, 0.8)" font-size="10px" font-weight="600">SOL (Z=0)</text><path d="M ${goalWidth / 2} ${goalHeight} Q ${goalWidth / 2 + (targetX - goalWidth / 2) * 0.6} ${goalHeight - Math.max(distanceFromGoal * 3, 50)} ${targetX} ${targetY}" stroke="${shotColor}" stroke-width="3.5" stroke-dasharray="10,8" fill="none" opacity="0.8" style="filter: drop-shadow(0 0 8px ${shotColor})"><animate attributeName="stroke-dashoffset" from="150" to="0" dur="1.8s" repeatCount="indefinite"/></path><g id="ball"><ellipse cx="${targetX}" cy="${targetY + 18}" rx="12" ry="5" fill="rgba(0,0,0,0.4)" opacity="0.5"><animate attributeName="opacity" values="0.5;0.2;0.5" dur="1.3s" repeatCount="indefinite"/></ellipse><circle cx="${targetX}" cy="${targetY}" r="13" fill="${shotColor}" stroke="white" stroke-width="3" filter="url(#ballGlow)" style="filter: drop-shadow(0 6px 16px ${shotColor})"><animate attributeName="r" values="13;15;13" dur="1.1s" repeatCount="indefinite"/></circle><path d="M ${targetX} ${targetY - 7} L ${targetX + 4} ${targetY - 3} L ${targetX + 3} ${targetY + 4} L ${targetX - 3} ${targetY + 4} L ${targetX - 4} ${targetY - 3} Z" fill="rgba(0,0,0,0.35)"/><circle cx="${targetX}" cy="${targetY}" r="4" fill="rgba(0,0,0,0.25)"/><path d="M ${targetX - 9} ${targetY} Q ${targetX} ${targetY - 3} ${targetX + 9} ${targetY}" stroke="rgba(0,0,0,0.2)" stroke-width="1.5" fill="none"/></g>${isPost ? `<circle cx="${targetX < goalWidth / 2 ? cageLeftX : cageRightX}" cy="${targetY}" r="25" fill="none" stroke="#fbbf24" stroke-width="4" opacity="0.8"><animate attributeName="r" values="18;30;18" dur="0.9s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.8;0;0.8" dur="0.9s" repeatCount="indefinite"/></circle>` : ''}${Array.from({length: 4}, (_, i) => `<line x1="${targetX - 20 - i * 10}" y1="${targetY - 2 + i * 1}" x2="${targetX - 32 - i * 10}" y2="${targetY - 2 + i * 1}" stroke="${shotColor}" stroke-width="3" opacity="${0.5 - i * 0.12}" stroke-linecap="round"><animate attributeName="x1" values="${targetX - 20 - i * 10};${targetX - 15 - i * 10};${targetX - 20 - i * 10}" dur="0.6s" repeatCount="indefinite"/><animate attributeName="x2" values="${targetX - 32 - i * 10};${targetX - 27 - i * 10};${targetX - 32 - i * 10}" dur="0.6s" repeatCount="indefinite"/></line>`).join('')}${isGoal ? `<circle cx="${targetX}" cy="${targetY}" r="30" fill="none" stroke="#eab308" stroke-width="3" opacity="0.6"><animate attributeName="r" values="15;50;15" dur="1.5s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.6;0;0.6" dur="1.5s" repeatCount="indefinite"/></circle>` : ''}<line x1="${goalWidth/2 - 5}" y1="${(cageTop + cageBottom)/2}" x2="${goalWidth/2 + 5}" y2="${(cageTop + cageBottom)/2}" stroke="rgba(255,255,255,0.3)" stroke-width="1" stroke-dasharray="2,2"/><line x1="${goalWidth/2}" y1="${(cageTop + cageBottom)/2 - 5}" x2="${goalWidth/2}" y2="${(cageTop + cageBottom)/2 + 5}" stroke="rgba(255,255,255,0.3)" stroke-width="1" stroke-dasharray="2,2"/></svg><div style="margin-top: 12px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; font-size: 0.8rem;"><div style="background: rgba(59, 130, 246, 0.15); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(59, 130, 246, 0.4);"><div style="color: #94a3b8; font-size: 0.7rem; margin-bottom: 2px;">Distance</div><div style="color: #3b82f6; font-weight: 700; font-size: 1.1rem;">${Math.abs(distanceFromGoal).toFixed(1)}m</div></div><div style="background: rgba(234, 179, 8, 0.15); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(234, 179, 8, 0.4);"><div style="color: #94a3b8; font-size: 0.7rem; margin-bottom: 2px;">↔ Horizontal</div><div style="color: #eab308; font-weight: 700; font-size: 1.1rem;">${goalMouthY.toFixed(1)}%</div></div><div style="background: rgba(34, 197, 94, 0.15); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(34, 197, 94, 0.4);"><div style="color: #94a3b8; font-size: 0.7rem; margin-bottom: 2px;">↕ Hauteur</div><div style="color: #22c55e; font-weight: 700; font-size: 1.1rem;">${goalMouthZ.toFixed(1)}%</div></div></div>`;
    }

    showEnhancedTooltip(event, ev, label, color) {
        const tooltip = document.getElementById('goal-preview');
        if (tooltip) tooltip.style.display = 'none';
        this.tooltip.style.display = 'block';
        this.tooltip.style.left = (event.pageX + 15) + 'px';
        this.tooltip.style.top = (event.pageY - 10) + 'px';
        const qualifiers = ev.qualifiers || [];
        const badges = [];
        qualifiers.forEach(q => {
            const qType = q.type?.displayName;
            if (qType === 'Assist' || qType === 'IntentionalAssist' || qType === 'IntentionalGoalAssist') badges.push('<span class="badge">🎯 Assist</span>');
            else if (qType === 'KeyPass' || qType === 'BigChanceCreated') badges.push('<span class="badge">🔑 KeyPass</span>');
            else if (qType === 'BigChance') badges.push('<span class="badge">💥 BigChance</span>');
        });
        const outcomeColor = ev.outcomeType?.value === 1 ? '#22c55e' : '#ef4444';
        const outcomeText = ev.outcomeType?.value === 1 ? 'Réussi' : 'Échoué';
        
        // Informations du match
        const matchDate = ev.matchDate ? new Date(ev.matchDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
        const opponent = ev.opponent || 'Adversaire inconnu';
        
        this.tooltip.innerHTML = `<div style="background: rgba(10, 14, 26, 0.95); padding: 12px; border-radius: 8px; border: 2px solid ${color}; backdrop-filter: blur(10px); min-width: 200px;"><div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;"><div style="width: 8px; height: 8px; border-radius: 50%; background: ${color}; box-shadow: 0 0 8px ${color};"></div><div style="font-weight: 700; color: white; font-size: 0.9rem;">${label}</div></div>${matchDate || opponent !== 'Adversaire inconnu' ? `<div style="background: rgba(59, 130, 246, 0.15); padding: 6px 8px; border-radius: 6px; margin-bottom: 8px; border: 1px solid rgba(59, 130, 246, 0.3);"><div style="font-size: 0.7rem; color: #94a3b8; margin-bottom: 2px;">⚽ Match</div><div style="font-size: 0.8rem; color: #cbd5e1; font-weight: 600;">vs ${opponent}</div>${matchDate ? `<div style="font-size: 0.7rem; color: #94a3b8; margin-top: 2px;">${matchDate}</div>` : ''}</div>` : ''}<div style="font-size: 0.75rem; color: #94a3b8; margin-bottom: 4px;">${ev.expandedMinute}'${ev.second < 10 ? '0' : ''}${ev.second}"</div><div style="font-size: 0.75rem; margin-bottom: 6px;"><span style="color: ${outcomeColor}; font-weight: 600;">● ${outcomeText}</span></div><div style="font-size: 0.7rem; color: #64748b;">Position: (${ev.x.toFixed(1)}, ${ev.y.toFixed(1)})</div>${badges.length > 0 ? `<div style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 4px;">${badges.join('')}</div>` : ''}</div>`;
    }

    addLegend(g) {
        const legendX = this.pitch.width - 180;
        const legendY = this.pitch.margin + 20;
        g.append('rect').attr('x', legendX - 12).attr('y', legendY - 12).attr('width', 170).attr('height', 145).attr('fill', 'rgba(13, 17, 23, 0.85)').attr('rx', 10).style('backdrop-filter', 'blur(10px)').attr('stroke', 'rgba(59, 130, 246, 0.3)').attr('stroke-width', 1);
        g.append('text').attr('x', legendX).attr('y', legendY + 5).attr('fill', '#cbd5e1').style('font-size', '13px').style('font-weight', '700').text('Types d\'actions');
        const items = [
            { y: 30, symbol: 'circle', color: '#eab308', text: 'Buts', r: 6 },
            { y: 55, symbol: 'circle', color: '#ef4444', text: 'Tirs', r: 4 },
            { y: 80, symbol: 'diamond', color: '#22c55e', text: 'Dribbles', size: 5 },
            { y: 105, symbol: 'triangle', color: '#8b5cf6', text: 'Défense', size: 5 }
        ];
        items.forEach(item => {
            const itemY = legendY + item.y;
            if (item.symbol === 'circle') {
                g.append('circle').attr('cx', legendX + 10).attr('cy', itemY).attr('r', item.r).attr('fill', item.color).attr('stroke', 'white').attr('stroke-width', 1.5);
            } else if (item.symbol === 'diamond') {
                const size = item.size;
                const cx = legendX + 10;
                const cy = itemY;
                g.append('path').attr('d', `M ${cx},${cy-size} L ${cx+size},${cy} L ${cx},${cy+size} L ${cx-size},${cy} Z`).attr('fill', item.color).attr('stroke', 'white').attr('stroke-width', 1.5);
            } else if (item.symbol === 'triangle') {
                const size = item.size;
                const cx = legendX + 10;
                const cy = itemY;
                g.append('path').attr('d', `M ${cx},${cy-size} L ${cx+size},${cy+size} L ${cx-size},${cy+size} Z`).attr('fill', item.color).attr('stroke', 'white').attr('stroke-width', 1.5);
            }
            g.append('text').attr('x', legendX + 25).attr('y', itemY + 4).attr('fill', 'white').style('font-size', '11px').style('font-weight', '500').text(item.text);
        });
    }

    showEmptyMessage() {
        const g = this.pitch.getGroup();
        const centerX = this.pitch.width / 2;
        const centerY = this.pitch.height / 2;
        g.append('text').attr('x', centerX).attr('y', centerY).attr('text-anchor', 'middle').attr('fill', '#94a3b8').style('font-size', '16px').text('Aucune action à afficher');
    }
}