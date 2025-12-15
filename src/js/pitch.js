/**
 * src/js/pitch.js
 * Moteur géométrique : Convertit les données % (0-100) en pixels SVG.
 */
export class Pitch {
    constructor(svgId) {
        this.svg = d3.select(`#${svgId}`);
        
        // Dimensions virtuelles pour un ratio 105x68 (Standard UEFA)
        // On utilise 1050x680 pour avoir une bonne résolution de base
        this.pitchWidth = 1050; 
        this.pitchHeight = 680;
        this.margin = 50; // Marge pour ne pas coller aux bords (corners, touches)
        
        // Dimensions Totales du SVG
        this.width = this.pitchWidth + 2 * this.margin;
        this.height = this.pitchHeight + 2 * this.margin;

        // Configuration du SVG pour être Responsive
        this.svg
            .attr('viewBox', `0 0 ${this.width} ${this.height}`)
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .style('width', '100%')
            .style('height', 'auto')
            .style('background', '#1a472a')
            .style('border-radius', '8px');

        // --- ÉCHELLES DE CONVERSION (C'est ici que la magie opère) ---
        // Domain : Les données (0 à 100%)
        // Range : Les pixels (Marge à Largeur-Marge)
        
        this.xScale = d3.scaleLinear()
            .domain([0, 100])
            .range([this.margin, this.width - this.margin]);
            
        this.yScale = d3.scaleLinear()
            .domain([0, 100])
            .range([this.margin, this.height - this.margin]);
        
        this.draw();
    }
    
    draw() {
        this.svg.selectAll('*').remove();
        
        // Définitions globales (Marqueurs)
        this.initDefs();

        const g = this.svg.append('g').attr('class', 'pitch-drawing');
        
        // 1. Pelouse
        g.append('rect')
            .attr('x', this.margin).attr('y', this.margin)
            .attr('width', this.pitchWidth).attr('height', this.pitchHeight)
            .attr('fill', '#2e8b57'); // Vert Pelouse

        // 2. Rayures (Esthétique)
        const stripeW = this.pitchWidth / 10;
        for (let i = 0; i < 10; i++) {
            if (i % 2 === 0) {
                g.append('rect')
                    .attr('x', this.margin + i * stripeW).attr('y', this.margin)
                    .attr('width', stripeW).attr('height', this.pitchHeight)
                    .attr('fill', 'rgba(255,255,255,0.05)')
                    .style('pointer-events', 'none');
            }
        }
        
        // 3. Lignes Blanches
        const lines = g.append('g')
            .attr('stroke', 'rgba(255,255,255,0.9)')
            .attr('stroke-width', 3)
            .attr('fill', 'none');

        // Contour
        lines.append('rect')
            .attr('x', this.xScale(0)).attr('y', this.yScale(0))
            .attr('width', this.xScale(100) - this.xScale(0))
            .attr('height', this.yScale(100) - this.yScale(0));
        
        // Médiane
        lines.append('line')
            .attr('x1', this.xScale(50)).attr('y1', this.yScale(0))
            .attr('x2', this.xScale(50)).attr('y2', this.yScale(100));
        
        // Rond central (Rayon 9.15m sur 105m total = ~8.7%)
        const centerRadius = this.xScale(8.7) - this.xScale(0);
        lines.append('circle')
            .attr('cx', this.xScale(50)).attr('cy', this.yScale(50))
            .attr('r', centerRadius);
        lines.append('circle')
            .attr('cx', this.xScale(50)).attr('cy', this.yScale(50))
            .attr('r', 4).attr('fill', 'white');
        
        // Surfaces (Dimensions standard UEFA en %)
        const d = {
            boxL: 15.7, boxW: 59.3, // Grande surface
            smL: 5.2, smW: 26.9,    // Petite surface
            pen: 10.5               // Point de penalty
        };

        [0, 100].forEach(xVal => {
            const isLeft = xVal === 0;
            // Grande surface
            lines.append('rect')
                .attr('x', isLeft ? this.xScale(0) : this.xScale(100 - d.boxL))
                .attr('y', this.yScale(50 - d.boxW/2))
                .attr('width', this.xScale(d.boxL) - this.xScale(0))
                .attr('height', this.yScale(50 + d.boxW/2) - this.yScale(50 - d.boxW/2));
            // Petite surface
            lines.append('rect')
                .attr('x', isLeft ? this.xScale(0) : this.xScale(100 - d.smL))
                .attr('y', this.yScale(50 - d.smW/2))
                .attr('width', this.xScale(d.smL) - this.xScale(0))
                .attr('height', this.yScale(50 + d.smW/2) - this.yScale(50 - d.smW/2));
            // Penalty
            const penX = this.xScale(isLeft ? d.pen : 100 - d.pen);
            lines.append('circle').attr('cx', penX).attr('cy', this.yScale(50)).attr('r', 3).attr('fill', 'white');
            // Arc (D-Box)
            const arc = d3.path();
            if(isLeft) arc.arc(penX, this.yScale(50), centerRadius, -0.65, 0.65);
            else arc.arc(penX, this.yScale(50), centerRadius, 2.5, 3.8);
            lines.append('path').attr('d', arc.toString());
        });
        
        // Calque pour les données
        this.svg.append('g').attr('class', 'data-layer');
    }
    
    // --- Helpers Utiles ---
    toPixels(x, y) { return [this.xScale(x), this.yScale(y)]; }
    getGroup() { return this.svg.select('.data-layer'); }
    clearDataLayer() { this.svg.select('.data-layer').selectAll('*').remove(); }
    
    initDefs() {
        if(this.svg.select('defs').empty()) this.svg.append('defs');
    }
}