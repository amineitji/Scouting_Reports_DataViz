import { Pitch } from './pitch.js';

export class ActionMap {
    constructor(svgId, events) {
        this.pitch = new Pitch(svgId);
        this.events = events;
        
        this.options = {
            showShots: true,
            showGoals: true,
            showDribbles: true,
            showDefensive: true
        };
        
        this.tooltip = document.getElementById('tooltip');
        this.render();
    }

    updateOptions(newOptions) {
        this.options = { ...this.options, ...newOptions };
        this.render();
    }

    render() {
        this.pitch.clearDataLayer();
        const g = this.pitch.getGroup();

        this.defineMarkers();

        this.events.forEach(ev => {
            const type = ev.type.displayName;
            
            // Catégories
            const isGoal = type === 'Goal';
            const isShot = ['MissedShots', 'SavedShot', 'ShotOnPost'].includes(type);
            const isDribble = type === 'TakeOn';
            const isDefense = ['Tackle', 'Interception', 'Clearance', 'BallRecovery'].includes(type);

            // Filtrage visuel
            if (isGoal && !this.options.showGoals) return;
            if (isShot && !this.options.showShots) return;
            if (isDribble && !this.options.showDribbles) return;
            if (isDefense && !this.options.showDefensive) return;

            // Conversion coordonnées de départ
            const [startX, startY] = this.pitch.toPixels(ev.x, ev.y);

            // --- TIRS & BUTS ---
            if (isGoal || isShot) {
                this.drawShotVector(g, ev, startX, startY, isGoal);
            } 
            // --- DRIBBLES ---
            else if (isDribble) {
                const isSuccess = ev.outcomeType.value === 1;
                g.append('rect')
                    .attr('x', startX - 5).attr('y', startY - 5)
                    .attr('width', 10).attr('height', 10)
                    .attr('fill', isSuccess ? '#22c55e' : '#ef4444')
                    .attr('stroke', 'black').attr('stroke-width', 1.5)
                    .attr('transform', `rotate(45, ${startX}, ${startY})`)
                    .style('cursor', 'pointer')
                    .on('mouseover', (e) => this.showTooltip(e, ev, isSuccess ? 'Dribble Réussi' : 'Dribble Raté'))
                    .on('mouseout', () => this.hideTooltip());
            }
            // --- DÉFENSE ---
            else if (isDefense) {
                 const symbol = d3.symbol().type(d3.symbolTriangle).size(120);
                 g.append('path')
                    .attr('d', symbol)
                    .attr('transform', `translate(${startX},${startY})`)
                    .attr('fill', '#8b5cf6')
                    .attr('stroke', 'black').attr('stroke-width', 1)
                    .style('cursor', 'pointer')
                    .on('mouseover', (e) => this.showTooltip(e, ev, type))
                    .on('mouseout', () => this.hideTooltip());
            }
        });
    }

    /**
     * Helper pour extraire la valeur d'un qualifieur de manière sécurisée
     */
    getQualifierValue(event, name) {
        // CORRECTION MAJEURE ICI : on cherche dans q.type.displayName
        const q = event.qualifiers?.find(q => q.type?.displayName === name);
        return q ? parseFloat(q.value) : null;
    }

    drawShotVector(g, ev, startX, startY, isGoal) {
        // 1. Détermination de la cible X (Longueur)
        // PAR DÉFAUT : C'est la ligne de but adverse (100)
        let targetXVal = 100;
        
        // CAS PARTICULIER : Tir contré (BlockedX existe)
        const blockedX = this.getQualifierValue(ev, 'BlockedX');
        if (blockedX !== null) {
            targetXVal = blockedX;
        }

        // 2. Détermination de la cible Y (Largeur)
        // PAR DÉFAUT : On cherche GoalMouthY
        let targetYVal = this.getQualifierValue(ev, 'GoalMouthY');
        
        // SI ABSENT (Tir contré ou non cadré sans data précise) :
        if (targetYVal === null) {
            // On regarde s'il y a un BlockedY
            targetYVal = this.getQualifierValue(ev, 'BlockedY');
            // Sinon, on tire "tout droit" (fallback)
            if (targetYVal === null) targetYVal = ev.y; 
        }

        // Conversion en pixels
        const [endX, endY] = this.pitch.toPixels(targetXVal, targetYVal);

        // 3. Style Visuel
        const color = isGoal ? '#FFD700' : (ev.type.displayName === 'SavedShot' ? '#ffffff' : '#ff0055');
        const width = isGoal ? 4 : 3;
        const opacity = 1;

        // 4. Dessin du Vecteur
        g.append('line')
            .attr('x1', startX).attr('y1', startY)
            .attr('x2', endX).attr('y2', endY)
            .attr('stroke', color)
            .attr('stroke-width', width)
            .attr('marker-end', `url(#arrow-${isGoal ? 'goal' : 'shot'})`)
            .attr('opacity', opacity)
            .style('pointer-events', 'visibleStroke')
            .on('mouseover', (e) => {
                d3.select(e.target).attr('stroke-width', width + 2);
                this.showTooltip(e, ev, isGoal ? 'BUT !' : 'Tir');
            })
            .on('mouseout', (e) => {
                d3.select(e.target).attr('stroke-width', width);
                this.hideTooltip();
            });

        // 5. Point de départ
        g.append('circle')
            .attr('cx', startX).attr('cy', startY)
            .attr('r', 4.5)
            .attr('fill', color)
            .attr('stroke', 'black')
            .attr('stroke-width', 1.5)
            .style('pointer-events', 'none');
    }

    defineMarkers() {
        const defs = this.pitch.svg.select('defs').empty() ? this.pitch.svg.append('defs') : this.pitch.svg.select('defs');
        
        const createMarker = (id, color) => {
            if(defs.select(`#${id}`).empty()) {
                defs.append('marker')
                    .attr('id', id)
                    .attr('viewBox', '0 0 10 10')
                    .attr('refX', 7).attr('refY', 5)
                    .attr('markerWidth', 5).attr('markerHeight', 5)
                    .attr('orient', 'auto')
                    .append('path')
                    .attr('d', 'M 0 0 L 10 5 L 0 10 z')
                    .attr('fill', color);
            }
        };
        createMarker('arrow-goal', '#FFD700');
        createMarker('arrow-shot', '#ff0055');
    }

    showTooltip(event, data, label) {
        // Extraction corrigée avec getQualifierValue
        const gmY = this.getQualifierValue(data, 'GoalMouthY');
        const gmZ = this.getQualifierValue(data, 'GoalMouthZ');
        
        // Recherche de la partie du corps (qui est aussi un qualifieur de type displayName)
        // Note: RightFoot/LeftFoot sont souvent juste des tags sans valeur, il faut vérifier l'existence
        let bodyPart = '';
        const bodyQualifiers = ['RightFoot', 'LeftFoot', 'Head', 'OtherBodyPart'];
        const foundBody = data.qualifiers?.find(q => bodyQualifiers.includes(q.type?.displayName));
        if (foundBody) bodyPart = foundBody.type.displayName;

        let content = `<div style="text-align:center; font-weight:bold; margin-bottom:5px;">${label}</div>`;
        content += `<div style="font-size:0.85em; color:#ccc;">Minute: ${data.minute}' <span style="color:#aaa">•</span> ${bodyPart}</div>`;

        // --- MINI-CAGE (VUE DE FACE) ---
        if (gmY !== null && gmZ !== null) {
            const W = 160, H = 60;
            
            // Constantes Géométriques pour Mapping
            const postL = 44.6; // Poteau Gauche (~45%)
            const postR = 55.4; // Poteau Droit (~55%)
            const range = postR - postL;

            // Mapping X (Position latérale)
            const ballX = 10 + ((gmY - postL) / range) * (W - 20);

            // Mapping Y (Hauteur Z)
            // Z goes from 0 (Sol) to ~45-50 (Barre)
            const zMax = 45; 
            // Inversion Y pour SVG (0 en haut)
            const ballY = (H - 5) - ((gmZ / zMax) * (H - 10));

            const ballColor = label.includes('BUT') ? '#FFD700' : '#ff0055';

            content += `
                <div style="margin-top:10px; background:#222; padding:5px; border-radius:4px; border:1px solid #444;">
                    <svg width="${W}" height="${H}" style="display:block; margin:auto; background:rgba(255,255,255,0.05)">
                        <line x1="10" y1="${H}" x2="10" y2="5" stroke="white" stroke-width="3"/>
                        <line x1="${W-10}" y1="${H}" x2="${W-10}" y2="5" stroke="white" stroke-width="3"/>
                        <line x1="10" y1="5" x2="${W-10}" y2="5" stroke="white" stroke-width="3"/>
                        
                        <line x1="0" y1="${H}" x2="${W}" y2="${H}" stroke="#888" stroke-width="1"/>
                        
                        <circle cx="${ballX}" cy="${ballY}" r="5" fill="${ballColor}" stroke="white" stroke-width="1"/>
                    </svg>
                    <div style="font-size:0.7em; color:#777; margin-top:2px; text-align:center">Vue gardien</div>
                </div>
            `;
        }

        this.tooltip.innerHTML = content;
        this.tooltip.style.display = 'block';
        
        const tipW = 200; 
        let left = event.pageX + 15;
        if (left + tipW > window.innerWidth) left = event.pageX - tipW - 15;
        
        this.tooltip.style.left = left + 'px';
        this.tooltip.style.top = (event.pageY - 20) + 'px';
    }

    hideTooltip() {
        this.tooltip.style.display = 'none';
    }
}