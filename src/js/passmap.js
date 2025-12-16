import { Pitch } from './pitch.js';

export class PassMap {
    constructor(svgId, events) {
        this.pitch = new Pitch(svgId);
        this.passes = events.filter(e => e.type?.displayName === 'Pass' && e.endX != null);
        this.options = { showKeyPasses: true, showFailed: true, showSuccessful: true };
        this.tooltip = document.getElementById('tooltip');
        this.render();
    }
    
    updateOptions(opts) { this.options = { ...this.options, ...opts }; this.render(); }

    render() {
        this.pitch.clearDataLayer();
        const g = this.pitch.getGroup();
        this.defineMarkers();

        this.passes.forEach(pass => {
            const isSuccess = pass.outcomeType?.value === 1;
            const isKey = pass.qualifiers?.some(q => ['KeyPass','Assist'].includes(q.type?.displayName));
            
            if (isKey && !this.options.showKeyPasses) return;
            if (!isKey && isSuccess && !this.options.showSuccessful) return;
            if (!isSuccess && !this.options.showFailed) return;

            const color = isKey ? '#fbbf24' : (isSuccess ? '#3b82f6' : '#ef4444');
            const [x1, y1] = this.pitch.toPixels(pass.x, pass.y);
            const [x2, y2] = this.pitch.toPixels(pass.endX, pass.endY);

            const line = g.append('line')
                .attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2)
                .attr('stroke', color).attr('stroke-width', isKey?3:2).attr('opacity', 0.7)
                .attr('marker-end', `url(#arrow-${isKey?'key':(isSuccess?'ok':'ko')})`)
                .on('mouseover', (e) => this.showTooltip(e, pass));
                
            g.append('line').attr('x1',x1).attr('y1',y1).attr('x2',x2).attr('y2',y2).attr('stroke','transparent').attr('stroke-width',10)
                .on('mouseover', (e) => { line.attr('opacity',1).attr('stroke-width', 4); this.showTooltip(e, pass); })
                .on('mouseout', () => { line.attr('opacity',0.7).attr('stroke-width', isKey?3:2); this.tooltip.style.display='none'; });
        });
    }
    
    showTooltip(e, p) {
        this.tooltip.style.display = 'block';
        this.tooltip.style.left = (e.pageX+10)+'px';
        this.tooltip.style.top = (e.pageY-10)+'px';
        this.tooltip.innerHTML = `Minute: ${p.minute}<br>Type: ${p.outcomeType.displayName}`;
    }

    defineMarkers() {
        const defs = this.pitch.svg.select('defs').empty() ? this.pitch.svg.append('defs') : this.pitch.svg.select('defs');
        ['ok:#3b82f6', 'ko:#ef4444', 'key:#fbbf24'].forEach(c => {
            const [id, col] = c.split(':');
            if(defs.select(`#arrow-${id}`).empty())
                defs.append('marker').attr('id', `arrow-${id}`).attr('viewBox', '0 0 10 10').attr('refX', 8).attr('refY', 5)
                    .attr('markerWidth', 4).attr('markerHeight', 4).attr('orient', 'auto')
                    .append('path').attr('d', 'M 0 0 L 10 5 L 0 10 z').attr('fill', col);
        });
    }
}