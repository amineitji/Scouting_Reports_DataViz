/**
 * progressivePasses.js
 * Analyse et visualisation des passes qui font progresser le jeu
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

        // Nettoyage et préparation du SVG
        container.innerHTML = '<svg id="progressive-pitch-svg"></svg>';
        this.pitch = new Pitch('progressive-pitch-svg');

        // 1. Filtrer les passes réussies avec des coordonnées de fin
        const passes = events.filter(e =>
            e.type?.displayName === 'Pass' &&
            e.outcomeType?.value === 1 &&
            e.endX != null
        );

        // 2. Identifier les passes progressives
        // Critère : Progression d'au moins 25% de la longueur du terrain (ou 10m+ selon votre échelle)
        // Et doit se terminer dans la moitié adverse ou progresser significativement vers le but
        const progressivePasses = passes.filter(pass => {
            const progression = pass.endX - pass.x;

            // Une définition simplifiée :
            // - Si dans son propre camp : progression > 30%
            // - Si dans le camp adverse : progression > 15%
            const isProgressive = pass.x < 50 ? progression > 25 : progression > 10;

            return isProgressive && progression > 0; // Uniquement vers l'avant
        });

        this.render(progressivePasses);
    }

    render(passes) {
        const g = this.pitch.getGroup();
        this.pitch.initDefs();

        // Ajout d'un marqueur de flèche spécifique
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

        // Dessiner les passes
        passes.forEach(pass => {
            const [x1, y1] = this.pitch.toPixels(pass.x, pass.y);
            const [x2, y2] = this.pitch.toPixels(pass.endX, pass.endY);

            // Ligne avec gradient ou ombre pour l'effet "vitesse"
            g.append('line')
                .attr('x1', x1)
                .attr('y1', y1)
                .attr('x2', x2)
                .attr('y2', y2)
                .attr('stroke', '#f59e0b')
                .attr('stroke-width', 2)
                .attr('opacity', 0.6)
                .attr('marker-end', 'url(#arrow-prog)')
                .style('filter', 'drop-shadow(0 0 2px rgba(245, 158, 11, 0.5))');

            // Point de départ
            g.append('circle')
                .attr('cx', x1)
                .attr('cy', y1)
                .attr('r', 3)
                .attr('fill', '#f59e0b');
        });

        this.addSummary(g, passes.length);
    }

    addSummary(g, count) {
        const legend = g.append('g')
            .attr('transform', `translate(${this.pitch.margin + 20}, ${this.pitch.margin + 20})`);

        legend.append('rect')
            .attr('width', 180)
            .attr('height', 50)
            .attr('fill', 'rgba(15, 23, 42, 0.8)')
            .attr('rx', 8)
            .attr('stroke', '#f59e0b')
            .attr('stroke-width', 1);

        legend.append('text')
            .attr('x', 15)
            .attr('y', 30)
            .attr('fill', '#f59e0b')
            .style('font-weight', 'bold')
            .text(`${count} Passes Progressives`);
    }
}