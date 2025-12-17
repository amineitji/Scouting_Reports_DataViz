/**
 * shotmap.js
 * TODO: Visualisation de la carte des tirs avec xG
 */
import { Pitch } from './pitch.js';

export class ShotMap {
    constructor(containerId) {
        this.containerId = containerId;
        this.pitch = null;
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
            <i class="fas fa-bullseye" style="font-size: 5rem; margin-bottom: 25px; color: #3b82f6; opacity: 0.4;"></i>
            <h2 style="font-size: 2rem; font-weight: 700; color: #cbd5e1; margin-bottom: 15px;">Shot Map</h2>
            <p style="font-size: 1.1rem; font-weight: 500; margin-bottom: 10px;">TODO: À implémenter</p>
            <div style="max-width: 500px; margin-top: 20px; padding: 20px; background: rgba(59, 130, 246, 0.1); border-radius: 12px; border: 1px solid rgba(59, 130, 246, 0.3);">
                <p style="font-size: 0.9rem; line-height: 1.6; color: #94a3b8;">
                    <strong style="color: #cbd5e1;">Fonctionnalités prévues :</strong><br>
                    • Visualisation de tous les tirs sur le terrain<br>
                    • Calcul et affichage du xG (Expected Goals)<br>
                    • Distinction buts / tirs cadrés / tirs non cadrés<br>
                    • Zones de tirs avec probabilité de but
                </p>
            </div>
        `;
        
        container.appendChild(div);
    }
}