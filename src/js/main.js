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
import { ShotMap } from './shotmap.js';
import { ZoneAnalysis } from './zoneAnalysis.js';
import { Dashboard as DashboardView } from './dashboard.js';
import { ProgressivePasses } from './progressivePasses.js';

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
            dashboard: null,
            timeline: null,
            shotmap: null,
            zoneAnalysis: null,
            progressivePasses: null
        };
        
        this.init();
        this.setupLandingPage();
        this.setupScrapingModal();
    }

    setupLandingPage() {
        console.log('🔵 Setting up landing page...');
        const btnNewScrape = document.getElementById('btn-new-scrape');
        const btnLoadExisting = document.getElementById('btn-load-existing');
        const btnBackHome = document.getElementById('btn-back-home');

        if (btnNewScrape) {
            console.log('✅ btn-new-scrape found');
            btnNewScrape.addEventListener('click', () => {
                console.log('🔵 Click: Nouveau Rapport');
                this.openScrapeModal();
            });
        } else {
            console.error('❌ btn-new-scrape not found');
        }

        if (btnLoadExisting) {
            console.log('✅ btn-load-existing found');
            btnLoadExisting.addEventListener('click', () => {
                console.log('🔵 Click: Charger Rapport');
                this.showMainApp();
            });
        } else {
            console.error('❌ btn-load-existing not found');
        }

        if (btnBackHome) {
            console.log('✅ btn-back-home found');
            btnBackHome.addEventListener('click', () => {
                console.log('🔵 Click: Retour Accueil');
                this.showLandingPage();
            });
        }
    }

    showLandingPage() {
        document.getElementById('landing-page').style.display = 'flex';
        document.getElementById('main-app').style.display = 'none';
    }

    showMainApp() {
        document.getElementById('landing-page').style.display = 'none';
        document.getElementById('main-app').style.display = 'grid';
    }

    setupScrapingModal() {
        const modal = document.getElementById('scrape-modal');
        const openBtn = document.getElementById('btn-open-scrape');
        const closeBtn = document.getElementById('close-modal');
        const startBtn = document.getElementById('start-scrape');

        if (openBtn) {
            openBtn.addEventListener('click', () => this.openScrapeModal());
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeScrapeModal());
        }

        if (startBtn) {
            startBtn.addEventListener('click', () => this.startScraping());
        }

        // Fermer au clic en dehors
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeScrapeModal();
            });
        }
    }

    openScrapeModal() {
        console.log('🔵 Opening scrape modal...');
        const modal = document.getElementById('scrape-modal');
        if (!modal) {
            console.error('❌ Modal scrape-modal not found!');
            return;
        }
        modal.classList.add('active');
        document.getElementById('player-url').value = '';
        document.getElementById('player-name').value = '';
        document.getElementById('modal-error').textContent = '';
        console.log('✅ Modal opened');
    }

    closeScrapeModal() {
        console.log('🔵 Closing scrape modal...');
        const modal = document.getElementById('scrape-modal');
        if (!modal) return;
        modal.classList.remove('active');
        console.log('✅ Modal closed');
    }

    async startScraping() {
        const url = document.getElementById('player-url').value.trim();
        const name = document.getElementById('player-name').value.trim();
        const errorEl = document.getElementById('modal-error');

        // Validation
        if (!url || !name) {
            errorEl.textContent = '⚠️ Veuillez remplir tous les champs';
            return;
        }

        if (!url.includes('whoscored.com')) {
            errorEl.textContent = '⚠️ URL WhoScored invalide';
            return;
        }

        // Détecter le type de scraping
        const isSeasonUrl = url.includes('/Players/') || url.includes('/History');
        const scrapeType = isSeasonUrl ? 'saison complète' : 'match unique';

        // Fermer le modal et afficher le loader
        this.closeScrapeModal();
        this.showLoader(scrapeType, name);

        try {
            const response = await fetch('/api/scrape', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, name })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                // Afficher un résumé détaillé
                this.showScrapingSuccess(result);
                
                setTimeout(() => {
                    this.hideLoader();
                    this.showMainApp();
                    this.loadData(result.file);
                }, 3000);
            } else {
                throw new Error(result.error || 'Erreur inconnue');
            }
        } catch (error) {
            this.updateLoaderStatus('❌ Erreur: ' + error.message, 0, '');
            setTimeout(() => {
                this.hideLoader();
                alert('Erreur lors du scraping: ' + error.message);
            }, 2000);
        }
    }

    showScrapingSuccess(result) {
        const matchesText = result.total_matches > 1 
            ? `${result.total_matches} matchs` 
            : '1 match';
        
        let detailsHtml = `<div style="margin-top: 20px; text-align: left;">`;
        
        if (result.matches && result.matches.length > 0) {
            detailsHtml += `<div style="max-height: 200px; overflow-y: auto; background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; margin-top: 15px;">`;
            detailsHtml += `<strong style="color: #3b82f6;">📋 Matchs scrapés :</strong><br><br>`;
            
            result.matches.forEach((match, idx) => {
                const date = new Date(match.date).toLocaleDateString('fr-FR');
                detailsHtml += `<div style="margin-bottom: 10px; padding: 8px; background: rgba(59, 130, 246, 0.1); border-radius: 6px;">`;
                detailsHtml += `<strong>${idx + 1}.</strong> ${date} - vs ${match.opponent} <span style="color: #22c55e;">${match.score}</span><br>`;
                detailsHtml += `<small style="color: #94a3b8;">${match.competition}</small>`;
                detailsHtml += `</div>`;
            });
            
            detailsHtml += `</div>`;
        }
        
        detailsHtml += `<div style="margin-top: 15px; padding: 15px; background: rgba(34, 197, 94, 0.1); border-radius: 8px; border-left: 4px solid #22c55e;">`;
        detailsHtml += `<strong style="color: #22c55e;">✅ Extraction réussie !</strong><br>`;
        detailsHtml += `• ${matchesText} analysé(s)<br>`;
        detailsHtml += `• ${result.total_events} événements extraits<br>`;
        detailsHtml += `• Joueur : ${result.player_name}`;
        detailsHtml += `</div>`;
        detailsHtml += `</div>`;
        
        this.updateLoaderStatus(
            '🎉 Scraping terminé !',
            100,
            detailsHtml
        );
    }

    showLoader(type = 'match', playerName = '') {
        const loader = document.getElementById('loader-overlay');
        loader.classList.add('active');
        
        const title = type === 'saison complète' 
            ? `🔍 Scraping saison de ${playerName}...`
            : `🔍 Scraping match de ${playerName}...`;
        
        document.getElementById('loader-title').textContent = title;
        
        const statusMsg = type === 'saison complète'
            ? '📡 Connexion à WhoScored (peut prendre 1-2 minutes)...'
            : '📡 Connexion à WhoScored...';
        
        this.updateLoaderStatus(statusMsg, 10, '');

        // Animation progressive différente selon le type
        if (type === 'saison complète') {
            setTimeout(() => this.updateLoaderStatus('🔎 Récupération de la liste des matchs...', 25, ''), 2000);
            setTimeout(() => this.updateLoaderStatus('📥 Scraping des matchs en cours...', 45, '<div style="margin-top: 10px; color: #94a3b8;">⏳ Cela peut prendre quelques minutes...</div>'), 5000);
            setTimeout(() => this.updateLoaderStatus('⚽ Extraction des événements...', 70, ''), 10000);
            setTimeout(() => this.updateLoaderStatus('📊 Calcul des statistiques...', 85, ''), 15000);
        } else {
            setTimeout(() => this.updateLoaderStatus('📥 Récupération des données du match...', 40, ''), 2000);
            setTimeout(() => this.updateLoaderStatus('⚽ Extraction des événements...', 65, ''), 4000);
            setTimeout(() => this.updateLoaderStatus('📊 Calcul des statistiques...', 85, ''), 6000);
        }
    }

    hideLoader() {
        const loader = document.getElementById('loader-overlay');
        loader.classList.remove('active');
    }

    updateLoaderStatus(message, progress, extraHtml = '') {
        document.getElementById('loader-status').innerHTML = message + extraHtml;
        document.getElementById('progress-fill').style.width = progress + '%';
        document.getElementById('progress-text').textContent = progress + '%';
    }

    async init() {
        await this.loadFileList();
        this.setupEventListeners();
        this.setupCarousel();
        
        // Initialiser les charts
        console.log('🔧 Initializing charts...');
        this.charts.dashboard = new DashboardView('dashboard-container');
        this.charts.timeline = new Timeline('timeline-chart');
        this.charts.shotmap = new ShotMap('shotmap-chart', []);
        this.charts.zoneAnalysis = new ZoneAnalysis('zone-analysis');
        console.log('🔧 Initializing ProgressivePasses...');
        this.charts.progressivePasses = new ProgressivePasses('progressive-passes');
        console.log('✅ All charts initialized');
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
        
        // Filtres d'actions (buts, tirs, dribbles, défense)
        const filterGoals = document.getElementById('filter-goals');
        const filterShots = document.getElementById('filter-shots');
        const filterDribbles = document.getElementById('filter-dribbles');
        const filterDefensive = document.getElementById('filter-defensive');
        if (filterGoals) filterGoals.addEventListener('change', () => this.updateActionFilters());
        if (filterShots) filterShots.addEventListener('change', () => this.updateActionFilters());
        if (filterDribbles) filterDribbles.addEventListener('change', () => this.updateActionFilters());
        if (filterDefensive) filterDefensive.addEventListener('change', () => this.updateActionFilters());

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
        console.log('🎯 goToSlide called with index:', index);
        this.currentSlideIndex = index;
        
        this.slides.forEach((s, i) => s.classList.toggle('active', i === index));

        // Mettre à jour les données selon le slide
        if (index === 0) {
            console.log('📍 Slide 0: Analyse Terrain');
            // Analyse Terrain
            this.switchPitchView(this.currentView);
        } else if (index === 1) {
            console.log('📍 Slide 1: Dashboard');
            // Dashboard
            this.updateFilters();
        } else if (index === 2) {
            console.log('📍 Slide 2: Timeline');
            // Timeline
            this.updateFilters();
        } else if (index === 3) {
            console.log('📍 Slide 3: Shot Map');
            // Shot Map
            this.updateFilters();
        } else if (index === 4) {
            console.log('📍 Slide 4: Zone Analysis');
            // Zone Analysis
            this.updateFilters();
        } else if (index === 5) {
            console.log('📍 Slide 5: Progressive Passes');
            // Progressive Passes
            this.updateFilters();
        }
        console.log('✅ goToSlide completed');
    }

    async loadFileList() {
        try {
            const res = await fetch('./data/files.json');
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
            
            // Forcer le rendu initial de la visualisation
            setTimeout(() => {
                this.switchPitchView(this.currentView);
            }, 100);
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
        
        // Dashboard
        if (this.charts.dashboard) {
            this.charts.dashboard.update(this.dataManager.getStats(events));
        }
        
        if (this.charts.timeline) {
            this.charts.timeline.update(events, filters.timeRange);
        }

        // Shot Map
        if (this.charts.shotmap) {
            this.charts.shotmap = new ShotMap('shotmap-chart', events);
        }

        // Zone Analysis
        if (this.charts.zoneAnalysis) {
            this.charts.zoneAnalysis.update(events);
        }

        // Progressive Passes
        console.log('🔍 Checking progressivePasses chart:', this.charts.progressivePasses ? 'EXISTS' : 'NULL');
        if (this.charts.progressivePasses) {
            console.log('🚀 Calling progressivePasses.update with', events.length, 'events');
            this.charts.progressivePasses.update(events);
        } else {
            console.warn('⚠️ progressivePasses chart not initialized!');
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

    updateActionFilters() {
        if (this.currentSlideIndex !== 0) return;
        if (this.currentView === 'actions' && this.charts.actions) {
            const filterGoals = document.getElementById('filter-goals');
            const filterShots = document.getElementById('filter-shots');
            const filterDribbles = document.getElementById('filter-dribbles');
            const filterDefensive = document.getElementById('filter-defensive');
            
            this.charts.actions.updateOptions({
                showGoals: filterGoals ? filterGoals.checked : true,
                showShots: filterShots ? filterShots.checked : true,
                showDribbles: filterDribbles ? filterDribbles.checked : true,
                showDefensive: filterDefensive ? filterDefensive.checked : true
            });
        }
    }

    switchPitchView(viewName) {
        this.currentView = viewName;
        
        const container = document.getElementById('viz-container');
        if (container) container.innerHTML = '';
        
        this.charts[viewName] = null;
        
        // Masquer tous les groupes de filtres spécifiques
        const filtersPass = document.getElementById('filters-passes');
        const filtersActions = document.getElementById('filters-actions');
        const actionFiltersGroup = document.getElementById('action-filters-group');
        
        if (filtersPass) filtersPass.style.display = 'none';
        if (filtersActions) filtersActions.style.display = 'none';
        if (actionFiltersGroup) actionFiltersGroup.style.display = 'none';

        // Afficher les filtres appropriés selon la vue
        if (this.currentSlideIndex === 0) {
            if (viewName === 'passes' && filtersPass) {
                filtersPass.style.display = 'block';
            }
            if (viewName === 'actions') {
                if (filtersActions) filtersActions.style.display = 'block';
                if (actionFiltersGroup) actionFiltersGroup.style.display = 'block';
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
window.addEventListener('DOMContentLoaded', () => {
    window.app = new Dashboard();
});