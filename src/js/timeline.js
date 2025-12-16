/**
 * timeline.js
 * Timeline des événements du match
 */
export class Timeline {
    constructor(containerId) {
        this.containerId = containerId;
        this.width = 500;
        this.height = 250;
        this.margin = { top: 30, right: 30, bottom: 40, left: 50 };
    }

    update(events, timeRange = [0, 100]) {
        const container = document.getElementById(this.containerId);
        if (!container) return;
        
        container.innerHTML = '';

        // Agréger les événements par minute
        const eventsByMinute = {};
        events.forEach(e => {
            const min = e.minute || 0;
            if (!eventsByMinute[min]) {
                eventsByMinute[min] = {
                    passes: 0,
                    shots: 0,
                    dribbles: 0,
                    defensive: 0
                };
            }
            
            const type = e.type?.displayName;
            if (type === 'Pass') eventsByMinute[min].passes++;
            else if (['MissedShots', 'SavedShot', 'Goal', 'ShotOnPost'].includes(type)) 
                eventsByMinute[min].shots++;
            else if (type === 'TakeOn') 
                eventsByMinute[min].dribbles++;
            else if (['Tackle', 'Interception', 'BallRecovery', 'Clearance'].includes(type)) 
                eventsByMinute[min].defensive++;
        });

        const data = Object.entries(eventsByMinute)
            .map(([min, counts]) => ({
                minute: parseInt(min),
                total: counts.passes + counts.shots + counts.dribbles + counts.defensive,
                ...counts
            }))
            .sort((a, b) => a.minute - b.minute);

        if (data.length === 0) {
            this.showEmptyMessage(container);
            return;
        }

        const svg = d3.select(container)
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', `0 0 ${this.width} ${this.height}`);

        const g = svg.append('g')
            .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`);

        const innerWidth = this.width - this.margin.left - this.margin.right;
        const innerHeight = this.height - this.margin.top - this.margin.bottom;

        // Échelles
        const xScale = d3.scaleLinear()
            .domain([0, 100])
            .range([0, innerWidth]);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.total) * 1.1 || 5])
            .range([innerHeight, 0]);

        // Grille
        g.append('g')
            .attr('class', 'grid')
            .attr('opacity', 0.1)
            .call(d3.axisLeft(yScale)
                .tickSize(-innerWidth)
                .tickFormat('')
            );

        // Axe X
        const xAxis = g.append('g')
            .attr('transform', `translate(0, ${innerHeight})`)
            .call(d3.axisBottom(xScale)
                .ticks(10)
                .tickFormat(d => d + "'")
            );

        xAxis.selectAll('text')
            .attr('fill', '#94a3b8')
            .style('font-size', '11px');

        xAxis.selectAll('line')
            .attr('stroke', '#475569');

        xAxis.select('.domain')
            .attr('stroke', '#475569');

        // Axe Y
        const yAxis = g.append('g')
            .call(d3.axisLeft(yScale).ticks(5));

        yAxis.selectAll('text')
            .attr('fill', '#94a3b8')
            .style('font-size', '11px');

        yAxis.selectAll('line')
            .attr('stroke', '#475569');

        yAxis.select('.domain')
            .attr('stroke', '#475569');

        // Label Y
        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', -35)
            .attr('x', -innerHeight / 2)
            .attr('text-anchor', 'middle')
            .attr('fill', '#cbd5e1')
            .style('font-size', '12px')
            .style('font-weight', '600')
            .text('Actions');

        // Zone d'arrière-plan pour la période sélectionnée
        g.append('rect')
            .attr('x', xScale(timeRange[0]))
            .attr('y', 0)
            .attr('width', xScale(timeRange[1]) - xScale(timeRange[0]))
            .attr('height', innerHeight)
            .attr('fill', '#3b82f6')
            .attr('opacity', 0.1);

        // Aire sous la courbe
        const area = d3.area()
            .x(d => xScale(d.minute))
            .y0(innerHeight)
            .y1(d => yScale(d.total))
            .curve(d3.curveMonotoneX);

        g.append('path')
            .datum(data)
            .attr('d', area)
            .attr('fill', 'url(#timelineGradient)');

        // Gradient pour l'aire
        const gradient = svg.append('defs')
            .append('linearGradient')
            .attr('id', 'timelineGradient')
            .attr('x1', '0%')
            .attr('y1', '0%')
            .attr('x2', '0%')
            .attr('y2', '100%');

        gradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', '#3b82f6')
            .attr('stop-opacity', 0.5);

        gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', '#3b82f6')
            .attr('stop-opacity', 0.1);

        // Ligne
        const line = d3.line()
            .x(d => xScale(d.minute))
            .y(d => yScale(d.total))
            .curve(d3.curveMonotoneX);

        g.append('path')
            .datum(data)
            .attr('d', line)
            .attr('fill', 'none')
            .attr('stroke', '#3b82f6')
            .attr('stroke-width', 3);

        // Points interactifs
        const tooltip = d3.select('body')
            .append('div')
            .attr('class', 'timeline-tooltip')
            .style('position', 'absolute')
            .style('display', 'none')
            .style('background', 'rgba(15, 23, 42, 0.95)')
            .style('color', 'white')
            .style('padding', '10px 14px')
            .style('border-radius', '6px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('z-index', '1000')
            .style('border', '1px solid #334155');

        g.selectAll('.timeline-point')
            .data(data)
            .enter()
            .append('circle')
            .attr('class', 'timeline-point')
            .attr('cx', d => xScale(d.minute))
            .attr('cy', d => yScale(d.total))
            .attr('r', 4)
            .attr('fill', '#3b82f6')
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
            .style('cursor', 'pointer')
            .on('mouseover', function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', 6);

                tooltip
                    .style('display', 'block')
                    .html(`
                        <strong>Minute ${d.minute}'</strong><br>
                        Total: ${d.total} actions<br>
                        Passes: ${d.passes}<br>
                        Tirs: ${d.shots}<br>
                        Dribbles: ${d.dribbles}<br>
                        Défense: ${d.defensive}
                    `)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 10) + 'px');
            })
            .on('mouseout', function() {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', 4);

                tooltip.style('display', 'none');
            });

        // Légende
        this.addLegend(svg);
    }

    addLegend(svg) {
        const legendX = this.margin.left + 20;
        const legendY = 15;

        const legend = svg.append('g')
            .attr('class', 'legend');

        legend.append('rect')
            .attr('x', legendX - 10)
            .attr('y', legendY - 10)
            .attr('width', 160)
            .attr('height', 30)
            .attr('fill', 'rgba(0, 0, 0, 0.7)')
            .attr('rx', 6);

        legend.append('text')
            .attr('x', legendX)
            .attr('y', legendY + 5)
            .attr('fill', 'white')
            .style('font-size', '11px')
            .style('font-weight', '600')
            .text('Activité par minute');
    }

    showEmptyMessage(container) {
        const div = document.createElement('div');
        div.style.cssText = `
            text-align: center;
            color: #94a3b8;
            padding: 60px 20px;
        `;
        div.innerHTML = `
            <i class="fas fa-chart-line" style="font-size: 3rem; margin-bottom: 15px; color: #64748b;"></i>
            <p style="font-size: 1rem; font-weight: 500;">Aucune donnée de timeline disponible</p>
        `;
        container.appendChild(div);
    }
}