import { DataManager } from './dataManager.js';
import { Heatmap } from './heatmap.js';
import { PassMap } from './passmap.js';
import { ActionMap } from './actions.js';
import { RadarChart } from './radarChart.js';
import { Timeline } from './timeline.js';

class Dashboard {
    constructor() {
        this.dataManager = new DataManager();
        this.currentView = 'heatmap';
        this.charts = {
            heatmap: null,
            passes: null,
            actions: null,
            radar: null,
            timeline: null
        };
        this.init();
    }

    async init() {
        await this.loadFileList();
        this.setupEventListeners();
        this.charts.radar = new RadarChart('radar-chart');
        this.charts.timeline = new Timeline('timeline-chart');
    }

    setupEventListeners() {
        document.getElementById('fileSelect').addEventListener('change', (e) => this.loadData(e.target.value));
        
        ['time-min', 'time-max'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => this.updateFilters());
        });
        
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
        
        ['opt-keypass', 'opt-pass-success', 'opt-pass-fail', 'opt-goal', 'opt-shot', 'opt-dribble', 'opt-defense']
            .forEach(id => {
                const el = document.getElementById(id);
                if (el) el.addEventListener('change', () => this.updateSubFilters());
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
                opt.value = f;
                opt.textContent = f.replace(/_/g, ' ').replace('.json', '');
                select.appendChild(opt);
            });
            
            if (files.length > 0) {
                select.value = files[0];
                this.loadData(files[0]);
            }
        } catch (e) {
            console.error('Erreur chargement fichiers:', e);
        }
    }

    async loadData(filename) {
        try {
            const res = await fetch(`/data/${filename}`);
            const data = await res.json();
            this.dataManager.setData(data);
            this.renderGlobalStats();
            this.updateFilters();
            this.renderDetailedMetrics();
        } catch (e) {
            console.error('Erreur chargement données:', e);
        }
    }

    updateFilters() {
        const tMin = parseInt(document.getElementById('time-min').value);
        const tMax = parseInt(document.getElementById('time-max').value);
        document.getElementById('time-val').textContent = `${tMin}-${tMax}`;

        const filters = {
            timeRange: [tMin, tMax],
            success: document.getElementById('filter-success').checked,
            failed: document.getElementById('filter-failed').checked,
            zone: document.querySelector('.zone-btn.active').dataset.zone
        };

        const events = this.dataManager.getFilteredEvents(filters);
        this.updateViews(events);
        this.updateSidebarSummary(events);
        this.updateDetailedMetrics(events);
        
        if (this.charts.timeline) {
            this.charts.timeline.update(this.dataManager.allEvents, filters.timeRange);
        }
    }

    updateSubFilters() {
        if (this.currentView === 'passes' && this.charts.passes) {
            this.charts.passes.updateOptions({
                showKeyPasses: document.getElementById('opt-keypass').checked,
                showSuccessful: document.getElementById('opt-pass-success').checked,
                showFailed: document.getElementById('opt-pass-fail').checked
            });
        } else if (this.currentView === 'actions' && this.charts.actions) {
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
        
        if (container.innerHTML === '') {
            container.innerHTML = `<svg id="${id}" width="100%" height="100%"></svg>`;
        }
        
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
        
        if (this.charts.radar) {
            this.charts.radar.update(this.dataManager.getStats(this.dataManager.allEvents));
        }
    }

    renderGlobalStats() {
        const meta = this.dataManager.meta;
        const matchInfo = meta.matches > 1 ? `${meta.matches} Matchs` : meta.team;
        
        document.getElementById('player-header').innerHTML = `
            <h1>${meta.name}</h1>
            <p class="subtitle">${matchInfo} • Position: ${meta.position}</p>
        `;
        
        const s = this.dataManager.getStats(this.dataManager.allEvents);
        
        const kpis = [
            { l: 'Passes', v: s.passing.rate + '%', c: '#3b82f6' },
            { l: 'xG', v: s.shooting.xg, c: '#ef4444' },
            { l: 'Dribbles', v: s.dribbling.success + '/' + s.dribbling.total, c: '#22c55e' },
            { l: 'Récup', v: s.defense.recoveries, c: '#f59e0b' }
        ];
        
        document.getElementById('kpi-container').innerHTML = kpis.map(k => `
            <div class="kpi-box">
                <span class="kpi-value" style="color:${k.c}">${k.v}</span>
                <span class="kpi-label">${k.l}</span>
            </div>
        `).join('');
    }

    updateSidebarSummary(events) {
        const passes = events.filter(e => e.type.displayName === 'Pass');
        const shots = events.filter(e => ['Goal', 'MissedShots', 'SavedShot', 'ShotOnPost'].includes(e.type.displayName));
        const dribbles = events.filter(e => e.type.displayName === 'TakeOn');
        
        document.getElementById('sidebar-summary').innerHTML = `
            <div class="stat-line">
                <span class="metric-label">Actions totales</span>
                <span class="stat-value">${events.length}</span>
            </div>
            <div class="stat-line">
                <span class="metric-label">Passes</span>
                <span class="stat-value">${passes.length}</span>
            </div>
            <div class="stat-line">
                <span class="metric-label">Tirs</span>
                <span class="stat-value">${shots.length}</span>
            </div>
            <div class="stat-line">
                <span class="metric-label">Dribbles</span>
                <span class="stat-value">${dribbles.length}</span>
            </div>
        `;
    }

    renderDetailedMetrics() {
        const stats = this.dataManager.getStats(this.dataManager.allEvents);
        
        const metrics = [
            { 
                label: 'Précision passes', 
                value: stats.passing.rate + '%', 
                bar: stats.passing.rate,
                color: '#3b82f6'
            },
            { 
                label: 'Dribbles réussis', 
                value: `${stats.dribbling.success}/${stats.dribbling.total}`, 
                bar: stats.dribbling.total ? (stats.dribbling.success / stats.dribbling.total * 100) : 0,
                color: '#22c55e'
            },
            { 
                label: 'xG généré', 
                value: stats.shooting.xg, 
                bar: Math.min(parseFloat(stats.shooting.xg) * 50, 100),
                color: '#ef4444'
            },
            { 
                label: 'Actions défensives', 
                value: stats.defense.tackles + stats.defense.interceptions, 
                bar: Math.min((stats.defense.tackles + stats.defense.interceptions) * 5, 100),
                color: '#8b5cf6'
            }
        ];
        
        document.getElementById('detailed-metrics').innerHTML = metrics.map(m => `
            <div class="metric-item" style="border-left-color: ${m.color}">
                <div style="flex: 1">
                    <div class="metric-label">${m.label}</div>
                    <div class="metric-bar">
                        <div class="metric-bar-fill" style="width: ${m.bar}%; background: ${m.color}"></div>
                    </div>
                </div>
                <div class="metric-value" style="color: ${m.color}">${m.value}</div>
            </div>
        `).join('');
    }

    updateDetailedMetrics(events) {
        const stats = this.dataManager.getStats(events);
        
        const metrics = [
            { 
                label: 'Précision passes', 
                value: stats.passing.rate + '%', 
                bar: stats.passing.rate,
                color: '#3b82f6'
            },
            { 
                label: 'Dribbles réussis', 
                value: `${stats.dribbling.success}/${stats.dribbling.total}`, 
                bar: stats.dribbling.total ? (stats.dribbling.success / stats.dribbling.total * 100) : 0,
                color: '#22c55e'
            },
            { 
                label: 'xG généré', 
                value: stats.shooting.xg, 
                bar: Math.min(parseFloat(stats.shooting.xg) * 50, 100),
                color: '#ef4444'
            },
            { 
                label: 'Actions défensives', 
                value: stats.defense.tackles + stats.defense.interceptions, 
                bar: Math.min((stats.defense.tackles + stats.defense.interceptions) * 5, 100),
                color: '#8b5cf6'
            }
        ];
        
        document.getElementById('detailed-metrics').innerHTML = metrics.map(m => `
            <div class="metric-item" style="border-left-color: ${m.color}">
                <div style="flex: 1">
                    <div class="metric-label">${m.label}</div>
                    <div class="metric-bar">
                        <div class="metric-bar-fill" style="width: ${m.bar}%; background: ${m.color}"></div>
                    </div>
                </div>
                <div class="metric-value" style="color: ${m.color}">${m.value}</div>
            </div>
        `).join('');
    }
}

window.addEventListener('DOMContentLoaded', () => new Dashboard());