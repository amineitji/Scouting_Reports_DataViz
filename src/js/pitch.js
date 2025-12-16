/**
 * src/js/pitch.js
 * Moteur géométrique : Convertit les données % (0-100) en pixels SVG.
 */
export class Pitch {
    constructor(svgId) {
        this.svg = d3.select(`#${svgId}`);
        this.pitchWidth = 1050; 
        this.pitchHeight = 680;
        this.margin = 50; 
        
        // Dimensions Totales
        this.width = this.pitchWidth + 2 * this.margin;
        this.height = this.pitchHeight + 2 * this.margin;

        this.svg
            .attr('viewBox', `0 0 ${this.width} ${this.height}`)
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .style('width', '100%')
            .style('height', '100%')
            .style('background', '#1a472a')
            .style('border-radius', '8px')
            .style('max-height', '100%')
            .style('display', 'block')
            .style('margin', 'auto');

        this.xScale = d3.scaleLinear().domain([0, 100]).range([this.margin, this.width - this.margin]);
        this.yScale = d3.scaleLinear().domain([0, 100]).range([this.margin, this.height - this.margin]);
        
        this.draw();
    }
    
    draw() {
        this.svg.selectAll('*').remove();
        this.initDefs();
        const g = this.svg.append('g').attr('class', 'pitch-drawing');
        
        // Pelouse
        g.append('rect').attr('x', this.margin).attr('y', this.margin).attr('width', this.pitchWidth).attr('height', this.pitchHeight).attr('fill', '#2e8b57');

        // Rayures
        const stripeW = this.pitchWidth / 10;
        for (let i = 0; i < 10; i++) {
            if (i % 2 === 0) {
                g.append('rect').attr('x', this.margin + i * stripeW).attr('y', this.margin).attr('width', stripeW).attr('height', this.pitchHeight).attr('fill', 'rgba(255,255,255,0.05)').style('pointer-events', 'none');
            }
        }
        
        // Lignes
        const lines = g.append('g').attr('stroke', 'rgba(255,255,255,0.9)').attr('stroke-width', 3).attr('fill', 'none');
        lines.append('rect').attr('x', this.xScale(0)).attr('y', this.yScale(0)).attr('width', this.xScale(100) - this.xScale(0)).attr('height', this.yScale(100) - this.yScale(0));
        lines.append('line').attr('x1', this.xScale(50)).attr('y1', this.yScale(0)).attr('x2', this.xScale(50)).attr('y2', this.yScale(100));
        
        const centerRadius = this.xScale(8.7) - this.xScale(0);
        lines.append('circle').attr('cx', this.xScale(50)).attr('cy', this.yScale(50)).attr('r', centerRadius);
        lines.append('circle').attr('cx', this.xScale(50)).attr('cy', this.yScale(50)).attr('r', 4).attr('fill', 'white');
        
        const d = { boxL: 15.7, boxW: 59.3, smL: 5.2, smW: 26.9, pen: 10.5 };
        [0, 100].forEach(xVal => {
            const isLeft = xVal === 0;
            lines.append('rect').attr('x', isLeft ? this.xScale(0) : this.xScale(100 - d.boxL)).attr('y', this.yScale(50 - d.boxW/2)).attr('width', this.xScale(d.boxL) - this.xScale(0)).attr('height', this.yScale(50 + d.boxW/2) - this.yScale(50 - d.boxW/2));
            lines.append('rect').attr('x', isLeft ? this.xScale(0) : this.xScale(100 - d.smL)).attr('y', this.yScale(50 - d.smW/2)).attr('width', this.xScale(d.smL) - this.xScale(0)).attr('height', this.yScale(50 + d.smW/2) - this.yScale(50 - d.smW/2));
            const penX = this.xScale(isLeft ? d.pen : 100 - d.pen);
            lines.append('circle').attr('cx', penX).attr('cy', this.yScale(50)).attr('r', 3).attr('fill', 'white');
            const arc = d3.path();
            if(isLeft) arc.arc(penX, this.yScale(50), centerRadius, -0.65, 0.65); else arc.arc(penX, this.yScale(50), centerRadius, 2.5, 3.8);
            lines.append('path').attr('d', arc.toString());
        });
        
        this.drawDirectionArrow(g);
        this.svg.append('g').attr('class', 'data-layer');
    }

    drawDirectionArrow(g) {
        const arrowY = this.height - 25; 
        const startX = this.margin;
        const endX = this.width - this.margin;
        const arrowG = g.append('g').attr('class', 'direction-arrow');
        arrowG.append('line').attr('x1', startX).attr('y1', arrowY).attr('x2', endX - 30).attr('y2', arrowY).attr('stroke', 'rgba(255, 255, 255, 0.4)').attr('stroke-width', 8).attr('stroke-linecap', 'round');
        const triangle = d3.symbol().type(d3.symbolTriangle).size(400);
        arrowG.append('path').attr('d', triangle).attr('transform', `translate(${endX}, ${arrowY}) rotate(90)`).attr('fill', 'rgba(255, 255, 255, 0.4)');
        arrowG.append('text').attr('x', this.width / 2).attr('y', arrowY + 5).attr('text-anchor', 'middle').attr('fill', 'rgba(255, 255, 255, 0.7)').style('font-size', '14px').style('font-weight', 'bold').style('text-transform', 'uppercase').style('letter-spacing', '2px').text('SENS DU JEU →');
    }
    
    // INVERSION Y POUR LA VUE TV
    toPixels(x, y) { return [this.xScale(x), this.yScale(100 - y)]; }
    getGroup() { return this.svg.select('.data-layer'); }
    clearDataLayer() { this.svg.select('.data-layer').selectAll('*').remove(); }
    initDefs() { if(this.svg.select('defs').empty()) this.svg.append('defs'); }
}