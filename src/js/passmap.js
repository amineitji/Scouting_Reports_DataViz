import { Pitch } from './pitch.js';

export class PassMap {
    constructor(svgId, events) {
        this.pitch = new Pitch(svgId);
        this.passes = events.filter(e => 
            e.type?.displayName === 'Pass' && e.x != null && e.endX != null
        );
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

        // Tri par importance (key passes en dernier pour être visibles)
        const sortedPasses = [...this.passes].sort((a, b) => {
            const aKey = this.isKeyPass(a);
            const bKey = this.isKeyPass(b);
            if (aKey && !bKey) return 1;
            if (!aKey && bKey) return -1;
            return 0;
        });

        sortedPasses.forEach(pass => {
            const isSuccess = pass.outcomeType?.value === 1;
            const isKeyPass = this.isKeyPass(pass);
            const isProgressive = this.isProgressivePass(pass);
            
            if (isKeyPass && !this.options.showKeyPasses) return;
            if (!isKeyPass && isSuccess && !this.options.showSuccessful) return;
            if (!isSuccess && !this.options.showFailed) return;

            // Couleurs et styles
            let color, width, opacity;
            
            if (isKeyPass) {
                color = '#fbbf24'; // Or
                width = 4;
                opacity = 1;
            } else if (isProgressive) {
                color = isSuccess ? '#10b981' : '#ef4444'; // Vert/Rouge
                width = 3;
                opacity = 0.8;
            } else {
                color = isSuccess ? '#3b82f6' : '#ef4444'; // Bleu/Rouge
                width = 2;
                opacity = 0.6;
            }

            const [x1, y1] = this.pitch.toPixels(pass.x, pass.y);
            const [x2, y2] = this.pitch.toPixels(pass.endX, pass.endY);

            // Ligne principale
            const line = g.append('line')
                .attr('x1', x1).attr('y1', y1)
                .attr('x2', x2).attr('y2', y2)
                .attr('stroke', color)
                .attr('stroke-width', width)
                .attr('opacity', opacity)
                .attr('marker-end', `url(#arrow-pass-${isKeyPass ? 'key' : (isSuccess ? 'ok' : 'ko')})`);

            // Zone de survol invisible
            g.append('line')
                .attr('x1', x1).attr('y1', y1)
                .attr('x2', x2).attr('y2', y2)
                .attr('stroke', 'transparent')
                .attr('stroke-width', 15)
                .style('cursor', 'pointer')
                .on('mouseover', (e) => {
                    line.attr('stroke', 'white').attr('stroke-width', width + 2).attr('opacity', 1);
                    this.showTooltip(e, pass, isKeyPass, isProgressive);
                })
                .on('mouseout', () => {
                    line.attr('stroke', color).attr('stroke-width', width).attr('opacity', opacity);
                    this.hideTooltip();
                });

            // Point de départ
            if (isKeyPass) {
                g.append('circle')
                    .attr('cx', x1).attr('cy', y1)
                    .attr('r', 4)
                    .attr('fill', color)
                    .attr('stroke', 'white')
                    .attr('stroke-width', 1.5)
                    .style('pointer-events', 'none');
            }
        });
    }

    isKeyPass(pass) {
        return pass.qualifiers?.some(q => 
            ['KeyPass', 'Assist', 'IntentionalGoalAssist', 'BigChanceCreated'].includes(q.type?.displayName)
        );
    }

    isProgressivePass(pass) {
        if (!pass.endX) return false;
        const dx = pass.endX - pass.x;
        const distance = Math.abs(dx) * 1.05; // en mètres
        return dx > 0 && distance > 10;
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
                    .attr('refX', 9)
                    .attr('refY', 5)
                    .attr('markerWidth', 5)
                    .attr('markerHeight', 5)
                    .attr('orient', 'auto')
                    .append('path')
                    .attr('d', 'M 0 0 L 10 5 L 0 10 z')
                    .attr('fill', color);
            }
        };
        
        createMarker('arrow-pass-ok', '#3b82f6');
        createMarker('arrow-pass-ko', '#ef4444');
        createMarker('arrow-pass-key', '#fbbf24');
    }

    showTooltip(e, pass, isKey, isProg) {
        const dx = (pass.endX - pass.x) * 1.05;
        const dy = (pass.endY - pass.y) * 0.68;
        const dist = Math.sqrt(dx * dx + dy * dy).toFixed(1);
        
        let type = pass.outcomeType?.value === 1 ? 'Passe Réussie' : 'Passe Ratée';
        if (isKey) type = '🔑 Passe Clé/Décisive';
        else if (isProg) type = '⬆️ Passe Progressive';
        
        const qualifiers = [];
        pass.qualifiers?.forEach(q => {
            const name = q.type?.displayName;
            if (['Cross', 'Throughball', 'Longball', 'Chipped'].includes(name)) {
                qualifiers.push(name);
            }
        });
        
        this.tooltip.style.display = 'block';
        this.tooltip.style.left = (e.pageX + 15) + 'px';
        this.tooltip.style.top = (e.pageY - 15) + 'px';
        this.tooltip.innerHTML = `
            <strong>${type}</strong><br>
            Distance: ${dist}m<br>
            Minute: ${pass.minute}'
            ${qualifiers.length > 0 ? '<br><span style="color:#94a3b8">' + qualifiers.join(', ') + '</span>' : ''}
        `;
    }

    hideTooltip() { 
        this.tooltip.style.display = 'none'; 
    }
}