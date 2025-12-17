/**
 * passmap.js - VERSION AMÉLIORÉE
 * Carte des passes avec transitions fluides et tooltips détaillés
 */
import { Pitch } from './pitch.js';

export class PassMap {
    constructor(svgId, events) {
        this.pitch = new Pitch(svgId);
        this.passes = events.filter(e => e.type?.displayName === 'Pass' && e.endX != null);
        this.options = { 
            showKeyPasses: true, 
            showFailed: true, 
            showSuccessful: true 
        };
        this.tooltip = document.getElementById('tooltip');
        this.render();
    }
    
    updateOptions(opts) { 
        this.options = { ...this.options, ...opts };
        this.render(); 
    }

    render() {
        this.pitch.clearDataLayer();
        const g = this.pitch.getGroup();
        this.defineMarkers();

        // Groupe pour les passes (ordre de rendu)
        const passesGroup = g.append('g').attr('class', 'passes-layer');

        this.passes.forEach(pass => {
            const isSuccess = pass.outcomeType?.value === 1;
            const isKey = pass.qualifiers?.some(q => 
                ['KeyPass', 'Assist', 'IntentionalGoalAssist', 'BigChanceCreated'].includes(q.type?.displayName)
            );
            
            if (isKey && !this.options.showKeyPasses) return;
            if (!isKey && isSuccess && !this.options.showSuccessful) return;
            if (!isSuccess && !this.options.showFailed) return;

            const color = isKey ? '#fbbf24' : (isSuccess ? '#3b82f6' : '#ef4444');
            const [x1, y1] = this.pitch.toPixels(pass.x, pass.y);
            const [x2, y2] = this.pitch.toPixels(pass.endX, pass.endY);

            // Calculer la distance de la passe
            const distance = Math.sqrt(Math.pow(pass.endX - pass.x, 2) + Math.pow(pass.endY - pass.y, 2));

            // Ligne de passe avec animation au survol
            const line = passesGroup.append('line')
                .attr('x1', x1)
                .attr('y1', y1)
                .attr('x2', x2)
                .attr('y2', y2)
                .attr('stroke', color)
                .attr('stroke-width', isKey ? 3.5 : 2)
                .attr('opacity', 0)
                .attr('marker-end', `url(#arrow-${isKey ? 'key' : (isSuccess ? 'ok' : 'ko')})`)
                .style('transition', 'all 0.3s ease');

            // Animation d'entrée
            line.transition()
                .duration(500)
                .delay(Math.random() * 300)
                .attr('opacity', isKey ? 0.85 : 0.65);

            // Cercle de départ (optionnel, pour les passes clés)
            if (isKey) {
                passesGroup.append('circle')
                    .attr('cx', x1)
                    .attr('cy', y1)
                    .attr('r', 4)
                    .attr('fill', color)
                    .attr('stroke', 'white')
                    .attr('stroke-width', 1.5)
                    .style('filter', `drop-shadow(0 0 6px ${color})`);
            }

            // Zone interactive (plus large que la ligne visible)
            const interactiveLine = passesGroup.append('line')
                .attr('x1', x1)
                .attr('y1', y1)
                .attr('x2', x2)
                .attr('y2', y2)
                .attr('stroke', 'transparent')
                .attr('stroke-width', 12)
                .style('cursor', 'pointer')
                .on('mouseover', (e) => {
                    line.transition()
                        .duration(200)
                        .attr('opacity', 1)
                        .attr('stroke-width', isKey ? 5 : 3.5)
                        .style('filter', `drop-shadow(0 0 8px ${color})`);
                    this.showEnhancedTooltip(e, pass, color, distance);
                })
                .on('mouseout', () => {
                    line.transition()
                        .duration(200)
                        .attr('opacity', isKey ? 0.85 : 0.65)
                        .attr('stroke-width', isKey ? 3.5 : 2)
                        .style('filter', 'none');
                    this.tooltip.style.display = 'none';
                });
        });

        // Légende améliorée
        this.addEnhancedLegend(g);
    }
    
    showEnhancedTooltip(e, pass, color, distance) {
        this.tooltip.style.display = 'block';
        this.tooltip.style.left = (e.pageX + 15) + 'px';
        this.tooltip.style.top = (e.pageY - 10) + 'px';
        
        const isSuccess = pass.outcomeType?.value === 1;
        const outcomeColor = isSuccess ? '#22c55e' : '#ef4444';
        const outcomeIcon = isSuccess ? '✓' : '✗';
        
        // Récupérer les qualifiers spéciaux
        const specialQualifiers = pass.qualifiers?.filter(q => 
            ['KeyPass', 'Assist', 'IntentionalGoalAssist', 'BigChanceCreated', 'Longball', 'Cross', 'Throughball', 'Chipped'].includes(q.type?.displayName)
        ) || [];

        let content = `
            <div style="min-width: 200px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <div style="width: 12px; height: 12px; background: ${color}; border-radius: 50%; box-shadow: 0 0 8px ${color};"></div>
                    <strong style="font-size: 1.05rem;">Passe</strong>
                    <span style="background: ${outcomeColor}33; color: ${outcomeColor}; padding: 2px 8px; border-radius: 4px; font-size: 0.85rem; font-weight: 600; margin-left: auto;">
                        ${outcomeIcon} ${pass.outcomeTypeFR || pass.outcomeType?.displayName}
                    </span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 5px; font-size: 0.9rem;">
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: #94a3b8;">Minute:</span>
                        <strong>${pass.minute}'</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: #94a3b8;">Distance:</span>
                        <strong>${distance.toFixed(1)}m</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: #94a3b8;">De:</span>
                        <strong>${Math.round(pass.x)}%, ${Math.round(pass.y)}%</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: #94a3b8;">Vers:</span>
                        <strong>${Math.round(pass.endX)}%, ${Math.round(pass.endY)}%</strong>
                    </div>
        `;

        // Afficher les qualifiers spéciaux
        if (specialQualifiers.length > 0) {
            content += `
                    <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1);">
                        <div style="display: flex; flex-wrap: wrap; gap: 4px;">
            `;
            
            specialQualifiers.forEach(q => {
                let qColor = '#3b82f6';
                let qIcon = '⚡';
                
                if (q.type?.displayName === 'Assist') {
                    qColor = '#eab308';
                    qIcon = '🎯';
                } else if (q.type?.displayName === 'KeyPass') {
                    qColor = '#f59e0b';
                    qIcon = '🔑';
                } else if (q.type?.displayName === 'BigChanceCreated') {
                    qColor = '#22c55e';
                    qIcon = '💥';
                } else if (q.type?.displayName === 'Throughball') {
                    qIcon = '➡️';
                } else if (q.type?.displayName === 'Cross') {
                    qIcon = '✈️';
                } else if (q.type?.displayName === 'Longball') {
                    qIcon = '🚀';
                }
                
                content += `
                            <span style="background: ${qColor}33; color: ${qColor}; padding: 3px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; display: flex; align-items: center; gap: 4px;">
                                <span>${qIcon}</span>
                                <span>${q.type?.displayName}</span>
                            </span>
                `;
            });
            
            content += `
                        </div>
                    </div>
            `;
        }

        content += `
                </div>
            </div>
        `;
        
        this.tooltip.innerHTML = content;
    }

    defineMarkers() {
        const defs = this.pitch.svg.select('defs').empty() 
            ? this.pitch.svg.append('defs') 
            : this.pitch.svg.select('defs');
        
        const markers = [
            { id: 'ok', color: '#3b82f6', name: 'Réussie' },
            { id: 'ko', color: '#ef4444', name: 'Ratée' },
            { id: 'key', color: '#fbbf24', name: 'Clé' }
        ];

        markers.forEach(marker => {
            if (defs.select(`#arrow-${marker.id}`).empty()) {
                const markerEl = defs.append('marker')
                    .attr('id', `arrow-${marker.id}`)
                    .attr('viewBox', '0 0 10 10')
                    .attr('refX', 8)
                    .attr('refY', 5)
                    .attr('markerWidth', 5)
                    .attr('markerHeight', 5)
                    .attr('orient', 'auto');

                markerEl.append('path')
                    .attr('d', 'M 0 0 L 10 5 L 0 10 z')
                    .attr('fill', marker.color)
                    .style('filter', `drop-shadow(0 0 3px ${marker.color})`);
            }
        });
    }

    addEnhancedLegend(g) {
        const legendX = this.pitch.margin + 20;
        const legendY = this.pitch.margin + 20;

        // Fond glassmorphism
        g.append('rect')
            .attr('x', legendX - 12)
            .attr('y', legendY - 12)
            .attr('width', 195)
            .attr('height', 120)
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
            .text('Types de passes');

        const items = [
            { y: 30, color: '#fbbf24', text: 'Passes clés', width: 3.5 },
            { y: 55, color: '#3b82f6', text: 'Passes réussies', width: 2 },
            { y: 80, color: '#ef4444', text: 'Passes ratées', width: 2 }
        ];

        items.forEach(item => {
            const lineY = legendY + item.y;
            
            // Ligne de légende
            g.append('line')
                .attr('x1', legendX)
                .attr('y1', lineY)
                .attr('x2', legendX + 30)
                .attr('y2', lineY)
                .attr('stroke', item.color)
                .attr('stroke-width', item.width)
                .attr('marker-end', `url(#arrow-${item.color === '#fbbf24' ? 'key' : (item.color === '#3b82f6' ? 'ok' : 'ko')})`)
                .style('filter', `drop-shadow(0 0 4px ${item.color})`);

            // Texte
            g.append('text')
                .attr('x', legendX + 40)
                .attr('y', lineY + 4)
                .attr('fill', 'white')
                .style('font-size', '11px')
                .style('font-weight', '500')
                .text(item.text);
        });
    }
}