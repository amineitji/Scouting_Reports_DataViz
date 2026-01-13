/**
 * dashboard.js
 * Vue d'ensemble complète en mosaïque moderne
 */
import { RadarChart } from './radarChart.js';

export class Dashboard {
    constructor(containerId) {
        this.containerId = containerId;
        this.radarChart = null;
    }

    update(stats) {
        const container = document.getElementById(this.containerId);
        if (!container) return;
        
        container.innerHTML = '';

        // Layout moderne avec radar à gauche sur toute la hauteur
        const layout = `
            <div class="dashboard-modern">
                <!-- COLONNE GAUCHE - RADAR (toute hauteur) -->
                <div class="dashboard-left">
                    <div class="radar-card" style="height: 100%;">
                        <div class="radar-title">
                            <i class="fas fa-chart-radar"></i>
                            <span>Profil Performance</span>
                        </div>
                        <div class="radar-content" id="dashboard-radar-content"></div>
                    </div>
                </div>

                <!-- COLONNE CENTRE - Passes Card -->
                <div class="dashboard-center">
                    <div class="stat-card stat-card-passes" style="height: 100%;">
                        <div class="stat-card-header">
                            <div class="stat-icon" style="background: linear-gradient(135deg, #10b981, #059669);">
                                <i class="fas fa-project-diagram"></i>
                            </div>
                            <div class="stat-info">
                                <h3>Passes</h3>
                                <div class="stat-big">${stats.passing.total}</div>
                            </div>
                        </div>
                        <div class="stat-bars-compact">
                            <div class="stat-bar-compact">
                                <span>Précision</span>
                                <strong style="color: #10b981;">${stats.passing.rate}%</strong>
                            </div>
                            <div class="progress-track">
                                <div class="progress-fill" style="width: ${stats.passing.rate}%; background: linear-gradient(90deg, #10b981, #059669);"></div>
                            </div>
                            <div class="stat-bar-compact">
                                <span>Passes Clés</span>
                                <strong style="color: #eab308;">${stats.passing.key}</strong>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- COLONNE DROITE - Tirs Card -->
                <div class="dashboard-right">
                    <div class="stat-card stat-card-shooting" style="height: 100%;">
                        <div class="stat-card-header">
                            <div class="stat-icon" style="background: linear-gradient(135deg, #ef4444, #dc2626);">
                                <i class="fas fa-bullseye"></i>
                            </div>
                            <div class="stat-info">
                                <h3>Tirs</h3>
                                <div class="stat-big">${stats.shooting.total}</div>
                            </div>
                        </div>
                        <div class="stat-bars-compact">
                            <div class="dual-mini-stats">
                                <div class="mini-stat">
                                    <div class="mini-stat-value" style="color: #eab308;">${stats.shooting.goals}</div>
                                    <div class="mini-stat-label">BUTS</div>
                                </div>
                                <div class="mini-stat">
                                    <div class="mini-stat-value" style="color: #f59e0b;">${stats.shooting.xg}</div>
                                    <div class="mini-stat-label">xG</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- BOTTOM - MÉTRIQUES DÉTAILLÉES (colonnes 2-3) -->
                <div class="dashboard-bottom">
                    <div class="metrics-card" style="height: 100%;">
                        <div class="metrics-header">
                            <i class="fas fa-chart-bar"></i>
                            <span>Statistiques Détaillées</span>
                        </div>
                        <div id="dashboard-metrics-content" style="height: calc(100% - 40px);"></div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = layout;

        // Render components
        this.radarChart = new RadarChart('dashboard-radar-content');
        this.radarChart.update(stats);
        this.renderMetrics(stats);
    }

    renderMetrics(stats) {
        const container = document.getElementById('dashboard-metrics-content');
        if (!container) return;

        const metrics = [
            { label: 'Volume Passes', value: stats.passing.total, icon: 'fas fa-exchange-alt', color: '#3b82f6' },
            { label: 'Précision', value: `${stats.passing.rate}%`, icon: 'fas fa-crosshairs', color: '#22c55e' },
            { label: 'Passes Clés', value: stats.passing.key, icon: 'fas fa-key', color: '#eab308' },
            { label: 'Dribbles', value: `${stats.dribbling.success}/${stats.dribbling.total}`, icon: 'fas fa-running', color: '#22c55e' },
            { label: 'Réussite Dribbles', value: `${stats.dribbling.rate}%`, icon: 'fas fa-percent', color: '#10b981' },
            { label: 'Tirs', value: stats.shooting.total, icon: 'fas fa-bullseye', color: '#ef4444' },
            { label: 'Buts', value: stats.shooting.goals, icon: 'fas fa-futbol', color: '#eab308' },
            { label: 'xG', value: stats.shooting.xg, icon: 'fas fa-chart-line', color: '#f59e0b' },
            { label: 'Tacles', value: stats.defense.tackles, icon: 'fas fa-hand-rock', color: '#8b5cf6' },
            { label: 'Interceptions', value: stats.defense.interceptions, icon: 'fas fa-hand-paper', color: '#a78bfa' },
            { label: 'Récupérations', value: stats.defense.recoveries, icon: 'fas fa-redo', color: '#c4b5fd' },
            { label: 'Total Défense', value: stats.defense.total, icon: 'fas fa-shield-alt', color: '#8b5cf6' }
        ];

        // Affichage en grille responsive
        container.style.display = 'grid';
        container.style.gridTemplateColumns = 'repeat(auto-fit, minmax(140px, 1fr))';
        container.style.gap = '8px';
        container.style.overflowY = 'auto';
        container.style.padding = '4px';

        let html = '';
        metrics.forEach(m => {
            html += `
                <div class="metric-pill">
                    <div class="metric-pill-icon" style="color: ${m.color};">
                        <i class="${m.icon}"></i>
                    </div>
                    <div class="metric-pill-content">
                        <div class="metric-pill-value">${m.value}</div>
                        <div class="metric-pill-label">${m.label}</div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }
}