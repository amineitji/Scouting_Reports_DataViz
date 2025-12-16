export class RadarChart {
    constructor(containerId) {
        this.containerId = containerId;
        this.width = 320;
        this.height = 320;
        this.margin = 50;
    }

    update(stats) {
        const container = document.getElementById(this.containerId);
        container.innerHTML = '';

        // Normalisation améliorée
        const data = [
            { 
                axis: "Volume Passes", 
                value: Math.min(stats.passing.total / 60 * 100, 100),
                raw: stats.passing.total 
            },
            { 
                axis: "Précision", 
                value: stats.passing.rate,
                raw: stats.passing.rate + '%'
            },
            { 
                axis: "Passes Clés", 
                value: Math.min(stats.passing.key / 5 * 100, 100),
                raw: stats.passing.key
            },
            { 
                axis: "Dribbles", 
                value: Math.min(stats.dribbling.total / 8 * 100, 100),
                raw: `${stats.dribbling.success}/${stats.dribbling.total}`
            },
            { 
                axis: "xG Créé", 
                value: Math.min(parseFloat(stats.shooting.xg) / 1.2 * 100, 100),
                raw: stats.shooting.xg
            },
            { 
                axis: "Défense", 
                value: Math.min((stats.defense.tackles + stats.defense.interceptions) / 12 * 100, 100),
                raw: stats.defense.tackles + stats.defense.interceptions
            }
        ];

        const svg = d3.select(container).append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", `0 0 ${this.width} ${this.height}`)
            .append("g")
            .attr("transform", `translate(${this.width/2},${this.height/2})`);

        const radius = Math.min(this.width, this.height) / 2 - this.margin;
        const angleSlice = Math.PI * 2 / data.length;
        const rScale = d3.scaleLinear().range([0, radius]).domain([0, 100]);

        // Grille
        const levels = [20, 40, 60, 80, 100];
        levels.forEach(level => {
            svg.append("circle")
                .attr("r", rScale(level))
                .attr("fill", "none")
                .attr("stroke", "#1e293b")
                .attr("stroke-width", 1);
            
            if (level === 100) {
                svg.append("text")
                    .attr("x", 8)
                    .attr("y", -rScale(level) + 4)
                    .text(level)
                    .style("font-size", "10px")
                    .attr("fill", "#475569");
            }
        });

        // Axes
        const axes = svg.selectAll(".axis")
            .data(data).enter().append("g");

        axes.append("line")
            .attr("x1", 0).attr("y1", 0)
            .attr("x2", (d, i) => rScale(105) * Math.cos(angleSlice * i - Math.PI/2))
            .attr("y2", (d, i) => rScale(105) * Math.sin(angleSlice * i - Math.PI/2))
            .attr("stroke", "#334155")
            .attr("stroke-width", 1.5);

        // Labels
        axes.append("text")
            .style("font-size", "11px")
            .style("font-weight", "600")
            .attr("fill", "#94a3b8")
            .attr("text-anchor", "middle")
            .attr("dy", "0.35em")
            .attr("x", (d, i) => rScale(120) * Math.cos(angleSlice * i - Math.PI/2))
            .attr("y", (d, i) => rScale(120) * Math.sin(angleSlice * i - Math.PI/2))
            .text(d => d.axis);

        // Valeurs brutes
        axes.append("text")
            .style("font-size", "10px")
            .style("font-weight", "700")
            .attr("fill", "#3b82f6")
            .attr("text-anchor", "middle")
            .attr("x", (d, i) => rScale(135) * Math.cos(angleSlice * i - Math.PI/2))
            .attr("y", (d, i) => rScale(135) * Math.sin(angleSlice * i - Math.PI/2))
            .text(d => d.raw);

        // Forme radar
        const radarLine = d3.lineRadial()
            .curve(d3.curveLinearClosed)
            .radius(d => rScale(d.value))
            .angle((d, i) => i * angleSlice);

        // Gradient pour le remplissage
        const defs = svg.append("defs");
        const gradient = defs.append("radialGradient")
            .attr("id", "radarGradient");
        
        gradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", "#3b82f6")
            .attr("stop-opacity", 0.6);
        
        gradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "#3b82f6")
            .attr("stop-opacity", 0.2);

        svg.append("path")
            .datum(data)
            .attr("d", radarLine)
            .style("fill", "url(#radarGradient)")
            .style("stroke", "#3b82f6")
            .style("stroke-width", 3)
            .style("filter", "drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))");
            
        // Points avec animation
        svg.selectAll(".radarCircle")
            .data(data).enter().append("circle")
            .attr("cx", (d, i) => rScale(d.value) * Math.cos(angleSlice * i - Math.PI/2))
            .attr("cy", (d, i) => rScale(d.value) * Math.sin(angleSlice * i - Math.PI/2))
            .attr("r", 0)
            .style("fill", "#fff")
            .style("stroke", "#3b82f6")
            .style("stroke-width", 2)
            .transition()
            .duration(500)
            .delay((d, i) => i * 100)
            .attr("r", 5);
    }
}