export class Timeline {
    constructor(containerId) {
        this.containerId = containerId;
        this.width = 400;
        this.height = 200;
        this.margin = { top: 20, right: 20, bottom: 30, left: 40 };
    }

    update(events, timeRange = [0, 100]) {
        const container = document.getElementById(this.containerId);
        container.innerHTML = '';

        // Grouper les événements par minute
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
            else if (['MissedShots', 'SavedShot', 'Goal', 'ShotOnPost'].includes(type)) eventsByMinute[min].shots++;
            else if (type === 'TakeOn') eventsByMinute[min].dribbles++;
            else if (['Tackle', 'Interception', 'BallRecovery'].includes(type)) eventsByMinute[min].defensive++;
        });

        const data = Object.entries(eventsByMinute)
            .map(([min, counts]) => ({
                minute: parseInt(min),
                total: counts.passes + counts.shots + counts.dribbles + counts.defensive,
                ...counts
            }))
            .filter(d => d.minute >= timeRange[0] && d.minute <= timeRange[1])
            .sort((a, b) => a.minute - b.minute);

        if (data.length === 0) {
            container.innerHTML = '<div style="text-align:center; color:#64748b; padding:40px">Aucune donnée</div>';
            return;
        }

        const svg = d3.select(container)
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', `0 0 ${this.width} ${this.height}`);

        const g = svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        const innerWidth = this.width - this.margin.left - this.margin.right;
        const innerHeight = this.height - this.margin.top - this.margin.bottom;

        // Échelles
        const xScale = d3.scaleLinear()
            .domain([timeRange[0], timeRange[1]])
            .range([0, innerWidth]);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.total) || 1])
            .range([innerHeight, 0]);

        // Axes
        const xAxis = d3.axisBottom(xScale)
            .ticks(6)
            .tickFormat(d => d + "'");

        const yAxis = d3.axisLeft(yScale)
            .ticks(5);

        g.append('g')
            .attr('transform', `translate(0,${innerHeight})`)
            .call(xAxis)
            .attr('color', '#475569');

        g.append('g')
            .call(yAxis)
            .attr('color', '#475569');

        // Ligne d'activité
        const line = d3.line()
            .x(d => xScale(d.minute))
            .y(d => yScale(d.total))
            .curve(d3.curveMonotoneX);

        // Zone sous la courbe
        const area = d3.area()
            .x(d => xScale(d.minute))
            .y0(innerHeight)
            .y1(d => yScale(d.total))
            .curve(d3.curveMonotoneX);

        g.append('path')
            .datum(data)
            .attr('d', area)
            .attr('fill', 'url(#gradient)')
            .attr('opacity', 0.3);

        g.append('path')
            .datum(data)
            .attr('d', line)
            .attr('fill', 'none')
            .attr('stroke', '#3b82f6')
            .attr('stroke-width', 2);

        // Points
        g.selectAll('.point')
            .data(data)
            .enter()
            .append('circle')
            .attr('class', 'point')
            .attr('cx', d => xScale(d.minute))
            .attr('cy', d => yScale(d.total))
            .attr('r', 3)
            .attr('fill', '#3b82f6')
            .attr('stroke', '#1e293b')
            .attr('stroke-width', 1.5)
            .style('cursor', 'pointer')
            .on('mouseover', (event, d) => {
                d3.select(event.target).attr('r', 5);
                this.showTooltip(event, d);
            })
            .on('mouseout', (event) => {
                d3.select(event.target).attr('r', 3);
                this.hideTooltip();
            });

        // Gradient
        const defs = svg.append('defs');
        const gradient = defs.append('linearGradient')
            .attr('id', 'gradient')
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
            .attr('stop-opacity', 0);
    }

    showTooltip(event, data) {
        const tooltip = d3.select('#tooltip');
        tooltip.style('display', 'block')
            .html(`
                <strong>Minute ${data.minute}</strong><br>
                Actions: ${data.total}<br>
                <div style="font-size:0.8em; color:#94a3b8; margin-top:4px">
                    Passes: ${data.passes} • Tirs: ${data.shots}<br>
                    Dribbles: ${data.dribbles} • Déf: ${data.defensive}
                </div>
            `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 20) + 'px');
    }

    hideTooltip() {
        d3.select('#tooltip').style('display', 'none');
    }
}