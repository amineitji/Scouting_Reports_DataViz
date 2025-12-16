/**
 * main.js
 * Application principale du dashboard de scouting
 */
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
        this.currentSlideIndex = 0;
        this.slides = document.querySelectorAll('.carousel-slide');
        
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
        this.setupCarousel();
        this.setupScrapingControls();
        
        // Initialiser les charts qui ne dépendent pas des données
        this.charts.radar = new RadarChart('radar-chart');
        this.charts.timeline = new Timeline('timeline-chart');
    }

    setupScrapingControls() {
        const btnReset = document.getElementById('btn-reset-app');

        if (btnReset) {
            btnReset.addEventListener('click', () => {
                if (confirm('Réinitialiser l\'application ?')) {
                    window.location.reload();
                }
            });
        }
    }

    setupEventListeners() {
        // Sélection de fichier
        const fileSelect = document.getElementById('fileSelect');
        if (fileSelect) {
            fileSelect.addEventListener('change', (e) => this.loadData(e.target.value));
        }
        
        // Sliders de temps
        ['time-min', 'time-max'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => this.updateFilters());
            }
        });
        
        // Filtres succès/échec
        const filterSuccess = document.getElementById('filter-success');
        const filterFailed = document.getElementById('filter-failed');
        if (filterSuccess) filterSuccess.addEventListener('change', () => this.updateFilters());
        if (filterFailed) filterFailed.addEventListener('change', () => this.updateFilters());

        // Boutons de zone
        document.querySelectorAll('.zone-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.zone-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.updateFilters();
            });
        });

        // Tabs de vue
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                if (this.currentSlideIndex !== 0) return;
                
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.switchPitchView(e.currentTarget.dataset.view);
            });
        });
        
        // Options des sous-filtres
        ['opt-keypass', 'opt-pass-success', 'opt-pass-fail', 
         'opt-goal', 'opt-shot', 'opt-dribble', 'opt-defense'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', () => this.updateSubFilters());
            }
        });
    }

    setupCarousel() {
        const prevBtn = document.getElementById('prev-slide');
        const nextBtn = document.getElementById('next-slide');
        
        if (prevBtn) prevBtn.addEventListener('click', () => this.changeSlide(-1));
        if (nextBtn) nextBtn.addEventListener('click', () => this.changeSlide(1));
        
        document.querySelectorAll('.indicator').forEach(dot => {
            dot.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.goToSlide(index);
            });
        });

        // Support swipe/drag
        const track = document.getElementById('carousel-track');
        if (track) {
            let startX = 0;
            let isDragging = false;
            
            track.addEventListener('touchstart', (e) => {
                startX = e.touches[0].clientX;
                isDragging = true;
            });
            
            track.addEventListener('touchend', (e) => {
                if (!isDragging) return;
                this.handleSwipe(startX, e.changedTouches[0].clientX);
                isDragging = false;
            });
            
            track.addEventListener('mousedown', (e) => {
                startX = e.clientX;
                isDragging = true;
                track.style.cursor = 'grabbing';
            });
            
            track.addEventListener('mouseup', (e) => {
                if (!isDragging) return;
                this.handleSwipe(startX, e.clientX);
                isDragging = false;
                track.style.cursor = 'default';
            });
            
            track.addEventListener('mouseleave', () => {
                isDragging = false;
                track.style.cursor = 'default';
            });
        }
    }

    handleSwipe(start, end) {
        if (start - end > 50) this.changeSlide(1);
        else if (end - start > 50) this.changeSlide(-1);
    }

    changeSlide(direction) {
        let newIndex = this.currentSlideIndex + direction;
        if (newIndex < 0) newIndex = this.slides.length - 1;
        if (newIndex >= this.slides.length) newIndex = 0;
        this.goToSlide(newIndex);
    }

    goToSlide(index) {
        this.currentSlideIndex = index;
        
        this.slides.forEach((s, i) => s.classList.toggle('active', i === index));
        
        document.querySelectorAll('.indicator').forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });
        
        const title = this.slides[index].dataset.title;
        const titleEl = document.getElementById('slide-title');
        if (title && titleEl) titleEl.innerText = title;

        // Mettre à jour les données si nécessaire
        if (index === 0) {
            this.switchPitchView(this.currentView);
        } else if (index === 1 || index === 3) {
            this.updateFilters();
        }
    }

    async loadFileList() {
        try {
            const res = await fetch('/api/files');
            const files = await res.json();
            
            const select = document.getElementById('fileSelect');
            if (!select) return;
            
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
            console.error('Erreur lors du chargement de la liste:', e);
        }
    }

    async loadData(filename) {
        if (!filename) return;
        
        try {
            const res = await fetch(`/data/${filename}`);
            const data = await res.json();
            
            this.dataManager.setData(data);
            this.renderMatchSelector();
            this.renderGlobalStats();
            this.updateFilters();
        } catch (e) {
            console.error('Erreur lors du chargement des données:', e);
        }
    }
    
    renderMatchSelector() {
        const container = document.getElementById('match-selector-container');
        if (!container) return;
        
        container.innerHTML = '';
        const matches = this.dataManager.getMatches();
        
        // Option "Tout sélectionner"
        const allItem = document.createElement('div');
        allItem.className = 'match-item';
        allItem.innerHTML = `
            <input type="checkbox" id="match-all" checked>
            <span><strong>Tous (${matches.length})</strong></span>
        `;
        container.appendChild(allItem);

        // Liste des matchs
        matches.forEach(m => {
            const item = document.createElement('div');
            item.className = 'match-item';
            item.innerHTML = `
                <input type="checkbox" class="match-check" value="${m.id}" checked>
                <span title="${m.label}">${m.label}</span>
            `;
            container.appendChild(item);
        });

        // Gestion du "tout sélectionner"
        const allCheckbox = document.getElementById('match-all');
        const checkboxes = document.querySelectorAll('.match-check');

        if (allCheckbox) {
            allCheckbox.addEventListener('change', (e) => {
                checkboxes.forEach(cb => cb.checked = e.target.checked);
                this.updateFilters();
            });
        }

        checkboxes.forEach(cb => {
            cb.addEventListener('change', () => {
                const allChecked = Array.from(checkboxes).every(c => c.checked);
                if (allCheckbox) allCheckbox.checked = allChecked;
                this.updateFilters();
            });
        });
    }

    updateFilters() {
        const tMinEl = document.getElementById('time-min');
        const tMaxEl = document.getElementById('time-max');
        const tValEl = document.getElementById('time-val');
        
        if (!tMinEl || !tMaxEl) return;
        
        const tMin = parseInt(tMinEl.value);
        const tMax = parseInt(tMaxEl.value);
        
        if (tValEl) tValEl.textContent = `${tMin}-${tMax}`;

        // Récupérer les matchs sélectionnés
        const selectedMatches = Array.from(document.querySelectorAll('.match-check:checked'))
            .map(cb => cb.value);

        const filterSuccess = document.getElementById('filter-success');
        const filterFailed = document.getElementById('filter-failed');
        const activeZone = document.querySelector('.zone-btn.active');

        const filters = {
            timeRange: [tMin, tMax],
            success: filterSuccess ? filterSuccess.checked : true,
            failed: filterFailed ? filterFailed.checked : true,
            zone: activeZone ? activeZone.dataset.zone : 'all',
            matchIds: selectedMatches
        };

        const events = this.dataManager.getFilteredEvents(filters);
        
        this.renderGlobalStats(selectedMatches.length);
        this.updatePitchViews(events);
        this.updateSidebarSummary(events);
        this.updateDetailedMetrics(events);
        
        if (this.charts.radar) {
            this.charts.radar.update(this.dataManager.getStats(events));
        }
        
        if (this.charts.timeline) {
            this.charts.timeline.update(events, filters.timeRange);
        }
    }

    updateSubFilters() {
        if (this.currentSlideIndex !== 0) return;
        
        if (this.currentView === 'passes' && this.charts.passes) {
            const optKey = document.getElementById('opt-keypass');
            const optSuccess = document.getElementById('opt-pass-success');
            const optFail = document.getElementById('opt-pass-fail');
            
            this.charts.passes.updateOptions({
                showKeyPasses: optKey ? optKey.checked : true,
                showSuccessful: optSuccess ? optSuccess.checked : true,
                showFailed: optFail ? optFail.checked : true
            });
        } else if (this.currentView === 'actions' && this.charts.actions) {
            const optGoal = document.getElementById('opt-goal');
            const optShot = document.getElementById('opt-shot');
            const optDribble = document.getElementById('opt-dribble');
            const optDefense = document.getElementById('opt-defense');
            
            this.charts.actions.updateOptions({
                showGoals: optGoal ? optGoal.checked : true,
                showShots: optShot ? optShot.checked : true,
                showDribbles: optDribble ? optDribble.checked : true,
                showDefensive: optDefense ? optDefense.checked : true
            });
        }
    }

    switchPitchView(viewName) {
        this.currentView = viewName;
        
        const container = document.getElementById('viz-container');
        if (container) container.innerHTML = '';
        
        this.charts[viewName] = null;
        
        // Masquer tous les filtres spécifiques
        const filtersPass = document.getElementById('filters-passes');
        const filtersActions = document.getElementById('filters-actions');
        if (filtersPass) filtersPass.style.display = 'none';
        if (filtersActions) filtersActions.style.display = 'none';

        // Afficher les filtres appropriés
        if (this.currentSlideIndex === 0) {
            if (viewName === 'passes' && filtersPass) {
                filtersPass.style.display = 'block';
            }
            if (viewName === 'actions' && filtersActions) {
                filtersActions.style.display = 'block';
            }
        }
        
        this.updateFilters();
    }

    updatePitchViews(events) {
        const id = 'main-pitch';
        const container = document.getElementById('viz-container');
        if (!container) return;
        
        if (container.innerHTML === '') {
            container.innerHTML = `<svg id="${id}" width="100%" height="100%"></svg>`;
        }
        
        if (this.currentView === 'heatmap') {
            if (!this.charts.heatmap) {
                this.charts.heatmap = new Heatmap(id);
            }
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
    }

    renderGlobalStats(activeMatchCount) {
        const meta = this.dataManager.meta;
        const matchText = activeMatchCount !== undefined
            ? (activeMatchCount > 1 ? `${activeMatchCount} Matchs` : '1 Match')
            : (meta.matches > 1 ? `${meta.matches} Matchs` : '1 Match');

        let imageHtml = '';
        if (meta.image) {
            imageHtml = `<img src="${meta.image}" class="player-profile-img" alt="${meta.name}">`;
        }

        const header = document.getElementById('player-header');
        if (header) {
            header.innerHTML = `
                ${imageHtml}
                <div class="player-details">
                    <h1>${meta.name}</h1>
                    <p class="subtitle">${matchText} • ${meta.position} • ${meta.team}</p>
                </div>
            `;
        }
        
        // KPIs avec données filtrées actuelles
        const tMinEl = document.getElementById('time-min');
        const tMaxEl = document.getElementById('time-max');
        const filterSuccess = document.getElementById('filter-success');
        const filterFailed = document.getElementById('filter-failed');
        const activeZone = document.querySelector('.zone-btn.active');
        const selectedMatches = Array.from(document.querySelectorAll('.match-check:checked'))
            .map(cb => cb.value);

        const s = this.dataManager.getStats(
            this.dataManager.getFilteredEvents({
                timeRange: tMinEl && tMaxEl ? [parseInt(tMinEl.value), parseInt(tMaxEl.value)] : [0, 100],
                success: filterSuccess ? filterSuccess.checked : true,
                failed: filterFailed ? filterFailed.checked : true,
                zone: activeZone ? activeZone.dataset.zone : 'all',
                matchIds: selectedMatches
            })
        );
        
        const kpis = [
            { l: 'Passes', v: s.passing.rate + '%', c: '#3b82f6' },
            { l: 'xG', v: s.shooting.xg, c: '#ef4444' },
            { l: 'Dribbles', v: `${s.dribbling.success}/${s.dribbling.total}`, c: '#22c55e' },
            { l: 'Récup', v: s.defense.total, c: '#8b5cf6' }
        ];
        
        const kpiCont = document.getElementById('kpi-container');
        if (kpiCont) {
            kpiCont.innerHTML = kpis.map(k => `
                <div class="kpi-box">
                    <span class="kpi-value" style="color:${k.c}">${k.v}</span>
                    <span class="kpi-label">${k.l}</span>
                </div>
            `).join('');
        }
    }

    updateSidebarSummary(events) {
        const passes = events.filter(e => e.type?.displayName === 'Pass');
        const shots = events.filter(e => 
            ['Goal', 'MissedShots', 'SavedShot', 'ShotOnPost'].includes(e.type?.displayName)
        );
        const dribbles = events.filter(e => e.type?.displayName === 'TakeOn');
        
        const summary = document.getElementById('sidebar-summary');
        if (summary) {
            summary.innerHTML = `
                <div class="stat-line">
                    <span class="metric-label">Actions</span>
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
                bar: stats.dribbling.total 
                    ? (stats.dribbling.success / stats.dribbling.total * 100) 
                    : 0,
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
                value: stats.defense.total,
                bar: Math.min(stats.defense.total * 5, 100),
                color: '#8b5cf6'
            }
        ];
        
        const dm = document.getElementById('detailed-metrics');
        if (dm) {
            dm.innerHTML = `
                <div style="width: 100%; max-width: 600px;">
                    ${metrics.map(m => `
                        <div style="
                            padding: 20px;
                            background: var(--bg-secondary);
                            border-radius: 10px;
                            border-left: 4px solid ${m.color};
                            margin-bottom: 16px;
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                        ">
                            <div style="flex: 1;">
                                <div style="color: var(--text-secondary); font-size: 0.9rem; font-weight: 500; margin-bottom: 8px;">
                                    ${m.label}
                                </div>
                                <div style="
                                    height: 8px;
                                    background: var(--bg-main);
                                    border-radius: 4px;
                                    overflow: hidden;
                                ">
                                    <div style="
                                        height: 100%;
                                        width: ${m.bar}%;
                                        background: ${m.color};
                                        transition: width 0.5s ease;
                                    "></div>
                                </div>
                            </div>
                            <div style="
                                margin-left: 20px;
                                font-size: 1.5rem;
                                font-weight: 700;
                                color: ${m.color};
                            ">
                                ${m.value}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    }
}

// Initialisation au chargement du DOM
window.addEventListener('DOMContentLoaded', () => new Dashboard());