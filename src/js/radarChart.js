export class RadarChart {
    constructor(containerId) {
        this.containerId = containerId;
        this.width = 300;
        this.height = 300;
        this.margin = 40;
    }

    update(stats) {
        const container = document.getElementById(this.containerId);
        container.innerHTML = ''; // Reset

        // Normalisation (Valeurs arbitraires "Elite" pour l'échelle 0-100)
        // On pourrait améliorer ça avec des vraies benchmarks
        const data = [
            { axis: "Passes", value: Math.min(stats.passing.total / 80 * 100, 100) },
            { axis: "Précision", value: stats.passing.rate },
            { axis: "Dribbles", value: Math.min(stats.dribbling.total / 10 * 100, 100) },
            { axis: "xG Gen", value: Math.min(stats.shooting.xg / 1.5 * 100, 100) },
            { axis: "Défense", value: Math.min((stats.defense.tackles + stats.defense.interceptions) / 10 * 100, 100) }
        ];

        const svg = d3.select(container).append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", `0 0 ${this.width} ${this.height}`)
            .append("g")
            .attr("transform", `translate(${this.width/2},${this.height/2})`);

        const radius = Math.min(this.width, this.height) / 2 - this.margin;
        const angleSlice = Math.PI * 2 / data.length;

        // Échelles
        const rScale = d3.scaleLinear().range([0, radius]).domain([0, 100]);

        // Grille circulaire (toile d'araignée)
        const levels = [25, 50, 75, 100];
        levels.forEach(level => {
            svg.append("circle")
                .attr("r", rScale(level))
                .attr("fill", "none")
                .attr("stroke", "#334155")
                .attr("stroke-dasharray", "4 4");
            
            svg.append("text")
                .attr("x", 5)
                .attr("y", -rScale(level))
                .text(level)
                .style("font-size", "10px")
                .attr("fill", "#64748b");
        });

        // Axes
        const axes = svg.selectAll(".axis")
            .data(data).enter().append("g");

        axes.append("line")
            .attr("x1", 0).attr("y1", 0)
            .attr("x2", (d, i) => rScale(100) * Math.cos(angleSlice * i - Math.PI/2))
            .attr("y2", (d, i) => rScale(100) * Math.sin(angleSlice * i - Math.PI/2))
            .attr("stroke", "#475569")
            .attr("stroke-width", 1);

        axes.append("text")
            .attr("class", "legend")
            .style("font-size", "12px")
            .attr("fill", "#94a3b8")
            .attr("text-anchor", "middle")
            .attr("dy", "0.35em")
            .attr("x", (d, i) => rScale(115) * Math.cos(angleSlice * i - Math.PI/2))
            .attr("y", (d, i) => rScale(115) * Math.sin(angleSlice * i - Math.PI/2))
            .text(d => d.axis);

        // La forme (le radar)
        const radarLine = d3.lineRadial()
            .curve(d3.curveLinearClosed)
            .radius(d => rScale(d.value))
            .angle((d, i) => i * angleSlice);

        svg.append("path")
            .datum(data)
            .attr("d", radarLine)
            .style("fill", "rgba(59, 130, 246, 0.5)")
            .style("stroke", "#3b82f6")
            .style("stroke-width", 2);
            
        // Points
        svg.selectAll(".radarCircle")
            .data(data).enter().append("circle")
            .attr("cx", (d, i) => rScale(d.value) * Math.cos(angleSlice * i - Math.PI/2))
            .attr("cy", (d, i) => rScale(d.value) * Math.sin(angleSlice * i - Math.PI/2))
            .attr("r", 4)
            .style("fill", "#fff")
            .style("stroke", "#3b82f6");
    }
}