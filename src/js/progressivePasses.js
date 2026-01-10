import { Pitch } from './pitch.js';

export class ProgressivePasses {
    constructor(containerId) {
        this.containerId = containerId;
        this.pitch = null;
        this.tooltip = document.getElementById('tooltip');
    }

    update(events) {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = '<svg id="progressive-pitch-svg"></svg>';
        this.pitch = new Pitch('progressive-pitch-svg');

        const passes = events.filter(e =>
            e.type?.displayName === 'Pass' &&
            e.outcomeType?.value === 1 &&
            e.endX != null
        ).map(p => {
            const dx = p.endX - p.x;
            const dy = p.endY - p.y;
            const distMeters = Math.sqrt(dx*dx + dy*dy) * 1.05;
            const progression = p.endX - p.x;
            // Définition : Casse les lignes si finit dans le dernier tiers (x > 70)
            const breaksLines = p.x < 70 && p.endX >= 70;
            return { ...p, distMeters, progression, breaksLines };
        }).filter(p => p.progression > 15);

        this.render(passes);
    }

    render(passes) {
        const g = this.pitch.getGroup();
        this.pitch.initDefs();
        const defs = this.pitch.svg.select('defs');

        // Création des marqueurs de flèches distincts pour chaque type
        const arrowConfigs = [
            { id: 'arrow-standard', color: '#06b6d4' }, // Cyan
            { id: 'arrow-break', color: '#facc15' }    // Jaune
        ];

        arrowConfigs.forEach(config => {
            if (defs.select(`#${config.id}`).empty()) {
                defs.append('marker')
                    .attr('id', config.id)
                    .attr('viewBox', '0 0 10 10')
                    .attr('refX', 8) // Pointe de la flèche
                    .attr('refY', 5)
                    .attr('markerWidth', 5)
                    .attr('markerHeight', 5)
                    .attr('orient', 'auto')
                    .append('path')
                    .attr('d', 'M 0 0 L 10 5 L 0 10 z')
                    .attr('fill', config.color);
            }
        });

        passes.forEach(pass => {
            const [x1, y1] = this.pitch.toPixels(pass.x, pass.y);
            const [x2, y2] = this.pitch.toPixels(pass.endX, pass.endY);

            // Couleurs très distinctives : Cyan (Standard) vs Jaune Néon (Lignes brisées)
            const color = pass.breaksLines ? '#facc15' : '#06b6d4';
            const arrowId = pass.breaksLines ? 'arrow-break' : 'arrow-standard';
            const passG = g.append('g').attr('class', 'prog-pass-item');

            // Aura lumineuse uniquement pour les lignes brisées
            if (pass.breaksLines) {
                passG.append('line')
                    .attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2)
                    .attr('stroke', color).attr('stroke-width', 8).attr('opacity', 0.15)
                    .style('filter', 'blur(3px)');
            }

            // Ligne de la passe avec sa flèche
            passG.append('line')
                .attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2)
                .attr('stroke', color)
                .attr('stroke-width', pass.breaksLines ? 4 : 2.5)
                .attr('marker-end', `url(#${arrowId})`) // Direction avec flèche
                .style('cursor', 'pointer')
                .on('mouseover', (e) => this.showTooltip(e, pass))
                .on('mouseout', () => this.tooltip.style.display = 'none');

            // Texte de distance incliné
            const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
            passG.append('text')
                .attr('x', (x1 + x2) / 2).attr('y', ((y1 + y2) / 2) - 12)
                .attr('text-anchor', 'middle')
                .attr('fill', '#fff')
                .attr('transform', `rotate(${angle}, ${(x1 + x2) / 2}, ${(y1 + y2) / 2})`)
                .style('font-size', '13px').style('font-weight', '900')
                .style('text-shadow', '2px 2px 4px #000')
                .text(`${Math.round(pass.distMeters)}m`);
        });

        this.addExpertLegend(g, passes);
    }

    addExpertLegend(g, passes) {
        const lineBreaks = passes.filter(p => p.breaksLines).length;
        const totalMeters = Math.round(passes.reduce((acc, p) => acc + (p.progression * 1.05), 0));

        const legendG = g.append('g').attr('transform', `translate(${this.pitch.margin + 20}, ${this.pitch.margin + 20})`);

        legendG.append('rect')
            .attr('width', 280).attr('height', 190)
            .attr('fill', 'rgba(15, 23, 42, 0.95)').attr('rx', 8)
            .attr('stroke', '#06b6d4').attr('stroke-width', 2);

        legendG.append('text').attr('x', 15).attr('y', 30).attr('fill', '#06b6d4')
            .style('font-size', '16px').style('font-weight', 'bold').text('ANALYSE DE PROGRESSION');

        const stats = [
            { label: 'Passes Progressives', val: passes.length, col: '#06b6d4' },
            { label: 'Lignes Brisées (Dernier Tiers)', val: lineBreaks, col: '#facc15' },
            { label: 'Gain Territorial Total', val: `${totalMeters}m`, col: '#fff' }
        ];

        stats.forEach((s, i) => {
            legendG.append('text').attr('x', 15).attr('y', 60 + (i * 25)).attr('fill', '#94a3b8').text(s.label);
            legendG.append('text').attr('x', 265).attr('y', 60 + (i * 25)).attr('fill', s.col)
                .attr('text-anchor', 'end').style('font-weight', 'bold').text(s.val);
        });

        legendG.append('line').attr('x1', 15).attr('y1', 135).attr('x2', 265).attr('y2', 135).attr('stroke', '#334155');

        const note = ["Cyan : Progression standard vers l'avant.", "Jaune : Passe pénétrant les 30m adverses."];
        note.forEach((l, i) => {
            legendG.append('text').attr('x', 15).attr('y', 155 + (i * 15))
                .attr('fill', '#64748b').style('font-size', '10px').style('font-style', 'italic').text(l);
        });
    }

    showTooltip(e, pass) {
        this.tooltip.style.display = 'block';
        this.tooltip.style.left = (e.pageX + 15) + 'px';
        this.tooltip.style.top = (e.pageY - 10) + 'px';
        const color = pass.breaksLines ? '#facc15' : '#06b6d4';

        this.tooltip.innerHTML = `
            <div style="padding: 12px; background: #0f172a; border: 2px solid ${color}; border-radius: 8px;">
                <div style="color: ${color}; font-weight: 800; margin-bottom: 5px;">
                    ${pass.breaksLines ? '🚀 LIGNE BRISÉE' : '⚡ PROGRESSION'}
                </div>
                <div style="font-size: 0.85rem; color: #cbd5e1;">
                    Distance : <b>${Math.round(pass.distMeters)}m</b><br>
                    Minute : <b>${pass.minute}'</b>
                </div>
            </div>`;
    }
}