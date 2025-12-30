/**
 * zoneAnalysis.js
 * Heatmap par zones avec terrain dessiné (style Squawka)
 */
export class ZoneAnalysis {
    constructor(containerId) {
        this.containerId = containerId;
        this.width = 700;
        this.height = 450;
        this.margin = 20;

        this.rows = 3;
        this.cols = 4;
    }

    update(events) {
        const container = document.getElementById(this.containerId);
        if (!container || !events?.length) return;

        container.innerHTML = '';

        const svg = d3.select(container)
            .append("svg")
            .attr("viewBox", `0 0 ${this.width} ${this.height}`)
            .attr("width", "100%")
            .attr("height", "100%");

        const pitch = svg.append("g")
            .attr("transform", `translate(${this.margin}, ${this.margin})`);

        const W = this.width - this.margin * 2;
        const H = this.height - this.margin * 2;

        // =====================
        // 🟩 TERRAIN
        // =====================
        pitch.append("rect")
            .attr("width", W)
            .attr("height", H)
            .attr("rx", 12)
            .attr("fill", "#14532d");

        // Lignes
        const lines = pitch.append("g")
            .attr("stroke", "rgba(255,255,255,0.6)")
            .attr("fill", "none")
            .attr("stroke-width", 2);

        lines.append("rect").attr("width", W).attr("height", H);
        lines.append("line").attr("x1", W / 2).attr("y1", 0).attr("x2", W / 2).attr("y2", H);

        // Rond central
        lines.append("circle").attr("cx", W / 2).attr("cy", H / 2).attr("r", 55);
        lines.append("circle").attr("cx", W / 2).attr("cy", H / 2).attr("r", 2).attr("fill", "white");

        // Surfaces
        const boxW = 120, boxH = 260;
        lines.append("rect").attr("x", 0).attr("y", (H - boxH) / 2).attr("width", boxW).attr("height", boxH);
        lines.append("rect").attr("x", W - boxW).attr("y", (H - boxH) / 2).attr("width", boxW).attr("height", boxH);

        // =====================
        // 🔥 ZONES
        // =====================
        const zoneW = W / this.cols;
        const zoneH = H / this.rows;

        const zones = Array.from({ length: this.rows * this.cols }, (_, i) => ({
            id: i,
            count: 0
        }));

        events.forEach(e => {
            if (e.x == null || e.y == null) return;
            const col = Math.min(Math.floor(e.x / (100 / this.cols)), this.cols - 1);
            const row = Math.min(Math.floor(e.y / (100 / this.rows)), this.rows - 1);
            zones[row * this.cols + col].count++;
        });

        const total = d3.sum(zones, d => d.count) || 1;
        zones.forEach(z => z.pct = (z.count / total) * 100);

        const color = d3.scaleSequential()
            .domain([0, d3.max(zones, d => d.pct)])
            .interpolator(d3.interpolateOrRd);

        // Calque heatmap
        const heat = pitch.append("g");

        heat.selectAll(".zone")
            .data(zones)
            .enter()
            .append("rect")
            .attr("x", d => (d.id % this.cols) * zoneW)
            .attr("y", d => Math.floor(d.id / this.cols) * zoneH)
            .attr("width", zoneW)
            .attr("height", zoneH)
            .attr("fill", d => color(d.pct))
            .attr("opacity", 0.75);

        // Texte %
        heat.selectAll(".zone-text")
            .data(zones)
            .enter()
            .append("text")
            .attr("x", d => (d.id % this.cols) * zoneW + zoneW / 2)
            .attr("y", d => Math.floor(d.id / this.cols) * zoneH + zoneH / 2)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .attr("fill", "white")
            .style("font-size", "18px")
            .style("font-weight", "700")
            .text(d => `${d.pct.toFixed(2)}%`);
    }
}
