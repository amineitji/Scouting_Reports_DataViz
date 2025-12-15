import { Pitch } from './pitch.js';

export class PassMap {
    constructor(svgId, events) {
        this.pitch = new Pitch(svgId);
        this.passes = events.filter(e => 
            e.type?.displayName === 'Pass' && e.x != null && e.endX != null
        );
        this.options = { showKeyPasses: true, showFailed: true, showSuccessful: true };
        this.tooltip = document.getElementById('tooltip');
        this.render();
    }
    
    updateOptions(opts) { this.options = { ...this.options, ...opts }; this.render(); }

    render() {
        this.pitch.clearDataLayer();
        const g = this.pitch.getGroup();
        this.defineMarkers();

        this.passes.forEach(pass => {
            const isSuccess = pass.outcomeType.value === 1;
            const isKeyPass = this.isKeyPass(pass);
            
            if (isKeyPass && !this.options.showKeyPasses) return;
            if (!isKeyPass && isSuccess && !this.options.showSuccessful) return;
            if (!isSuccess && !this.options.showFailed) return;

            // Couleurs Haute Visibilité
            let color = isSuccess ? '#0044cc' : '#cc0000'; // Bleu Roi / Rouge Vif
            let width = 3;
            if (isKeyPass) { color = '#FFD700'; width = 5; } // Or pour KeyPass

            // Conversion % -> Pixels
            const [x1, y1] = this.pitch.toPixels(pass.x, pass.y);
            const [x2, y2] = this.pitch.toPixels(pass.endX, pass.endY);

            // Ligne visible
            const line = g.append('line')
                .attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2)
                .attr('stroke', color).attr('stroke-width', width)
                .attr('opacity', 0.9)
                .attr('marker-end', `url(#arrow-pass-${isKeyPass?'key':(isSuccess?'ok':'ko')})`);

            // Zone invisible pour faciliter le survol
            g.append('line')
                .attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2)
                .attr('stroke', 'transparent').attr('stroke-width', 15)
                .style('cursor', 'pointer')
                .on('mouseover', (e) => {
                    line.attr('stroke', 'white').attr('stroke-width', width + 2);
                    this.showTooltip(e, pass, isKeyPass);
                })
                .on('mouseout', () => {
                    line.attr('stroke', color).attr('stroke-width', width);
                    this.hideTooltip();
                });
        });
    }

    isKeyPass(pass) {
        return pass.qualifiers?.some(q => q.displayName === 'KeyPass' || q.displayName === 'Assist');
    }

    defineMarkers() {
        const defs = this.pitch.svg.select('defs');
        const mk = (id, c) => {
            if(defs.select(`#${id}`).empty()) 
                defs.append('marker').attr('id', id).attr('viewBox','0 0 10 10')
                    .attr('refX',9).attr('refY',5).attr('markerWidth',5).attr('markerHeight',5)
                    .attr('orient','auto').append('path').attr('d','M 0 0 L 10 5 L 0 10 z').attr('fill',c);
        };
        mk('arrow-pass-ok', '#0044cc'); mk('arrow-pass-ko', '#cc0000'); mk('arrow-pass-key', '#FFD700');
    }

    showTooltip(e, d, k) {
        // Calcul distance (105m x 68m)
        const dx = (d.endX - d.x) * 1.05;
        const dy = (d.endY - d.y) * 0.68;
        const dist = Math.sqrt(dx*dx + dy*dy).toFixed(1);
        
        this.tooltip.style.display = 'block';
        this.tooltip.style.left = (e.pageX+15)+'px'; this.tooltip.style.top = (e.pageY-15)+'px';
        this.tooltip.innerHTML = `<strong>${k?'🔑 Key Pass':(d.outcomeType.value===1?'Passe Réussie':'Passe Ratée')}</strong><br>Dist: ${dist}m<br>Min: ${d.minute}'`;
    }

    hideTooltip() { this.tooltip.style.display = 'none'; }
}