import { Pitch } from './pitch.js';

export class Heatmap {
    constructor(svgId) {
        this.pitch = new Pitch(svgId);
    }
    
    render(events) {
        this.pitch.clearDataLayer();
        const g = this.pitch.getGroup();
        
        // On s'assure d'avoir les dimensions du SVG pour le calcul de densité
        const w = this.pitch.width;
        const h = this.pitch.height;

        // Configuration Contour Density
        // On mappe x (0-100) vers xScale(x) (pixels)
        const densityData = d3.contourDensity()
            .x(d => this.pitch.xScale(d.x)) 
            .y(d => this.pitch.yScale(d.y))
            .size([w, h])
            .bandwidth(15) // Contrôle le flou
            .thresholds(15) // Contrôle la précision des courbes
            (events);

        // Palette Couleur (Chaud)
        const colorScale = d3.scaleSequential(d3.interpolateYlOrRd)
            .domain([0, d3.max(densityData, d => d.value) * 0.8]);

        g.selectAll("path")
            .data(densityData)
            .enter().append("path")
            .attr("d", d3.geoPath())
            .attr("fill", d => colorScale(d.value))
            .attr("opacity", 0.6)
            .attr("stroke", "none");
    }
}