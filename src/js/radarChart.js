/**
 * radarChart.js
 * Graphique radar pour visualiser le profil du joueur
 */
export class RadarChart {
    constructor(containerId) {
        this.containerId = containerId;
        this.width = 400;
        this.height = 400;
        this.margin = 60;
    }

    update(stats) {
        const container = document.getElementById(this.containerId);
        if (!container) return;
        
        container.innerHTML = '';

        const data = [
            { 
                axis: "Volume Passes", 
                value: Math.min(stats.passing.total / 60 * 100, 100), 
                raw: stats.passing.total,
                color: '#3b82f6'
            },
            { 
                axis: "Précision", 
                value: stats.passing.rate, 
                raw: stats.passing.rate + '%',
                color: '#3b82f6'
            },
            { 
                axis: "Passes Clés", 
                value: Math.min(stats.passing.key / 3 * 100, 100), 
                raw: stats.passing.key,
                color: '#eab308'
            },
            { 
                axis: "Dribbles", 
                value: Math.min(stats.dribbling.total / 8 * 100, 100), 
                raw: `${stats.dribbling.success}/${stats.dribbling.total}`,
                color: '#22c55e'
            },
            { 
                axis: "xG", 
                value: Math.min(parseFloat(stats.shooting.xg) / 1.0 * 100, 100), 
                raw: stats.shooting.xg,
                color: '#ef4444'
            },
            { 
                axis: "Défense", 
                value: Math.min(stats.defense.total / 10 * 100, 100), 
                raw: stats.defense.total,
                color: '#8b5cf6'
            }
        ];

        const svg = d3.select(container)
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", `0 0 ${this.width} ${this.height}`)
            .append("g")
            .attr("transform", `translate(${this.width / 2}, ${this.height / 2})`);

        const radius = Math.min(this.width, this.height) / 2 - this.margin;
        const angleSlice = Math.PI * 2 / data.length;
        const rScale = d3.scaleLinear()
            .range([0, radius])
            .domain([0, 100]);

        // Grille circulaire
        const levels = 5;
        for (let i = 1; i <= levels; i++) {
            const levelValue = (100 / levels) * i;
            
            svg.append("circle")
                .attr("r", rScale(levelValue))
                .attr("fill", "none")
                .attr("stroke", "rgba(255, 255, 255, 0.1)")
                .attr("stroke-width", 1);

            // Labels des niveaux
            if (i === levels) {
                svg.append("text")
                    .attr("x", 5)
                    .attr("y", -rScale(levelValue))
                    .attr("fill", "rgba(255, 255, 255, 0.4)")
                    .style("font-size", "10px")
                    .text(levelValue);
            }
        }

        // Axes
        const axes = svg.selectAll(".axis")
            .data(data)
            .enter()
            .append("g")
            .attr("class", "axis");

        axes.append("line")
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("x2", (d, i) => rScale(105) * Math.cos(angleSlice * i - Math.PI / 2))
            .attr("y2", (d, i) => rScale(105) * Math.sin(angleSlice * i - Math.PI / 2))
            .attr("stroke", "rgba(255, 255, 255, 0.2)")
            .attr("stroke-width", 1);

        // Labels des axes
        axes.append("text")
            .attr("x", (d, i) => rScale(130) * Math.cos(angleSlice * i - Math.PI / 2))
            .attr("y", (d, i) => rScale(130) * Math.sin(angleSlice * i - Math.PI / 2))
            .attr("text-anchor", "middle")
            .attr("dy", "0.35em")
            .attr("fill", "#cbd5e1")
            .style("font-size", "12px")
            .style("font-weight", "600")
            .text(d => d.axis);

        // Valeurs brutes
        axes.append("text")
            .attr("x", (d, i) => rScale(150) * Math.cos(angleSlice * i - Math.PI / 2))
            .attr("y", (d, i) => rScale(150) * Math.sin(angleSlice * i - Math.PI / 2))
            .attr("text-anchor", "middle")
            .attr("dy", "0.35em")
            .attr("fill", d => d.color)
            .style("font-size", "13px")
            .style("font-weight", "700")
            .text(d => d.raw);

        // Ligne du radar
        const radarLine = d3.lineRadial()
            .curve(d3.curveLinearClosed)
            .radius(d => rScale(d.value))
            .angle((d, i) => i * angleSlice);

        // Zone du radar avec gradient
        const radarId = 'radarGradient';
        const gradient = svg.append('defs')
            .append('radialGradient')
            .attr('id', radarId);

        gradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', '#3b82f6')
            .attr('stop-opacity', 0.8);

        gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', '#3b82f6')
            .attr('stop-opacity', 0.3);

        svg.append("path")
            .datum(data)
            .attr("d", radarLine)
            .style("fill", `url(#${radarId})`)
            .style("stroke", "#3b82f6")
            .style("stroke-width", 2.5);

        // Points sur le radar
        svg.selectAll(".radar-point")
            .data(data)
            .enter()
            .append("circle")
            .attr("class", "radar-point")
            .attr("cx", (d, i) => rScale(d.value) * Math.cos(angleSlice * i - Math.PI / 2))
            .attr("cy", (d, i) => rScale(d.value) * Math.sin(angleSlice * i - Math.PI / 2))
            .attr("r", 5)
            .attr("fill", d => d.color)
            .attr("stroke", "white")
            .attr("stroke-width", 2)
            .style("cursor", "pointer")
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("r", 7);
            })
            .on("mouseout", function() {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("r", 5);
            });
    }
}