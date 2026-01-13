/**
 * timeline.js
 */

export class Timeline {
  constructor(containerId) {
    this.containerId = containerId;
    this.margin = { top: 50, right: 20, bottom: 70, left: 50 };
    this.colors = {
      passes: '#3b82f6',
      shots: '#ef4444',
      dribbles: '#22c55e',
      defensive: '#8b5cf6',
      goals: '#eab308'
    };
  }

  update(events, timeRange = [0, 100]) {
    const container = document.getElementById(this.containerId);
    if (!container) return;
    container.innerHTML = '';

    // Créer conteneur principal
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100%;
      height: 100%;
      padding: 10px;
      box-sizing: border-box;
    `;
    container.appendChild(wrapper);

    // Agréger les événements par minute avec détails
    const eventsByMinute = {};
    const keyMoments = [];
    
    events.forEach(e => {
      const min = e.minute || 0;
      if (!eventsByMinute[min]) {
        eventsByMinute[min] = { 
          passes: 0, shots: 0, dribbles: 0, defensive: 0, goals: 0, 
          keyPasses: 0, assists: 0
        };
      }
      
      const type = e.type?.displayName;
      if (type === 'Pass') {
        eventsByMinute[min].passes++;
        if (e.qualifiers?.some(q => ['KeyPass', 'Assist'].includes(q.type?.displayName))) {
          eventsByMinute[min].keyPasses++;
        }
      }
      else if (['MissedShots', 'SavedShot', 'Goal', 'ShotOnPost'].includes(type)) {
        eventsByMinute[min].shots++;
        if (type === 'Goal') {
          eventsByMinute[min].goals++;
          keyMoments.push({ minute: min, type: 'goal', label: '⚽ But' });
        }
      }
      else if (type === 'TakeOn') eventsByMinute[min].dribbles++;
      else if (['Tackle', 'Interception', 'BallRecovery', 'Clearance'].includes(type))
        eventsByMinute[min].defensive++;
    });

    const allData = Object.entries(eventsByMinute)
      .map(([min, counts]) => ({
        minute: parseInt(min),
        ...counts,
        total: counts.passes + counts.shots + counts.dribbles + counts.defensive
      }))
      .sort((a, b) => a.minute - b.minute);

    // Filtrer selon timeRange
    const data = allData.filter(d => d.minute >= timeRange[0] && d.minute <= timeRange[1]);

    if (data.length === 0) {
      this.showEmptyMessage(container);
      return;
    }

    // Stats globales pour la période
    const stats = this.calculateStats(data);
    this.addStatsHeader(wrapper, stats, timeRange);

    // Graphique principal - RESPONSIVE
    const chartContainer = document.createElement('div');
    chartContainer.style.cssText = `
      flex: 1;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(10px);
      border-radius: 16px;
      border: 1px solid rgba(59, 130, 246, 0.2);
      padding: 15px 10px;
      position: relative;
      min-height: 0;
      width: 100%;
      overflow: hidden;
    `;
    wrapper.appendChild(chartContainer);

    // Calculer dimensions dynamiquement
    const containerRect = chartContainer.getBoundingClientRect();
    const width = Math.max(containerRect.width || 800, 600);
    const height = Math.max(containerRect.height || 400, 300);

    const svg = d3.select(chartContainer)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    const g = svg.append('g')
      .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`);

    const innerWidth = width - this.margin.left - this.margin.right;
    const innerHeight = height - this.margin.top - this.margin.bottom;

    // Échelles
    const xScale = d3.scaleLinear()
      .domain(timeRange)
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.total) * 1.15 || 10])
      .range([innerHeight, 0]);

    // Marqueurs de mi-temps
    if (timeRange[0] <= 45 && timeRange[1] >= 45) {
      const halfTimeG = g.append('g').attr('class', 'halftime-marker');
      
      halfTimeG.append('line')
        .attr('x1', xScale(45))
        .attr('y1', 0)
        .attr('x2', xScale(45))
        .attr('y2', innerHeight)
        .attr('stroke', '#eab308')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5')
        .attr('opacity', 0.6);

      halfTimeG.append('rect')
        .attr('x', xScale(45) - 30)
        .attr('y', -15)
        .attr('width', 60)
        .attr('height', 25)
        .attr('fill', 'rgba(234, 179, 8, 0.2)')
        .attr('rx', 6);

      halfTimeG.append('text')
        .attr('x', xScale(45))
        .attr('y', 0)
        .attr('text-anchor', 'middle')
        .attr('fill', '#eab308')
        .style('font-size', '11px')
        .style('font-weight', '700')
        .text('MI-TEMPS');
    }

    // Grille moderne
    const gridG = g.append('g').attr('class', 'grid').attr('opacity', 0.08);
    
    yScale.ticks(5).forEach(tick => {
      gridG.append('line')
        .attr('x1', 0)
        .attr('y1', yScale(tick))
        .attr('x2', innerWidth)
        .attr('y2', yScale(tick))
        .attr('stroke', 'white')
        .attr('stroke-width', 1);
    });

    // Aires empilées (stacked area)
    const stack = d3.stack()
      .keys(['defensive', 'dribbles', 'shots', 'passes'])
      .order(d3.stackOrderNone)
      .offset(d3.stackOffsetNone);

    const series = stack(data);

    const area = d3.area()
      .x(d => xScale(d.data.minute))
      .y0(d => yScale(d[0]))
      .y1(d => yScale(d[1]))
      .curve(d3.curveCatmullRom.alpha(0.5));

    // Définir les gradients
    this.defineGradients(svg);

    // Dessiner les aires avec animation
    series.forEach((s, i) => {
      const key = s.key;
      const color = this.colors[key];
      
      const path = g.append('path')
        .datum(s)
        .attr('class', `area-${key}`)
        .attr('d', area)
        .attr('fill', `url(#gradient-${key})`)
        .attr('opacity', 0);

      // Animation d'entrée
      path.transition()
        .duration(800)
        .delay(i * 100)
        .attr('opacity', 0.85);

      // Ligne de contour
      const line = d3.line()
        .x(d => xScale(d.data.minute))
        .y(d => yScale(d[1]))
        .curve(d3.curveCatmullRom.alpha(0.5));

      g.append('path')
        .datum(s)
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 1.5)
        .attr('opacity', 0)
        .transition()
        .duration(800)
        .delay(i * 100)
        .attr('opacity', 0.4);
    });

    // Axes
    const xAxis = g.append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(xScale)
        .ticks(Math.min(15, Math.ceil((timeRange[1] - timeRange[0]) / 3)))
        .tickFormat(d => Math.round(d) + "'")
      );

    xAxis.selectAll('text')
      .attr('fill', '#cbd5e1')
      .style('font-size', '11px')
      .style('font-weight', '600');

    xAxis.selectAll('line, path')
      .attr('stroke', '#475569')
      .attr('stroke-width', 2);

    const yAxis = g.append('g')
      .call(d3.axisLeft(yScale)
        .ticks(5)
        .tickFormat(d => d.toFixed(0))
      );

    yAxis.selectAll('text')
      .attr('fill', '#cbd5e1')
      .style('font-size', '11px')
      .style('font-weight', '600');

    yAxis.selectAll('line, path')
      .attr('stroke', '#475569')
      .attr('stroke-width', 2);

    // Label Y
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -38)
      .attr('x', -innerHeight / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#e2e8f0')
      .style('font-size', '12px')
      .style('font-weight', '700')
      .style('letter-spacing', '0.5px')
      .text('INTENSITÉ');

    // Marqueurs de buts
    keyMoments.filter(km => km.type === 'goal' && km.minute >= timeRange[0] && km.minute <= timeRange[1])
      .forEach(km => {
        const goalG = g.append('g');
        
        goalG.append('circle')
          .attr('cx', xScale(km.minute))
          .attr('cy', -20)
          .attr('r', 0)
          .attr('fill', '#eab308')
          .transition()
          .duration(500)
          .attr('r', 8);

        goalG.append('text')
          .attr('x', xScale(km.minute))
          .attr('y', -16)
          .attr('text-anchor', 'middle')
          .attr('fill', 'white')
          .style('font-size', '10px')
          .text('⚽');
      });

    // Points interactifs
    this.addInteractivePoints(g, data, xScale, yScale);

    // Légende interactive
    this.addInteractiveLegend(svg, stats, width, height, this.margin);

    // Mini-cartes comparatives (si période complète)
    if (timeRange[0] === 0 && timeRange[1] >= 90) {
      this.addMiniComparisonCharts(wrapper, allData);
    }
  }

  defineGradients(svg) {
    const defs = svg.append('defs');

    Object.entries(this.colors).forEach(([key, color]) => {
      const gradient = defs.append('linearGradient')
        .attr('id', `gradient-${key}`)
        .attr('x1', '0%').attr('y1', '0%')
        .attr('x2', '0%').attr('y2', '100%');

      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', color)
        .attr('stop-opacity', 0.8);

      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', color)
        .attr('stop-opacity', 0.1);
    });
  }

  addInteractivePoints(g, data, xScale, yScale) {
    const tooltip = d3.select('body')
      .append('div')
      .attr('class', 'timeline-tooltip-advanced')
      .style('position', 'absolute')
      .style('display', 'none')
      .style('background', 'rgba(15, 23, 42, 0.98)')
      .style('color', 'white')
      .style('padding', '14px 18px')
      .style('border-radius', '10px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('z-index', '10000')
      .style('border', '1px solid rgba(59, 130, 246, 0.4)')
      .style('box-shadow', '0 10px 40px rgba(0,0,0,0.6)')
      .style('backdrop-filter', 'blur(20px)');

    // Ligne verticale de survol
    const hoverLine = g.append('line')
      .attr('class', 'hover-line')
      .attr('y1', 0)
      .attr('y2', yScale(0))
      .attr('stroke', 'rgba(255,255,255,0.3)')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3')
      .style('display', 'none');

    // Zone de détection
    const overlay = g.append('rect')
      .attr('width', xScale.range()[1])
      .attr('height', yScale.range()[0])
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair')
      .on('mousemove', function(event) {
        const [mouseX] = d3.pointer(event, this);
        const minute = xScale.invert(mouseX);
        
        // Trouver la minute la plus proche dans les données
        const d = data.reduce((closest, item) => {
          const diff = Math.abs(item.minute - minute);
          const closestDiff = Math.abs(closest.minute - minute);
          return diff < closestDiff ? item : closest;
        }, data[0]);

        if (d) {
          hoverLine
            .attr('x1', xScale(d.minute))
            .attr('x2', xScale(d.minute))
            .style('display', null);

          tooltip
            .style('display', 'block')
            .html(`
              <div style="border-bottom: 2px solid rgba(59,130,246,0.4); padding-bottom: 8px; margin-bottom: 8px;">
                <strong style="font-size: 15px; color: #60a5fa;">Minute ${d.minute}'</strong>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; font-size: 11px;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <div style="width: 8px; height: 8px; background: ${this.colors.passes}; border-radius: 2px;"></div>
                  <span style="color: #cbd5e1;">Passes</span>
                  <strong style="margin-left: auto; color: white;">${d.passes}</strong>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <div style="width: 8px; height: 8px; background: ${this.colors.shots}; border-radius: 2px;"></div>
                  <span style="color: #cbd5e1;">Tirs</span>
                  <strong style="margin-left: auto; color: white;">${d.shots}</strong>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <div style="width: 8px; height: 8px; background: ${this.colors.dribbles}; border-radius: 2px;"></div>
                  <span style="color: #cbd5e1;">Dribbles</span>
                  <strong style="margin-left: auto; color: white;">${d.dribbles}</strong>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <div style="width: 8px; height: 8px; background: ${this.colors.defensive}; border-radius: 2px;"></div>
                  <span style="color: #cbd5e1;">Défense</span>
                  <strong style="margin-left: auto; color: white;">${d.defensive}</strong>
                </div>
              </div>
              <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1);">
                <span style="color: #94a3b8;">Intensité:</span>
                <strong style="color: #60a5fa; margin-left: 8px;">${d.total} actions</strong>
              </div>
              ${d.goals > 0 ? `<div style="margin-top: 8px; background: rgba(234,179,8,0.2); padding: 6px 10px; border-radius: 6px; text-align: center;">
                <strong style="color: #eab308;">⚽ ${d.goals} But${d.goals > 1 ? 's' : ''}</strong>
              </div>` : ''}
            `)
            .style('left', (event.pageX + 15) + 'px')
            .style('top', (event.pageY - 10) + 'px');
        }
      }.bind(this))
      .on('mouseout', () => {
        hoverLine.style('display', 'none');
        tooltip.style('display', 'none');
      });
  }

  addStatsHeader(wrapper, stats, timeRange) {
    const header = document.createElement('div');
    header.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
      width: 100%;
    `;

    const statCards = [
      { label: 'Période', value: `${timeRange[0]}' - ${timeRange[1]}'`, color: '#60a5fa', icon: '⏱️' },
      { label: 'Intensité Moy.', value: stats.avgIntensity.toFixed(1), color: '#22c55e', icon: '📊' },
      { label: 'Pic d\'Activité', value: `${stats.peakMinute}'`, color: '#eab308', icon: '⚡' },
      { label: 'Total Actions', value: stats.totalActions, color: '#8b5cf6', icon: '🎯' }
    ];

    statCards.forEach(stat => {
      const card = document.createElement('div');
      card.style.cssText = `
        background: rgba(15, 23, 42, 0.6);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(59, 130, 246, 0.2);
        border-radius: 10px;
        padding: 12px;
        display: flex;
        align-items: center;
        gap: 10px;
        transition: all 0.3s ease;
        min-height: 60px;
      `;

      card.innerHTML = `
        <div style="font-size: 1.8rem; opacity: 0.8; flex-shrink: 0;">${stat.icon}</div>
        <div style="flex: 1; min-width: 0;">
          <div style="font-size: 0.7rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${stat.label}
          </div>
          <div style="font-size: 1.3rem; font-weight: 700; color: ${stat.color}; margin-top: 2px;">
            ${stat.value}
          </div>
        </div>
      `;

      card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-2px)';
        card.style.boxShadow = `0 8px 24px ${stat.color}33`;
        card.style.borderColor = stat.color;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0)';
        card.style.boxShadow = 'none';
        card.style.borderColor = 'rgba(59, 130, 246, 0.2)';
      });

      header.appendChild(card);
    });

    wrapper.appendChild(header);
  }

  addInteractiveLegend(svg, stats, width, height, margin) {
    const legendData = [
      { key: 'passes', label: 'Passes', value: stats.totalPasses },
      { key: 'shots', label: 'Tirs', value: stats.totalShots },
      { key: 'dribbles', label: 'Dribbles', value: stats.totalDribbles },
      { key: 'defensive', label: 'Défense', value: stats.totalDefensive }
    ];

    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${margin.left + 10}, ${height - 45})`);

    legendData.forEach((item, i) => {
      const spacing = Math.max(Math.min(200, (width - margin.left - margin.right) / legendData.length), 120);
      const itemG = legend.append('g')
        .attr('transform', `translate(${i * spacing}, 0)`)
        .style('cursor', 'pointer');

      itemG.append('rect')
        .attr('width', 16)
        .attr('height', 16)
        .attr('rx', 4)
        .attr('fill', this.colors[item.key])
        .attr('opacity', 0.8);

      itemG.append('text')
        .attr('x', 22)
        .attr('y', 12)
        .attr('fill', '#e2e8f0')
        .style('font-size', '13px')
        .style('font-weight', '600')
        .text(item.label);

      itemG.append('text')
        .attr('x', spacing - 50)
        .attr('y', 12)
        .attr('fill', this.colors[item.key])
        .style('font-size', '13px')
        .style('font-weight', '700')
        .text(item.value);

      itemG.on('mouseenter', function() {
        itemG.select('rect').transition().duration(200).attr('opacity', 1).attr('width', 18).attr('height', 18);
        itemG.selectAll('text').transition().duration(200).style('font-size', '14px');
      });

      itemG.on('mouseleave', function() {
        itemG.select('rect').transition().duration(200).attr('opacity', 0.8).attr('width', 16).attr('height', 16);
        itemG.selectAll('text').transition().duration(200).style('font-size', '13px');
      });
    });
  }

  addMiniComparisonCharts(wrapper, allData) {
    const firstHalf = allData.filter(d => d.minute <= 45);
    const secondHalf = allData.filter(d => d.minute > 45);

    if (firstHalf.length === 0 || secondHalf.length === 0) return;

    const compareContainer = document.createElement('div');
    compareContainer.style.cssText = `
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-top: 10px;
    `;

    const stats1 = this.calculateStats(firstHalf);
    const stats2 = this.calculateStats(secondHalf);

    [
      { label: '1ère Mi-Temps', stats: stats1, color: '#3b82f6' },
      { label: '2ème Mi-Temps', stats: stats2, color: '#ef4444' }
    ].forEach(half => {
      const card = document.createElement('div');
      card.style.cssText = `
        background: rgba(15, 23, 42, 0.4);
        border: 1px solid ${half.color}44;
        border-radius: 12px;
        padding: 15px;
      `;

      card.innerHTML = `
        <div style="font-weight: 700; color: ${half.color}; margin-bottom: 10px; font-size: 0.9rem;">
          ${half.label}
        </div>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 0.85rem;">
          <div style="color: #cbd5e1;">Passes: <strong style="color: white;">${half.stats.totalPasses}</strong></div>
          <div style="color: #cbd5e1;">Tirs: <strong style="color: white;">${half.stats.totalShots}</strong></div>
          <div style="color: #cbd5e1;">Dribbles: <strong style="color: white;">${half.stats.totalDribbles}</strong></div>
          <div style="color: #cbd5e1;">Défense: <strong style="color: white;">${half.stats.totalDefensive}</strong></div>
        </div>
      `;

      compareContainer.appendChild(card);
    });

    wrapper.appendChild(compareContainer);
  }

  calculateStats(data) {
    const totalActions = d3.sum(data, d => d.total);
    const avgIntensity = totalActions / data.length || 0;
    const peakData = data.reduce((max, d) => d.total > max.total ? d : max, data[0] || { total: 0 });
    
    return {
      totalActions,
      avgIntensity,
      peakMinute: peakData.minute || 0,
      totalPasses: d3.sum(data, d => d.passes),
      totalShots: d3.sum(data, d => d.shots),
      totalDribbles: d3.sum(data, d => d.dribbles),
      totalDefensive: d3.sum(data, d => d.defensive)
    };
  }

  showEmptyMessage(container) {
    const div = document.createElement('div');
    div.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      color: #94a3b8;
      padding: 60px 20px;
    `;
    div.innerHTML = `
      <i class="fas fa-chart-line" style="font-size: 4rem; margin-bottom: 20px; color: #475569; opacity: 0.5;"></i>
      <h3 style="font-size: 1.3rem; font-weight: 700; color: #cbd5e1; margin-bottom: 8px;">Aucune donnée</h3>
      <p style="font-size: 1rem; font-weight: 500;">Sélectionnez une autre période</p>
    `;
    container.appendChild(div);
  }
}