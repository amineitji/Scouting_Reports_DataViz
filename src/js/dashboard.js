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

        // Layout moderne en 2×2 avec radar au centre
        const layout = `
            <div class="dashboard-modern">
                <!-- COLONNE GAUCHE -->
                <div class="dashboard-left">
                    <!-- Passes Card -->
                    <div class="stat-card stat-card-passes">
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

                    <!-- Tirs Card -->
                    <div class="stat-card stat-card-shooting">
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

                <!-- CENTRE - RADAR -->
                <div class="dashboard-center">
                    <div class="radar-card">
                        <div class="radar-title">
                            <i class="fas fa-chart-radar"></i>
                            <span>Profil Performance</span>
                        </div>
                        <div class="radar-content" id="dashboard-radar-content"></div>
                    </div>
                </div>

                <!-- COLONNE DROITE -->
                <div class="dashboard-right">
                    <!-- Dribbles Card -->
                    <div class="stat-card stat-card-dribbling">
                        <div class="stat-card-header">
                            <div class="stat-icon" style="background: linear-gradient(135deg, #22c55e, #16a34a);">
                                <i class="fas fa-running"></i>
                            </div>
                            <div class="stat-info">
                                <h3>Dribbles</h3>
                                <div class="stat-big">${stats.dribbling.total}</div>
                            </div>
                        </div>
                        <div class="stat-bars-compact">
                            <div class="stat-bar-compact">
                                <span>Réussite</span>
                                <strong style="color: #22c55e;">${stats.dribbling.rate}%</strong>
                            </div>
                            <div class="progress-track">
                                <div class="progress-fill" style="width: ${stats.dribbling.rate}%; background: linear-gradient(90deg, #22c55e, #16a34a);"></div>
                            </div>
                            <div class="stat-bar-compact">
                                <span>Réussis</span>
                                <strong style="color: #10b981;">${stats.dribbling.success}/${stats.dribbling.total}</strong>
                            </div>
                        </div>
                    </div>

                    <!-- Défense Card -->
                    <div class="stat-card stat-card-defense">
                        <div class="stat-card-header">
                            <div class="stat-icon" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed);">
                                <i class="fas fa-shield-alt"></i>
                            </div>
                            <div class="stat-info">
                                <h3>Défense</h3>
                                <div class="stat-big">${stats.defense.total}</div>
                            </div>
                        </div>
                        <div class="stat-bars-compact">
                            <div class="defense-mini-grid">
                                <div class="defense-mini-item">
                                    <div class="defense-mini-value">${stats.defense.tackles}</div>
                                    <div class="defense-mini-label">Tacles</div>
                                </div>
                                <div class="defense-mini-item">
                                    <div class="defense-mini-value">${stats.defense.interceptions}</div>
                                    <div class="defense-mini-label">Interc.</div>
                                </div>
                                <div class="defense-mini-item">
                                    <div class="defense-mini-value">${stats.defense.recoveries}</div>
                                    <div class="defense-mini-label">Récup.</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- BOTTOM - MÉTRIQUES -->
                <div class="dashboard-bottom">
                    <div class="metrics-card">
                        <div class="metrics-header">
                            <i class="fas fa-chart-bar"></i>
                            <span>Statistiques Détaillées</span>
                        </div>
                        <div class="metrics-grid-horizontal" id="dashboard-metrics-content"></div>
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
            { label: 'Tirs', value: stats.shooting.total, icon: 'fas fa-bullseye', color: '#ef4444' },
            { label: 'Buts', value: stats.shooting.goals, icon: 'fas fa-futbol', color: '#eab308' },
            { label: 'xG', value: stats.shooting.xg, icon: 'fas fa-chart-line', color: '#f59e0b' },
            { label: 'Tacles', value: stats.defense.tackles, icon: 'fas fa-hand-rock', color: '#8b5cf6' },
            { label: 'Interceptions', value: stats.defense.interceptions, icon: 'fas fa-hand-paper', color: '#a78bfa' },
            { label: 'Récupérations', value: stats.defense.recoveries, icon: 'fas fa-redo', color: '#c4b5fd' }
        ];

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