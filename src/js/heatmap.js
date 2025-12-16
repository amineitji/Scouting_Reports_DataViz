import { Pitch } from './pitch.js';

export class Heatmap {
    constructor(svgId) {
        this.pitch = new Pitch(svgId);
    }
    
    render(events) {
        this.pitch.clearDataLayer();
        const g = this.pitch.getGroup();
        
        const densityData = d3.contourDensity()
            .x(d => this.pitch.xScale(d.x)) 
            .y(d => this.pitch.yScale(100 - d.y)) // Inversion Y
            .size([this.pitch.width, this.pitch.height])
            .bandwidth(15) 
            .thresholds(15) 
            (events);

        const colorScale = d3.scaleSequential(d3.interpolateYlOrRd).domain([0, d3.max(densityData, d => d.value) * 0.8]);

        g.selectAll("path")
            .data(densityData)
            .enter().append("path")
            .attr("d", d3.geoPath())
            .attr("fill", d => colorScale(d.value))
            .attr("opacity", 0.6)
            .attr("stroke", "none");
    }
}