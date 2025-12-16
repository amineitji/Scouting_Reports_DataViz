import { Pitch } from './pitch.js';

export class ActionMap {
    constructor(svgId, events) {
        this.pitch = new Pitch(svgId);
        this.events = events;
        
        this.options = {
            showShots: true,
            showGoals: true,
            showDribbles: true,
            showDefensive: true
        };
        
        this.tooltip = document.getElementById('tooltip');
        this.render();
    }

    updateOptions(newOptions) {
        this.options = { ...this.options, ...newOptions };
        this.render();
    }

    render() {
        this.pitch.clearDataLayer();
        const g = this.pitch.getGroup();
        this.defineMarkers();

        this.events.forEach(ev => {
            const type = ev.type?.displayName;
            
            const isGoal = type === 'Goal';
            const isShot = ['MissedShots', 'SavedShot', 'ShotOnPost'].includes(type);
            const isDribble = type === 'TakeOn';
            const isDefense = ['Tackle', 'Interception', 'Clearance', 'BallRecovery'].includes(type);

            if (isGoal && !this.options.showGoals) return;
            if (isShot && !this.options.showShots) return;
            if (isDribble && !this.options.showDribbles) return;
            if (isDefense && !this.options.showDefensive) return;

            const [startX, startY] = this.pitch.toPixels(ev.x, ev.y);

            if (isGoal || isShot) {
                this.drawShotVector(g, ev, startX, startY, isGoal);
            } else if (isDribble) {
                this.drawDribble(g, ev, startX, startY);
            } else if (isDefense) {
                this.drawDefensiveAction(g, ev, startX, startY, type);
            }
        });
    }

    drawShotVector(g, ev, startX, startY, isGoal) {
        let targetXVal = 100;
        let targetYVal = this.getQualifierValue(ev, 'GoalMouthY');
        
        const blockedX = this.getQualifierValue(ev, 'BlockedX');
        const blockedY = this.getQualifierValue(ev, 'BlockedY');
        
        if (blockedX !== null) {
            targetXVal = blockedX;
            targetYVal = blockedY !== null ? blockedY : ev.y;
        }
        
        if (targetYVal === null) targetYVal = ev.y;

        const [endX, endY] = this.pitch.toPixels(targetXVal, targetYVal);

        // Style selon le type
        let color, width, strokeDash;
        
        if (isGoal) {
            color = '#fbbf24'; // Or
            width = 5;
            strokeDash = 'none';
        } else if (ev.type?.displayName === 'SavedShot') {
            color = '#3b82f6'; // Bleu
            width = 3;
            strokeDash = 'none';
        } else if (blockedX !== null) {
            color = '#8b5cf6'; // Violet (bloqué)
            width = 3;
            strokeDash = '5,5';
        } else {
            color = '#ef4444'; // Rouge (raté)
            width = 3;
            strokeDash = 'none';
        }

        // Ligne de tir
        const line = g.append('line')
            .attr('x1', startX).attr('y1', startY)
            .attr('x2', endX).attr('y2', endY)
            .attr('stroke', color)
            .attr('stroke-width', width)
            .attr('stroke-dasharray', strokeDash)
            .attr('marker-end', `url(#arrow-${isGoal ? 'goal' : 'shot'})`)
            .style('cursor', 'pointer');

        // Zone de survol
        g.append('line')
            .attr('x1', startX).attr('y1', startY)
            .attr('x2', endX).attr('y2', endY)
            .attr('stroke', 'transparent')
            .attr('stroke-width', 15)
            .style('cursor', 'pointer')
            .on('mouseover', (e) => {
                line.attr('stroke-width', width + 2).attr('stroke', 'white');
                this.showShotTooltip(e, ev, isGoal);
            })
            .on('mouseout', () => {
                line.attr('stroke-width', width).attr('stroke', color);
                this.hideTooltip();
            });

        // Point de départ
        g.append('circle')
            .attr('cx', startX).attr('cy', startY)
            .attr('r', isGoal ? 6 : 5)
            .attr('fill', color)
            .attr('stroke', isGoal ? 'white' : '#1e293b')
            .attr('stroke-width', 2)
            .style('pointer-events', 'none');
    }

    drawDribble(g, ev, startX, startY) {
        const isSuccess = ev.outcomeType?.value === 1;
        const color = isSuccess ? '#22c55e' : '#ef4444';
        
        const rect = g.append('rect')
            .attr('x', startX - 6).attr('y', startY - 6)
            .attr('width', 12).attr('height', 12)
            .attr('fill', color)
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
            .attr('transform', `rotate(45, ${startX}, ${startY})`)
            .style('cursor', 'pointer');

        rect.on('mouseover', (e) => {
            rect.attr('width', 14).attr('height', 14).attr('x', startX - 7).attr('y', startY - 7);
            this.showTooltip(e, ev, isSuccess ? 'Dribble Réussi ✓' : 'Dribble Raté ✗');
        })
        .on('mouseout', () => {
            rect.attr('width', 12).attr('height', 12).attr('x', startX - 6).attr('y', startY - 6);
            this.hideTooltip();
        });
    }

    drawDefensiveAction(g, ev, startX, startY, type) {
        const colors = {
            'Tackle': '#8b5cf6',
            'Interception': '#06b6d4',
            'Clearance': '#f59e0b',
            'BallRecovery': '#10b981'
        };
        
        const color = colors[type] || '#8b5cf6';
        const isSuccess = ev.outcomeType?.value === 1;
        
        const symbol = d3.symbol()
            .type(d3.symbolTriangle)
            .size(isSuccess ? 150 : 100);
        
        const path = g.append('path')
            .attr('d', symbol)
            .attr('transform', `translate(${startX},${startY})`)
            .attr('fill', color)
            .attr('stroke', 'white')
            .attr('stroke-width', 1.5)
            .attr('opacity', isSuccess ? 1 : 0.6)
            .style('cursor', 'pointer');

        path.on('mouseover', (e) => {
            path.attr('transform', `translate(${startX},${startY}) scale(1.2)`);
            this.showTooltip(e, ev, type + (isSuccess ? ' ✓' : ' ✗'));
        })
        .on('mouseout', () => {
            path.attr('transform', `translate(${startX},${startY})`);
            this.hideTooltip();
        });
    }

    getQualifierValue(event, name) {
        const q = event.qualifiers?.find(q => q.type?.displayName === name);
        return q ? parseFloat(q.value) : null;
    }

    showShotTooltip(event, data, isGoal) {
        const gmY = this.getQualifierValue(data, 'GoalMouthY');
        const gmZ = this.getQualifierValue(data, 'GoalMouthZ');
        
        const bodyParts = ['RightFoot', 'LeftFoot', 'Head', 'OtherBodyPart'];
        const foundBody = data.qualifiers?.find(q => bodyParts.includes(q.type?.displayName));
        const bodyPart = foundBody ? foundBody.type.displayName : '';
        
        const shotType = data.type?.displayName === 'SavedShot' ? 'Tir Cadré' : 
                        data.type?.displayName === 'ShotOnPost' ? 'Sur le Poteau' : 
                        isGoal ? 'BUT ⚽' : 'Tir Non Cadré';

        let content = `<div style="text-align:center; font-weight:bold; margin-bottom:5px; color:${isGoal ? '#fbbf24' : '#fff'}">${shotType}</div>`;
        content += `<div style="font-size:0.85em; color:#94a3b8;">Minute: ${data.minute}' ${bodyPart ? '• ' + bodyPart : ''}</div>`;

        // Mini-cage
        if (gmY !== null && gmZ !== null) {
            const W = 160, H = 60;
            const postL = 44.6, postR = 55.4;
            const range = postR - postL;
            const ballX = 10 + ((gmY - postL) / range) * (W - 20);
            const zMax = 45;
            const ballY = (H - 5) - ((gmZ / zMax) * (H - 10));
            const ballColor = isGoal ? '#fbbf24' : '#ef4444';

            content += `
                <div style="margin-top:10px; background:#1a1f35; padding:5px; border-radius:4px;">
                    <svg width="${W}" height="${H}" style="display:block; margin:auto;">
                        <line x1="10" y1="${H}" x2="10" y2="5" stroke="white" stroke-width="3"/>
                        <line x1="${W-10}" y1="${H}" x2="${W-10}" y2="5" stroke="white" stroke-width="3"/>
                        <line x1="10" y1="5" x2="${W-10}" y2="5" stroke="white" stroke-width="3"/>
                        <line x1="0" y1="${H}" x2="${W}" y2="${H}" stroke="#475569" stroke-width="1"/>
                        <circle cx="${ballX}" cy="${ballY}" r="6" fill="${ballColor}" stroke="white" stroke-width="2"/>
                    </svg>
                    <div style="font-size:0.7em; color:#64748b; text-align:center">Vue gardien</div>
                </div>
            `;
        }

        this.tooltip.innerHTML = content;
        this.tooltip.style.display = 'block';
        
        const tipW = 200;
        let left = event.pageX + 15;
        if (left + tipW > window.innerWidth) left = event.pageX - tipW - 15;
        
        this.tooltip.style.left = left + 'px';
        this.tooltip.style.top = (event.pageY - 20) + 'px';
    }

    showTooltip(event, data, label) {
        this.tooltip.innerHTML = `<strong>${label}</strong><br>Minute: ${data.minute}'`;
        this.tooltip.style.display = 'block';
        this.tooltip.style.left = (event.pageX + 15) + 'px';
        this.tooltip.style.top = (event.pageY - 15) + 'px';
    }

    hideTooltip() {
        this.tooltip.style.display = 'none';
    }

    defineMarkers() {
        const defs = this.pitch.svg.select('defs').empty() 
            ? this.pitch.svg.append('defs') 
            : this.pitch.svg.select('defs');
        
        const createMarker = (id, color) => {
            if (defs.select(`#${id}`).empty()) {
                defs.append('marker')
                    .attr('id', id)
                    .attr('viewBox', '0 0 10 10')
                    .attr('refX', 7)
                    .attr('refY', 5)
                    .attr('markerWidth', 5)
                    .attr('markerHeight', 5)
                    .attr('orient', 'auto')
                    .append('path')
                    .attr('d', 'M 0 0 L 10 5 L 0 10 z')
                    .attr('fill', color);
            }
        };
        
        createMarker('arrow-goal', '#fbbf24');
        createMarker('arrow-shot', '#ef4444');
    }
}