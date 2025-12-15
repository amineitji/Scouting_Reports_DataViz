import { DataManager } from './dataManager.js';
import { Heatmap } from './heatmap.js';
import { PassMap } from './passmap.js';
import { ActionMap } from './actions.js';
import { RadarChart } from './radarChart.js';

class Dashboard {
    constructor() {
        this.dataManager = new DataManager();
        this.currentView = 'heatmap'; 
        this.charts = { heatmap: null, passes: null, actions: null, radar: null };
        this.init();
    }

    async init() {
        await this.loadFileList();
        this.setupEventListeners();
        this.charts.radar = new RadarChart('radar-chart');
    }

    setupEventListeners() {
        document.getElementById('fileSelect').addEventListener('change', (e) => this.loadData(e.target.value));
        ['time-min', 'time-max'].forEach(id => document.getElementById(id).addEventListener('input', () => this.updateFilters()));
        document.getElementById('filter-success').addEventListener('change', () => this.updateFilters());
        document.getElementById('filter-failed').addEventListener('change', () => this.updateFilters());

        document.querySelectorAll('.zone-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.zone-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.updateFilters();
            });
        });

        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                this.switchView(e.target.dataset.view);
            });
        });
        
        // Sous-filtres
        ['opt-keypass', 'opt-pass-success', 'opt-pass-fail', 'opt-goal', 'opt-shot', 'opt-dribble', 'opt-defense']
            .forEach(id => {
                const el = document.getElementById(id);
                if(el) el.addEventListener('change', () => this.updateSubFilters());
            });
    }

    async loadFileList() {
        try {
            const res = await fetch('/api/files');
            const files = await res.json();
            const select = document.getElementById('fileSelect');
            select.innerHTML = '<option value="" disabled selected>Choisir un rapport...</option>';
            files.forEach(f => {
                const opt = document.createElement('option');
                opt.value = f; opt.textContent = f.replace(/_/g, ' ').replace('.json', '');
                select.appendChild(opt);
            });
            if (files.length > 0) { select.value = files[0]; this.loadData(files[0]); }
        } catch (e) { console.error(e); }
    }

    async loadData(filename) {
        try {
            const res = await fetch(`/data/${filename}`);
            const data = await res.json();
            this.dataManager.setData(data);
            this.renderGlobalStats();
            this.updateFilters();
        } catch (e) { console.error(e); }
    }

    updateFilters() {
        const tMin = parseInt(document.getElementById('time-min').value);
        const tMax = parseInt(document.getElementById('time-max').value);
        document.getElementById('time-val').textContent = `${tMin}-${tMax} min`;

        const filters = {
            timeRange: [tMin, tMax],
            success: document.getElementById('filter-success').checked,
            failed: document.getElementById('filter-failed').checked,
            zone: document.querySelector('.zone-btn.active').dataset.zone
        };

        const events = this.dataManager.getFilteredEvents(filters);
        this.updateViews(events);
        this.updateSidebarSummary(events);
    }

    updateSubFilters() {
        if (this.currentView === 'passes' && this.charts.passes) {
            this.charts.passes.updateOptions({
                showKeyPasses: document.getElementById('opt-keypass').checked,
                showSuccessful: document.getElementById('opt-pass-success').checked,
                showFailed: document.getElementById('opt-pass-fail').checked
            });
        }
        else if (this.currentView === 'actions' && this.charts.actions) {
            this.charts.actions.updateOptions({
                showGoals: document.getElementById('opt-goal').checked,
                showShots: document.getElementById('opt-shot').checked,
                showDribbles: document.getElementById('opt-dribble').checked,
                showDefensive: document.getElementById('opt-defense').checked
            });
        }
    }

    switchView(viewName) {
        this.currentView = viewName;
        document.getElementById('viz-container').innerHTML = '';
        this.charts[viewName] = null;
        
        document.getElementById('filters-passes').style.display = viewName === 'passes' ? 'block' : 'none';
        document.getElementById('filters-actions').style.display = viewName === 'actions' ? 'block' : 'none';
        
        this.updateFilters();
    }

    updateViews(events) {
        const id = 'main-pitch';
        const container = document.getElementById('viz-container');
        if (container.innerHTML === '') container.innerHTML = `<svg id="${id}" width="100%" height="100%"></svg>`;
        
        if (this.currentView === 'heatmap') {
            if (!this.charts.heatmap) this.charts.heatmap = new Heatmap(id);
            this.charts.heatmap.render(events);
        } else if (this.currentView === 'passes') {
            container.innerHTML = `<svg id="${id}" width="100%" height="100%"></svg>`;
            this.charts.passes = new PassMap(id, events);
            this.updateSubFilters();
        } else if (this.currentView === 'actions') {
            container.innerHTML = `<svg id="${id}" width="100%" height="100%"></svg>`;
            this.charts.actions = new ActionMap(id, events);
            this.updateSubFilters();
        }
        
        if (this.charts.radar) this.charts.radar.update(this.dataManager.getStats(this.dataManager.allEvents));
    }

    renderGlobalStats() {
        const meta = this.dataManager.meta;
        document.getElementById('player-header').innerHTML = `<h1>${meta.name}</h1><p class="subtitle">${meta.team} • ${meta.matches} Match(s)</p>`;
        const s = this.dataManager.getStats(this.dataManager.allEvents);
        const kpis = [
            {l:'Passes',v:s.passing.rate+'%',c:'#3b82f6'}, {l:'xG',v:s.shooting.xg,c:'#ef4444'},
            {l:'Dribbles',v:s.dribbling.total,c:'#22c55e'}, {l:'Récup',v:s.defense.recoveries,c:'#f59e0b'}
        ];
        document.getElementById('kpi-container').innerHTML = kpis.map(k=>`<div class="kpi-box" style="border-left:3px solid ${k.c};background:#1e293b;padding:10px 15px;border-radius:4px;margin-right:10px"><span style="color:${k.c};font-weight:bold;font-size:1.2rem;display:block">${k.v}</span><span style="font-size:0.75rem;color:#94a3b8">${k.l}</span></div>`).join('');
    }

    updateSidebarSummary(ev) {
        document.getElementById('sidebar-summary').innerHTML = `<div style="margin-top:20px;padding-top:20px;border-top:1px solid #334;color:#94a3b8;font-size:0.9rem"><strong>Résumé :</strong><br><span style="color:white;font-size:1.1rem">${ev.length}</span> actions</div>`;
    }
}

window.addEventListener('DOMContentLoaded', () => new Dashboard());