/**
 * zoneAnalysis.js
 * TODO: Analyse statistique par zone du terrain
 */
export class ZoneAnalysis {
    constructor(containerId) {
        this.containerId = containerId;
    }

    update(events) {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // Clear container
        container.innerHTML = '';

        // Display TODO message
        this.showTodoMessage(container);
    }

    showTodoMessage(container) {
        const div = document.createElement('div');
        div.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            text-align: center;
            color: #94a3b8;
            padding: 40px;
        `;
        
        div.innerHTML = `
            <i class="fas fa-th" style="font-size: 5rem; margin-bottom: 25px; color: #22c55e; opacity: 0.4;"></i>
            <h2 style="font-size: 2rem; font-weight: 700; color: #cbd5e1; margin-bottom: 15px;">Zone Analysis</h2>
            <p style="font-size: 1.1rem; font-weight: 500; margin-bottom: 10px;">TODO: À implémenter</p>
            <div style="max-width: 500px; margin-top: 20px; padding: 20px; background: rgba(34, 197, 94, 0.1); border-radius: 12px; border: 1px solid rgba(34, 197, 94, 0.3);">
                <p style="font-size: 0.9rem; line-height: 1.6; color: #94a3b8;">
                    <strong style="color: #cbd5e1;">Fonctionnalités prévues :</strong><br>
                    • Division du terrain en zones (3x3 ou 4x4)<br>
                    • Statistiques détaillées par zone<br>
                    • Taux de réussite des actions par zone<br>
                    • Comparaison zones défensive/milieu/attaque<br>
                    • Heatmap avancée avec métriques
                </p>
            </div>
        `;
        
        container.appendChild(div);
    }
}