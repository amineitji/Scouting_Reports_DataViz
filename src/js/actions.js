/**
 * actions.js
 * Visualisation des actions (tirs, dribbles, actions défensives) - VERSION AMÉLIORÉE
 * Ajout de meilleurs tooltips, flèches vers la cage pour les tirs, et vue 2D de la cage
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
            
            // Flèche vers la cage pour les buts (opacité plus élevée)
            this.drawArrowToGoal(g, goal, 0.6);

            // Cercle externe animé (pulse)
            const outerCircle = g.append('circle')
                .attr('cx', x)
                .attr('cy', y)
                .attr('r', 12)
                .attr('fill', 'none')
                .attr('stroke', '#eab308')
                .attr('stroke-width', 2)
                .attr('opacity', 0.6);

            // Animation de pulse
            outerCircle
                .transition()
                .duration(1500)
                .ease(d3.easeQuadInOut)
                .attr('r', 18)
                .attr('opacity', 0)
                .on('end', function repeat() {
                    d3.select(this)
                        .attr('r', 12)
                        .attr('opacity', 0.6)
                        .transition()
                        .duration(1500)
                        .ease(d3.easeQuadInOut)
                        .attr('r', 18)
                        .attr('opacity', 0)
                        .on('end', repeat);
                });

            // Cercle principal
            const circle = g.append('circle')
                .attr('cx', x)
                .attr('cy', y)
                .attr('r', 8)
                .attr('fill', '#eab308')
                .attr('stroke', 'white')
                .attr('stroke-width', 2.5)
                .style('cursor', 'pointer')
                .style('filter', 'drop-shadow(0 0 8px rgba(234, 179, 8, 0.6))')
                .on('mouseover', (event) => {
                    circle
                        .transition()
                        .duration(150)
                        .attr('r', 11)
                        .style('filter', 'drop-shadow(0 0 12px rgba(234, 179, 8, 0.9))');
                    this.showEnhancedTooltip(event, goal, 'But ⚽', '#eab308');
                    this.showGoalPreview(event, goal);
                })
                .on('mouseout', () => {
                    circle
                        .transition()
                        .duration(150)
                        .attr('r', 8)
                        .style('filter', 'drop-shadow(0 0 8px rgba(234, 179, 8, 0.6))');
                    this.tooltip.style.display = 'none';
                    this.hideGoalPreview();
                });

            // Icône étoile pour les buts
            g.append('text')
                .attr('x', x)
                .attr('y', y + 1)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .attr('fill', 'white')
                .style('font-size', '10px')
                .style('pointer-events', 'none')
                .text('★');
        });
    }

    drawShots(g, shots) {
        shots.forEach(shot => {
            const [x, y] = this.pitch.toPixels(shot.x, shot.y);
            
            // Flèche vers la cage pour les tirs
            this.drawArrowToGoal(g, shot, 0.4);

            const isOnTarget = ['SavedShot', 'ShotOnPost'].includes(shot.type?.displayName);
            const color = isOnTarget ? '#f97316' : '#ef4444';

            const circle = g.append('circle')
                .attr('cx', x)
                .attr('cy', y)
                .attr('r', 5)
                .attr('fill', color)
                .attr('stroke', 'white')
                .attr('stroke-width', 2)
                .attr('opacity', 0.85)
                .style('cursor', 'pointer')
                .style('filter', `drop-shadow(0 0 4px ${color})`)
                .on('mouseover', (event) => {
                    circle
                        .transition()
                        .duration(150)
                        .attr('r', 8)
                        .attr('opacity', 1)
                        .style('filter', `drop-shadow(0 0 8px ${color})`);
                    this.showEnhancedTooltip(event, shot, shot.typeFR || 'Tir', color);
                    this.showGoalPreview(event, shot);
                })
                .on('mouseout', () => {
                    circle
                        .transition()
                        .duration(150)
                        .attr('r', 5)
                        .attr('opacity', 0.85)
                        .style('filter', `drop-shadow(0 0 4px ${color})`);
                    this.tooltip.style.display = 'none';
                    this.hideGoalPreview();
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
                .attr('stroke-width', 2)
                .attr('opacity', 0.85)
                .attr('transform', `rotate(45, ${x}, ${y})`)
                .style('cursor', 'pointer')
                .style('filter', `drop-shadow(0 0 4px ${color})`)
                .on('mouseover', (event) => {
                    rect
                        .transition()
                        .duration(150)
                        .attr('width', 14)
                        .attr('height', 14)
                        .attr('x', x - 7)
                        .attr('y', y - 7)
                        .attr('opacity', 1)
                        .style('filter', `drop-shadow(0 0 8px ${color})`);
                    this.showEnhancedTooltip(event, dribble, 'Dribble', color);
                })
                .on('mouseout', () => {
                    rect
                        .transition()
                        .duration(150)
                        .attr('width', 10)
                        .attr('height', 10)
                        .attr('x', x - 5)
                        .attr('y', y - 5)
                        .attr('opacity', 0.85)
                        .style('filter', `drop-shadow(0 0 4px ${color})`);
                    this.tooltip.style.display = 'none';
                });
        });
    }

    drawDefensive(g, defensive) {
        defensive.forEach(action => {
            const [x, y] = this.pitch.toPixels(action.x, action.y);

            const triangle = d3.symbol()
                .type(d3.symbolTriangle)
                .size(100);

            const path = g.append('path')
                .attr('d', triangle)
                .attr('transform', `translate(${x}, ${y})`)
                .attr('fill', '#8b5cf6')
                .attr('stroke', 'white')
                .attr('stroke-width', 2)
                .attr('opacity', 0.85)
                .style('cursor', 'pointer')
                .style('filter', 'drop-shadow(0 0 4px #8b5cf6)')
                .on('mouseover', (event) => {
                    path
                        .transition()
                        .duration(150)
                        .attr('opacity', 1)
                        .style('filter', 'drop-shadow(0 0 8px #8b5cf6)');
                    const symbol = d3.symbol().type(d3.symbolTriangle).size(140);
                    path.attr('d', symbol);
                    this.showEnhancedTooltip(event, action, action.typeFR || action.type?.displayName, '#8b5cf6');
                })
                .on('mouseout', () => {
                    path
                        .transition()
                        .duration(150)
                        .attr('opacity', 0.85)
                        .style('filter', 'drop-shadow(0 0 4px #8b5cf6)');
                    path.attr('d', triangle);
                    this.tooltip.style.display = 'none';
                });
        });
    }

    drawArrowToGoal(g, event, opacity = 0.5) {
        const [x, y] = this.pitch.toPixels(event.x, event.y);
        
        // Position du centre de la cage (TOUJOURS à 100% de x, 50% de y)
        const [goalX, goalY] = this.pitch.toPixels(100, 50);
        
        // Calculer l'angle vers la cage
        const dx = goalX - x;
        const dy = goalY - y;
        const angle = Math.atan2(dy, dx);
        
        // Point de fin de la flèche (plus court que la distance totale)
        const arrowLength = Math.min(Math.sqrt(dx*dx + dy*dy) * 0.8, 150);
        const endX = x + arrowLength * Math.cos(angle);
        const endY = y + arrowLength * Math.sin(angle);
        
        // Couleur selon le type : jaune doré pour but, rouge pour le reste
        const isGoal = event.type?.displayName === 'Goal';
        const arrowColor = isGoal ? '#eab308' : '#ef4444';
        
        // Dégradé pour la flèche
        const gradientId = `arrowGradient-${Math.random().toString(36).substr(2, 9)}`;
        const defs = g.append('defs');
        const gradient = defs.append('linearGradient')
            .attr('id', gradientId)
            .attr('x1', '0%')
            .attr('y1', '0%')
            .attr('x2', '100%')
            .attr('y2', '0%');
        
        gradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', arrowColor)
            .attr('stop-opacity', opacity * 0.8);
        
        gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', arrowColor)
            .attr('stop-opacity', 0);
        
        // Créer un marker spécifique pour cette flèche avec la bonne couleur
        const markerId = `arrowhead-${isGoal ? 'goal' : 'shot'}-${Math.random().toString(36).substr(2, 9)}`;
        defs.append('marker')
            .attr('id', markerId)
            .attr('viewBox', '0 0 10 10')
            .attr('refX', 9)
            .attr('refY', 5)
            .attr('markerWidth', 3)
            .attr('markerHeight', 3)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M 0 0 L 10 5 L 0 10 z')
            .attr('fill', arrowColor)
            .attr('opacity', opacity * 0.8);
        
        // Ligne de trajectoire SOLIDE et ÉPAISSE avec opacité réduite
        g.append('line')
            .attr('x1', x)
            .attr('y1', y)
            .attr('x2', endX)
            .attr('y2', endY)
            .attr('stroke', `url(#${gradientId})`)
            .attr('stroke-width', 5)
            .attr('stroke-linecap', 'round')
            .attr('marker-end', `url(#${markerId})`)
            .style('pointer-events', 'none');
    }

    showEnhancedTooltip(event, ev, label, color) {
        this.tooltip.style.display = 'block';
        this.tooltip.style.left = (event.pageX + 15) + 'px';
        this.tooltip.style.top = (event.pageY - 10) + 'px';
        
        let content = `
            <div style="min-width: 180px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <div style="width: 12px; height: 12px; background: ${color}; border-radius: 50%; box-shadow: 0 0 8px ${color};"></div>
                    <strong style="font-size: 1.05rem;">${label}</strong>
                </div>
                <div style="display: flex; flex-direction: column; gap: 4px; font-size: 0.9rem;">
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: #94a3b8;">Minute:</span>
                        <strong>${ev.minute}'</strong>
                    </div>
        `;
        
        if (ev.expandedMinute && ev.expandedMinute !== ev.minute) {
            content += `
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: #94a3b8;">Temps exact:</span>
                        <strong>${ev.expandedMinute}'</strong>
                    </div>
            `;
        }

        if (ev.outcomeTypeFR) {
            const outcomeColor = ev.outcomeType?.value === 1 ? '#22c55e' : '#ef4444';
            content += `
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: #94a3b8;">Résultat:</span>
                        <strong style="color: ${outcomeColor};">${ev.outcomeTypeFR}</strong>
                    </div>
            `;
        }

        // Position sur le terrain
        content += `
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: #94a3b8;">Position:</span>
                        <strong>${Math.round(ev.x)}%, ${Math.round(ev.y)}%</strong>
                    </div>
        `;

        // Qualifiers (passes clés, etc.)
        if (ev.qualifiers && ev.qualifiers.length > 0) {
            const importantQualifiers = ev.qualifiers.filter(q => 
                ['KeyPass', 'Assist', 'BigChanceCreated', 'Longball', 'Cross', 'Throughball'].includes(q.type?.displayName)
            );
            
            if (importantQualifiers.length > 0) {
                content += `
                    <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1);">
                        <span style="color: #94a3b8; font-size: 0.85rem;">Spécial:</span>
                        <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px;">
                `;
                
                importantQualifiers.forEach(q => {
                    const qColor = q.type?.displayName === 'Assist' ? '#eab308' : '#3b82f6';
                    content += `
                            <span style="background: ${qColor}33; color: ${qColor}; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">
                                ${q.type?.displayName}
                            </span>
                    `;
                });
                
                content += `
                        </div>
                    </div>
                `;
            }
        }

        content += `
                </div>
            </div>
        `;
        
        this.tooltip.innerHTML = content;
    }

    showGoalPreview(event, shot) {
        // Créer une mini-vue 2D de la cage si elle n'existe pas
        let preview = document.getElementById('goal-preview');
        if (!preview) {
            preview = document.createElement('div');
            preview.id = 'goal-preview';
            preview.style.cssText = `
                position: fixed;
                background: rgba(10, 14, 26, 0.98);
                border: 2px solid rgba(59, 130, 246, 0.5);
                border-radius: 16px;
                padding: 20px;
                width: 400px;
                box-shadow: 0 12px 48px rgba(0, 0, 0, 0.7);
                z-index: 10000;
                pointer-events: none;
                backdrop-filter: blur(12px);
            `;
            document.body.appendChild(preview);
        }

        // Positionner le preview
        const viewportWidth = window.innerWidth;
        const previewLeft = event.pageX + 420 < viewportWidth ? event.pageX + 20 : event.pageX - 420;
        preview.style.left = previewLeft + 'px';
        preview.style.top = (event.pageY - 150) + 'px';
        preview.style.display = 'block';

        // Dimensions réalistes du but (7.32m x 2.44m) avec perspective
        const goalWidth = 360;
        const goalHeight = 220;
        
        // Estimer où le tir est allé (basé sur la position Y et X)
        const shotY = shot.endY || shot.y;
        const shotX = 100; // Toujours vers la cage (100%)
        
        // Convertir en coordonnées de cage
        const targetX = ((shotY - 50) / 50) * (goalWidth / 2) + (goalWidth / 2);
        const targetY = goalHeight * 0.2 + ((shotX - 83.5) / 16.5) * (goalHeight * 0.6);
        
        const isGoal = shot.type?.displayName === 'Goal';
        const isSaved = shot.type?.displayName === 'SavedShot';
        const isPost = shot.type?.displayName === 'ShotOnPost';
        
        const shotColor = isGoal ? '#eab308' : (isSaved ? '#f97316' : '#ef4444');
        
        // Calcul de la distance du tir (pour effet de trajectoire)
        const distanceFromGoal = 105 - shot.x; // Distance approximative
        
        preview.innerHTML = `
            <div style="text-align: center; margin-bottom: 12px;">
                <div style="color: #3b82f6; font-weight: 700; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">
                    Vue de face • 7.32m × 2.44m
                </div>
                <div style="color: #cbd5e1; font-weight: 600; font-size: 1.1rem;">
                    ${isGoal ? '⚽ BUT MARQUÉ' : isSaved ? '🎯 TIR CADRÉ' : isPost ? '🥅 POTEAU' : '❌ À CÔTÉ'}
                </div>
            </div>
            <svg width="${goalWidth}" height="${goalHeight}" style="border-radius: 8px; background: linear-gradient(180deg, #1a472a 0%, #0d2817 100%); overflow: visible;">
                <defs>
                    <!-- Dégradé pour le filet 3D -->
                    <linearGradient id="netGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color:rgba(255,255,255,0.5);stop-opacity:1" />
                        <stop offset="50%" style="stop-color:rgba(255,255,255,0.25);stop-opacity:1" />
                        <stop offset="100%" style="stop-color:rgba(255,255,255,0.1);stop-opacity:1" />
                    </linearGradient>
                    
                    <!-- Dégradé pour profondeur -->
                    <linearGradient id="depthGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" style="stop-color:rgba(0,0,0,0.4);stop-opacity:1" />
                        <stop offset="50%" style="stop-color:rgba(0,0,0,0);stop-opacity:1" />
                        <stop offset="100%" style="stop-color:rgba(0,0,0,0.4);stop-opacity:1" />
                    </linearGradient>
                    
                    <!-- Glow pour le ballon -->
                    <filter id="ballGlow">
                        <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                    
                    <!-- Pattern pour le filet -->
                    <pattern id="netPattern" x="0" y="0" width="25" height="25" patternUnits="userSpaceOnUse">
                        <line x1="0" y1="0" x2="0" y2="25" stroke="url(#netGradient)" stroke-width="2" opacity="0.7"/>
                        <line x1="0" y1="0" x2="25" y2="0" stroke="url(#netGradient)" stroke-width="2" opacity="0.7"/>
                    </pattern>
                </defs>
                
                <!-- Fond de profondeur de la cage -->
                <rect x="25" y="25" width="${goalWidth - 50}" height="${goalHeight * 0.55}" 
                      fill="rgba(0,0,0,0.3)" rx="4"/>
                
                <!-- Filet du fond avec perspective 3D -->
                <path d="M 25 25 
                         L ${goalWidth / 2} 50
                         L ${goalWidth - 25} 25 Z"
                      fill="rgba(255,255,255,0.05)"/>
                
                <!-- Filet arrière avec pattern -->
                <rect x="35" y="35" width="${goalWidth - 70}" height="${goalHeight * 0.5}" 
                      fill="url(#netPattern)" opacity="0.6"/>
                
                <!-- Lignes de profondeur (perspective) -->
                ${Array.from({length: 8}, (_, i) => {
                    const x = 35 + (i * (goalWidth - 70) / 7);
                    return `<line x1="${x}" y1="35" x2="${25 + (i * (goalWidth - 50) / 7)}" y2="${goalHeight * 0.55 + 25}" 
                                  stroke="rgba(255,255,255,0.2)" stroke-width="1.5" opacity="0.5"/>`;
                }).join('')}
                
                <!-- Lignes horizontales de profondeur -->
                ${Array.from({length: 5}, (_, i) => {
                    const y = 35 + (i * (goalHeight * 0.5) / 4);
                    const ratio = i / 4;
                    const leftX = 35 + (10 * ratio);
                    const rightX = (goalWidth - 35) - (10 * ratio);
                    return `<line x1="${leftX}" y1="${y}" x2="${rightX}" y2="${y}" 
                                  stroke="rgba(255,255,255,0.2)" stroke-width="1.5" opacity="0.5"/>`;
                }).join('')}
                
                <!-- CADRE DU BUT - Sans barre du bas pour effet ouvert -->
                <g id="goalFrame">
                    <!-- Poteau gauche (avec effet 3D) -->
                    <rect x="20" y="20" width="10" height="${goalHeight * 0.6}" 
                          fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5" rx="5"
                          style="filter: drop-shadow(3px 3px 6px rgba(0,0,0,0.6))"/>
                    <rect x="22" y="20" width="3" height="${goalHeight * 0.6}" 
                          fill="rgba(255,255,255,0.4)" rx="2"/>
                    
                    <!-- Poteau droit (avec effet 3D) -->
                    <rect x="${goalWidth - 30}" y="20" width="10" height="${goalHeight * 0.6}" 
                          fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5" rx="5"
                          style="filter: drop-shadow(3px 3px 6px rgba(0,0,0,0.6))"/>
                    <rect x="${goalWidth - 28}" y="20" width="3" height="${goalHeight * 0.6}" 
                          fill="rgba(255,255,255,0.4)" rx="2"/>
                    
                    <!-- Barre transversale (avec effet 3D) -->
                    <rect x="20" y="20" width="${goalWidth - 40}" height="10" 
                          fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5" rx="5"
                          style="filter: drop-shadow(3px 3px 6px rgba(0,0,0,0.6))"/>
                    <rect x="20" y="22" width="${goalWidth - 40}" height="3" 
                          fill="rgba(255,255,255,0.4)" rx="2"/>
                </g>
                
                <!-- Filet latéral gauche -->
                <path d="M 30 30 L 30 ${goalHeight * 0.6 + 20} L 35 ${goalHeight * 0.55 + 25} L 35 35 Z"
                      fill="url(#netPattern)" opacity="0.4"/>
                
                <!-- Filet latéral droit -->
                <path d="M ${goalWidth - 30} 30 L ${goalWidth - 30} ${goalHeight * 0.6 + 20} 
                         L ${goalWidth - 35} ${goalHeight * 0.55 + 25} L ${goalWidth - 35} 35 Z"
                      fill="url(#netPattern)" opacity="0.4"/>
                
                <!-- Ligne de sol (pelouse) avec dégradé -->
                <line x1="0" y1="${goalHeight * 0.8}" x2="${goalWidth}" y2="${goalHeight * 0.8}" 
                      stroke="rgba(34, 197, 94, 0.4)" stroke-width="3" stroke-dasharray="10,5"/>
                
                <!-- Trajectoire du ballon avec courbe physique -->
                <path d="M ${goalWidth / 2} ${goalHeight}
                         Q ${goalWidth / 2 + (targetX - goalWidth / 2) * 0.6} ${goalHeight - distanceFromGoal * 4}
                           ${targetX} ${targetY}"
                      stroke="${shotColor}" 
                      stroke-width="3.5" 
                      stroke-dasharray="10,8" 
                      fill="none"
                      opacity="0.8"
                      style="filter: drop-shadow(0 0 8px ${shotColor})">
                    <animate attributeName="stroke-dashoffset" 
                             from="150" to="0" 
                             dur="1.8s" 
                             repeatCount="indefinite"/>
                </path>
                
                <!-- Ballon à l'impact -->
                <g id="ball">
                    <!-- Ombre du ballon sur le filet -->
                    <ellipse cx="${targetX}" cy="${targetY + 18}" rx="12" ry="5"
                            fill="rgba(0,0,0,0.4)" opacity="0.5">
                        <animate attributeName="opacity" values="0.5;0.2;0.5" dur="1.3s" repeatCount="indefinite"/>
                    </ellipse>
                    
                    <!-- Ballon principal avec texture -->
                    <circle cx="${targetX}" cy="${targetY}" r="13" 
                            fill="${shotColor}" 
                            stroke="white" 
                            stroke-width="3"
                            filter="url(#ballGlow)"
                            style="filter: drop-shadow(0 6px 16px ${shotColor})">
                        <animate attributeName="r" values="13;15;13" dur="1.1s" repeatCount="indefinite"/>
                    </circle>
                    
                    <!-- Motif ballon (pentagones) -->
                    <path d="M ${targetX} ${targetY - 7}
                             L ${targetX + 4} ${targetY - 3}
                             L ${targetX + 3} ${targetY + 4}
                             L ${targetX - 3} ${targetY + 4}
                             L ${targetX - 4} ${targetY - 3} Z"
                          fill="rgba(0,0,0,0.35)"/>
                    <circle cx="${targetX}" cy="${targetY}" r="4" fill="rgba(0,0,0,0.25)"/>
                    
                    <!-- Lignes du ballon -->
                    <path d="M ${targetX - 9} ${targetY} Q ${targetX} ${targetY - 3} ${targetX + 9} ${targetY}"
                          stroke="rgba(0,0,0,0.2)" stroke-width="1.5" fill="none"/>
                </g>
                
                ${isPost ? `
                    <!-- Effet rebond sur le poteau -->
                    <circle cx="${targetX < goalWidth / 2 ? 25 : goalWidth - 25}" cy="${targetY}" r="25"
                            fill="none" stroke="#fbbf24" stroke-width="4" opacity="0.8">
                        <animate attributeName="r" values="18;30;18" dur="0.9s" repeatCount="indefinite"/>
                        <animate attributeName="opacity" values="0.8;0;0.8" dur="0.9s" repeatCount="indefinite"/>
                    </circle>
                    <circle cx="${targetX < goalWidth / 2 ? 25 : goalWidth - 25}" cy="${targetY}" r="15"
                            fill="none" stroke="#fbbf24" stroke-width="2" opacity="0.5">
                        <animate attributeName="r" values="10;20;10" dur="0.9s" repeatCount="indefinite"/>
                        <animate attributeName="opacity" values="0.5;0;0.5" dur="0.9s" repeatCount="indefinite"/>
                    </circle>
                ` : ''}
                
                <!-- Lignes de vitesse derrière le ballon -->
                ${Array.from({length: 4}, (_, i) => `
                    <line x1="${targetX - 20 - i * 10}" y1="${targetY - 2 + i * 1}" 
                          x2="${targetX - 32 - i * 10}" y2="${targetY - 2 + i * 1}" 
                          stroke="${shotColor}" 
                          stroke-width="3" 
                          opacity="${0.5 - i * 0.12}"
                          stroke-linecap="round">
                        <animate attributeName="x1" 
                                 values="${targetX - 20 - i * 10};${targetX - 15 - i * 10};${targetX - 20 - i * 10}" 
                                 dur="0.6s" repeatCount="indefinite"/>
                        <animate attributeName="x2" 
                                 values="${targetX - 32 - i * 10};${targetX - 27 - i * 10};${targetX - 32 - i * 10}" 
                                 dur="0.6s" repeatCount="indefinite"/>
                    </line>
                `).join('')}
                
                ${isGoal ? `
                    <!-- Effet d'explosion pour un but -->
                    <circle cx="${targetX}" cy="${targetY}" r="30" fill="none" stroke="#eab308" stroke-width="3" opacity="0.6">
                        <animate attributeName="r" values="15;50;15" dur="1.5s" repeatCount="indefinite"/>
                        <animate attributeName="opacity" values="0.6;0;0.6" dur="1.5s" repeatCount="indefinite"/>
                    </circle>
                    <circle cx="${targetX}" cy="${targetY}" r="20" fill="none" stroke="#fbbf24" stroke-width="2" opacity="0.4">
                        <animate attributeName="r" values="10;35;10" dur="1.5s" begin="0.3s" repeatCount="indefinite"/>
                        <animate attributeName="opacity" values="0.4;0;0.4" dur="1.5s" begin="0.3s" repeatCount="indefinite"/>
                    </circle>
                ` : ''}
            </svg>
            
            <!-- Statistiques du tir -->
            <div style="margin-top: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.8rem;">
                <div style="background: rgba(59, 130, 246, 0.15); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(59, 130, 246, 0.4);">
                    <div style="color: #94a3b8; font-size: 0.7rem; margin-bottom: 2px;">Distance</div>
                    <div style="color: #3b82f6; font-weight: 700; font-size: 1.1rem;">${distanceFromGoal.toFixed(1)}m</div>
                </div>
                <div style="background: rgba(234, 179, 8, 0.15); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(234, 179, 8, 0.4);">
                    <div style="color: #94a3b8; font-size: 0.7rem; margin-bottom: 2px;">Angle</div>
                    <div style="color: #eab308; font-weight: 700; font-size: 1.1rem;">${Math.abs(50 - shotY).toFixed(0)}°</div>
                </div>
            </div>
        `;
    }

    hideGoalPreview() {
        const preview = document.getElementById('goal-preview');
        if (preview) {
            preview.style.display = 'none';
        }
    }

    addLegend(g) {
        const legendX = this.pitch.margin + 20;
        const legendY = this.pitch.margin + 20;

        // Fond avec effet glassmorphism
        g.append('rect')
            .attr('x', legendX - 12)
            .attr('y', legendY - 12)
            .attr('width', 190)
            .attr('height', 150)
            .attr('fill', 'rgba(13, 17, 23, 0.85)')
            .attr('rx', 10)
            .style('backdrop-filter', 'blur(10px)')
            .attr('stroke', 'rgba(59, 130, 246, 0.3)')
            .attr('stroke-width', 1);

        // Titre
        g.append('text')
            .attr('x', legendX)
            .attr('y', legendY + 5)
            .attr('fill', '#cbd5e1')
            .style('font-size', '13px')
            .style('font-weight', '700')
            .text('Types d\'actions');

        const items = [
            { y: 28, type: 'circle', color: '#eab308', text: 'Buts', size: 8 },
            { y: 52, type: 'circle', color: '#ef4444', text: 'Tirs', size: 5 },
            { y: 76, type: 'diamond', color: '#22c55e', text: 'Dribbles réussis', size: 7 },
            { y: 100, type: 'triangle', color: '#8b5cf6', text: 'Actions défensives', size: 8 }
        ];

        items.forEach(item => {
            const cx = legendX + 18;
            const cy = legendY + item.y;

            if (item.type === 'circle') {
                g.append('circle')
                    .attr('cx', cx)
                    .attr('cy', cy)
                    .attr('r', item.size)
                    .attr('fill', item.color)
                    .attr('stroke', 'white')
                    .attr('stroke-width', 2)
                    .style('filter', `drop-shadow(0 0 6px ${item.color})`);
            } else if (item.type === 'diamond') {
                g.append('rect')
                    .attr('x', cx - item.size)
                    .attr('y', cy - item.size)
                    .attr('width', item.size * 2)
                    .attr('height', item.size * 2)
                    .attr('fill', item.color)
                    .attr('stroke', 'white')
                    .attr('stroke-width', 2)
                    .attr('transform', `rotate(45, ${cx}, ${cy})`)
                    .style('filter', `drop-shadow(0 0 6px ${item.color})`);
            } else if (item.type === 'triangle') {
                const triangle = d3.symbol().type(d3.symbolTriangle).size(100);
                g.append('path')
                    .attr('d', triangle)
                    .attr('transform', `translate(${cx}, ${cy})`)
                    .attr('fill', item.color)
                    .attr('stroke', 'white')
                    .attr('stroke-width', 2)
                    .style('filter', `drop-shadow(0 0 6px ${item.color})`);
            }

            // Texte
            g.append('text')
                .attr('x', cx + 25)
                .attr('y', cy + 4)
                .attr('fill', 'white')
                .style('font-size', '11px')
                .style('font-weight', '500')
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

