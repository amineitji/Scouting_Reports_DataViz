/**
 * progressivePasses.js
 * Analyse avancée des passes progressives avec étiquettes orientées et lisibilité accrue
 */
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

        // Préparation du terrain
        container.innerHTML = '<svg id="progressive-pitch-svg"></svg>';
        this.pitch = new Pitch('progressive-pitch-svg');

        // 1. Filtrer les passes réussies avec progression significative (>15% du terrain)
        const passes = events.filter(e =>
            e.type?.displayName === 'Pass' &&
            e.outcomeType?.value === 1 &&
            e.endX != null
        ).map(p => {
            const dx = p.endX - p.x;
            const dy = p.endY - p.y;
            const distPercent = Math.sqrt(dx*dx + dy*dy);
            const distMeters = distPercent * 1.05; // 1% = 1.05m (terrain de 105m)
            const progression = p.endX - p.x;
            return { ...p, distMeters, progression };
        }).filter(p => p.progression > 15);

        this.render(passes);
    }

    render(passes) {
        const g = this.pitch.getGroup();
        this.pitch.initDefs();

        const defs = this.pitch.svg.select('defs');
        if (defs.select('#arrow-prog').empty()) {
            defs.append('marker')
                .attr('id', 'arrow-prog')
                .attr('viewBox', '0 0 10 10')
                .attr('refX', 8)
                .attr('refY', 5)
                .attr('markerWidth', 4)
                .attr('markerHeight', 4)
                .attr('orient', 'auto')
                .append('path')
                .attr('d', 'M 0 0 L 10 5 L 0 10 z')
                .attr('fill', '#f59e0b');
        }

        passes.forEach(pass => {
            const [x1, y1] = this.pitch.toPixels(pass.x, pass.y);
            const [x2, y2] = this.pitch.toPixels(pass.endX, pass.endY);

            const color = pass.endX > 70 ? '#fbbf24' : '#f59e0b';
            const passG = g.append('g').attr('class', 'prog-pass-item');

            // La ligne de passe
            passG.append('line')
                .attr('x1', x1).attr('y1', y1)
                .attr('x2', x2).attr('y2', y2)
                .attr('stroke', color)
                .attr('stroke-width', 2.5)
                .attr('opacity', 0.7)
                .attr('marker-end', 'url(#arrow-prog)')
                .style('cursor', 'pointer')
                .on('mouseover', (e) => this.showTooltip(e, pass))
                .on('mouseout', () => this.tooltip.style.display = 'none');

            // Calcul de l'angle pour l'inclinaison du texte
            const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;

            // Affichage de la distance avec inclinaison et taille augmentée
            passG.append('text')
                .attr('x', midX)
                .attr('y', midY - 12) // Décalage pour ne pas chevaucher la ligne
                .attr('text-anchor', 'middle')
                .attr('fill', '#fff')
                .attr('transform', `rotate(${angle}, ${midX}, ${midY})`)
                .style('font-size', '13px') // Taille augmentée (était 10px)
                .style('font-weight', 'bold')
                .style('text-shadow', '1px 1px 3px #000')
                .style('pointer-events', 'none')
                .text(`${Math.round(pass.distMeters)}m`);
        });

        this.addExpertLegend(g, passes);
    }

    showTooltip(e, pass) {
        this.tooltip.style.display = 'block';
        this.tooltip.style.left = (e.pageX + 15) + 'px';
        this.tooltip.style.top = (e.pageY - 10) + 'px';

        const qualifiers = pass.qualifiers
            ?.filter(q => ['Longball', 'Throughball', 'Chipped', 'KeyPass'].includes(q.type?.displayName))
            .map(q => `<span style="color:#f59e0b">#${q.type?.displayName}</span>`)
            .join(' ') || 'Standard';

        this.tooltip.innerHTML = `
            <div style="padding: 10px; min-width: 160px;">
                <div style="color: #f59e0b; font-weight: bold; font-size: 1.1rem; border-bottom: 1px solid #334155; margin-bottom: 8px; padding-bottom: 4px;">
                   ⚡ Passe Progressive
                </div>
                <div style="display: grid; gap: 4px; font-size: 0.9rem;">
                    <div>Minute: <b style="color:white">${pass.minute}'</b></div>
                    <div>Distance: <b style="color:white">${Math.round(pass.distMeters)}m</b></div>
                    <div>Vers l'avant: <b style="color:white">+${Math.round(pass.progression)}%</b></div>
                    <div style="margin-top:5px; font-size: 0.8rem; opacity: 0.9;">${qualifiers}</div>
                </div>
            </div>
        `;
    }

    addExpertLegend(g, passes) {
        const totalProgMeters = passes.reduce((acc, p) => acc + (p.progression * 1.05), 0);
        const legendX = this.pitch.margin + 20;
        const legendY = this.pitch.margin + 20;
        const legendG = g.append('g').attr('transform', `translate(${legendX}, ${legendY})`);

        // Cadre agrandi (height: 175)
        legendG.append('rect')
            .attr('width', 260)
            .attr('height', 175)
            .attr('fill', 'rgba(15, 23, 42, 0.92)')
            .attr('rx', 12)
            .attr('stroke', 'rgba(245, 158, 11, 0.4)')
            .attr('stroke-width', 1.5);

        legendG.append('text')
            .attr('x', 15).attr('y', 30)
            .attr('fill', '#f59e0b')
            .style('font-weight', 'bold').style('font-size', '15px')
            .text(`${passes.length} Passes Progressives`);

        legendG.append('text')
            .attr('x', 15).attr('y', 55)
            .attr('fill', '#cbd5e1')
            .style('font-size', '13px')
            .text(`Gain total : ${Math.round(totalProgMeters)}m vers le but`);

        legendG.append('line')
            .attr('x1', 15).attr('y1', 70).attr('x2', 245).attr('y2', 70)
            .attr('stroke', 'rgba(255,255,255,0.1)');

        legendG.append('text')
            .attr('x', 15).attr('y', 90)
            .attr('fill', '#94a3b8')
            .style('font-size', '11px').style('font-weight', 'bold')
            .text('DÉFINITION TECHNIQUE :');

        const explanation = [
            "Passe réussie dont le point d'arrivée",
            "est au moins 15% plus proche de la",
            "ligne de but adverse que le départ.",
            "Mesure la capacité à briser les blocs",
            "et à faire progresser le jeu verticalement."
        ];

        explanation.forEach((line, i) => {
            legendG.append('text')
                .attr('x', 15).attr('y', 108 + (i * 14))
                .attr('fill', '#94a3b8')
                .style('font-size', '10.5px').style('font-style', 'italic')
                .text(line);
        });
    }
}