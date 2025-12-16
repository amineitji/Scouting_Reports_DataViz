/**
 * actions.js
 * Visualisation des actions (tirs, dribbles, actions défensives)
 */
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
        
        if (!this.events || this.events.length === 0) {
            this.showEmptyMessage();
            return;
        }

        const g = this.pitch.getGroup();

        // Grouper les événements par type
        const eventsByType = {
            goals: [],
            shots: [],
            dribbles: [],
            defensive: []
        };

        this.events.forEach(ev => {
            const type = ev.type?.displayName;
            
            if (type === 'Goal' && this.options.showGoals) {
                eventsByType.goals.push(ev);
            } else if (['MissedShots', 'SavedShot', 'ShotOnPost'].includes(type) && this.options.showShots) {
                eventsByType.shots.push(ev);
            } else if (type === 'TakeOn' && this.options.showDribbles) {
                eventsByType.dribbles.push(ev);
            } else if (['Tackle', 'Interception', 'Clearance', 'BallRecovery'].includes(type) && this.options.showDefensive) {
                eventsByType.defensive.push(ev);
            }
        });

        // Dessiner chaque type d'action
        this.drawGoals(g, eventsByType.goals);
        this.drawShots(g, eventsByType.shots);
        this.drawDribbles(g, eventsByType.dribbles);
        this.drawDefensive(g, eventsByType.defensive);

        // Légende
        this.addLegend(g);
    }

    drawGoals(g, goals) {
        goals.forEach(goal => {
            const [x, y] = this.pitch.toPixels(goal.x, goal.y);

            // Cercle externe animé
            g.append('circle')
                .attr('cx', x)
                .attr('cy', y)
                .attr('r', 12)
                .attr('fill', 'none')
                .attr('stroke', '#eab308')
                .attr('stroke-width', 2)
                .attr('opacity', 0.6);

            // Cercle principal
            const circle = g.append('circle')
                .attr('cx', x)
                .attr('cy', y)
                .attr('r', 8)
                .attr('fill', '#eab308')
                .attr('stroke', 'white')
                .attr('stroke-width', 2)
                .style('cursor', 'pointer')
                .on('mouseover', (event) => {
                    circle.attr('r', 10);
                    this.showTooltip(event, goal, 'But');
                })
                .on('mouseout', () => {
                    circle.attr('r', 8);
                    this.tooltip.style.display = 'none';
                });
        });
    }

    drawShots(g, shots) {
        shots.forEach(shot => {
            const [x, y] = this.pitch.toPixels(shot.x, shot.y);

            const circle = g.append('circle')
                .attr('cx', x)
                .attr('cy', y)
                .attr('r', 5)
                .attr('fill', '#ef4444')
                .attr('stroke', 'white')
                .attr('stroke-width', 1.5)
                .attr('opacity', 0.8)
                .style('cursor', 'pointer')
                .on('mouseover', (event) => {
                    circle.attr('r', 7).attr('opacity', 1);
                    this.showTooltip(event, shot, shot.typeFR || 'Tir');
                })
                .on('mouseout', () => {
                    circle.attr('r', 5).attr('opacity', 0.8);
                    this.tooltip.style.display = 'none';
                });
        });
    }

    drawDribbles(g, dribbles) {
        dribbles.forEach(dribble => {
            const [x, y] = this.pitch.toPixels(dribble.x, dribble.y);
            const isSuccess = dribble.outcomeType?.value === 1;
            const color = isSuccess ? '#22c55e' : '#f97316';

            const rect = g.append('rect')
                .attr('x', x - 5)
                .attr('y', y - 5)
                .attr('width', 10)
                .attr('height', 10)
                .attr('fill', color)
                .attr('stroke', 'white')
                .attr('stroke-width', 1.5)
                .attr('opacity', 0.8)
                .attr('transform', `rotate(45, ${x}, ${y})`)
                .style('cursor', 'pointer')
                .on('mouseover', (event) => {
                    rect.attr('width', 12).attr('height', 12)
                        .attr('x', x - 6).attr('y', y - 6)
                        .attr('opacity', 1);
                    this.showTooltip(event, dribble, 'Dribble');
                })
                .on('mouseout', () => {
                    rect.attr('width', 10).attr('height', 10)
                        .attr('x', x - 5).attr('y', y - 5)
                        .attr('opacity', 0.8);
                    this.tooltip.style.display = 'none';
                });
        });
    }

    drawDefensive(g, defensive) {
        defensive.forEach(action => {
            const [x, y] = this.pitch.toPixels(action.x, action.y);

            const triangle = d3.symbol()
                .type(d3.symbolTriangle)
                .size(80);

            const path = g.append('path')
                .attr('d', triangle)
                .attr('transform', `translate(${x}, ${y})`)
                .attr('fill', '#8b5cf6')
                .attr('stroke', 'white')
                .attr('stroke-width', 1.5)
                .attr('opacity', 0.8)
                .style('cursor', 'pointer')
                .on('mouseover', (event) => {
                    path.attr('opacity', 1);
                    const symbol = d3.symbol().type(d3.symbolTriangle).size(100);
                    path.attr('d', symbol);
                    this.showTooltip(event, action, action.typeFR || action.type?.displayName);
                })
                .on('mouseout', () => {
                    path.attr('opacity', 0.8);
                    path.attr('d', triangle);
                    this.tooltip.style.display = 'none';
                });
        });
    }

    showTooltip(event, ev, label) {
        this.tooltip.style.display = 'block';
        this.tooltip.style.left = (event.pageX + 10) + 'px';
        this.tooltip.style.top = (event.pageY - 10) + 'px';
        
        let content = `<strong>${label}</strong><br>Minute: ${ev.minute}'`;
        
        if (ev.outcomeTypeFR) {
            content += `<br>Résultat: ${ev.outcomeTypeFR}`;
        }
        
        this.tooltip.innerHTML = content;
    }

    addLegend(g) {
        const legendX = this.pitch.margin + 20;
        const legendY = this.pitch.margin + 20;

        // Fond
        g.append('rect')
            .attr('x', legendX - 10)
            .attr('y', legendY - 10)
            .attr('width', 180)
            .attr('height', 130)
            .attr('fill', 'rgba(0, 0, 0, 0.7)')
            .attr('rx', 8);

        // Titre
        g.append('text')
            .attr('x', legendX)
            .attr('y', legendY + 5)
            .attr('fill', 'white')
            .style('font-size', '12px')
            .style('font-weight', '600')
            .text('Types d\'actions');

        const items = [
            { y: 25, type: 'circle', color: '#eab308', text: 'Buts', size: 8 },
            { y: 45, type: 'circle', color: '#ef4444', text: 'Tirs', size: 5 },
            { y: 65, type: 'diamond', color: '#22c55e', text: 'Dribbles réussis', size: 8 },
            { y: 85, type: 'triangle', color: '#8b5cf6', text: 'Actions défensives', size: 8 }
        ];

        items.forEach(item => {
            const cx = legendX + 15;
            const cy = legendY + item.y;

            if (item.type === 'circle') {
                g.append('circle')
                    .attr('cx', cx)
                    .attr('cy', cy)
                    .attr('r', item.size)
                    .attr('fill', item.color)
                    .attr('stroke', 'white')
                    .attr('stroke-width', 1.5);
            } else if (item.type === 'diamond') {
                g.append('rect')
                    .attr('x', cx - item.size)
                    .attr('y', cy - item.size)
                    .attr('width', item.size * 2)
                    .attr('height', item.size * 2)
                    .attr('fill', item.color)
                    .attr('stroke', 'white')
                    .attr('stroke-width', 1.5)
                    .attr('transform', `rotate(45, ${cx}, ${cy})`);
            } else if (item.type === 'triangle') {
                const triangle = d3.symbol().type(d3.symbolTriangle).size(80);
                g.append('path')
                    .attr('d', triangle)
                    .attr('transform', `translate(${cx}, ${cy})`)
                    .attr('fill', item.color)
                    .attr('stroke', 'white')
                    .attr('stroke-width', 1.5);
            }

            // Texte
            g.append('text')
                .attr('x', cx + 20)
                .attr('y', cy + 4)
                .attr('fill', 'white')
                .style('font-size', '11px')
                .text(item.text);
        });
    }

    showEmptyMessage() {
        const g = this.pitch.getGroup();
        
        g.append('text')
            .attr('x', this.pitch.width / 2)
            .attr('y', this.pitch.height / 2)
            .attr('text-anchor', 'middle')
            .attr('fill', 'rgba(255, 255, 255, 0.5)')
            .style('font-size', '18px')
            .style('font-weight', '600')
            .text('Aucune action à afficher');
    }
}