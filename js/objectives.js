import { store } from './store.js';
import { escapeHTML } from './utils.js';

export const Objectives = {
    render() {
        const view = document.getElementById('viewObjectives');
        if (!view || view.classList.contains('hidden')) return;

        this.setupForm();
        this.renderList();
    },

    setupForm() {
        const form = document.getElementById('objectiveForm');
        if (!form || form.dataset.listener === 'true') return;

        form.dataset.listener = 'true';
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('objTitle').value;
            const targetAmount = parseFloat(document.getElementById('objTarget').value);

            if (title && !isNaN(targetAmount)) {
                const btn = form.querySelector('button');
                const oldText = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; btn.disabled = true;

                await store.addObjective(title, targetAmount);
                form.reset();
                btn.innerHTML = oldText; btn.disabled = false;
                window.updateAllViews();
            }
        });
    },

    renderList() {
        const list = document.getElementById('objectivesList');
        if (!list) return;

        list.innerHTML = '';
        const objectives = store.objectives || [];

        // KPI totals
        let totalTarget = 0, totalSaved = 0;
        objectives.forEach(o => {
            totalTarget += parseFloat(o.target_amount || 0);
            totalSaved += parseFloat(o.current_amount || 0);
        });
        const pct = totalTarget > 0 ? Math.min((totalSaved / totalTarget) * 100, 100) : 0;
        const tEl = document.getElementById('objTotalTarget');
        const sEl = document.getElementById('objTotalSaved');
        const pEl = document.getElementById('objTotalPct');
        const bEl = document.getElementById('objTotalBar');
        if (tEl) tEl.innerText = `R$ ${totalTarget.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
        if (sEl) sEl.innerText = `R$ ${totalSaved.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
        if (pEl) pEl.innerText = `${pct.toFixed(0)}%`;
        if (bEl) bEl.style.width = `${pct}%`;

        if (objectives.length === 0) {
            list.innerHTML = '<div class="md:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/50 p-10 text-center text-slate-400 text-sm">Você ainda não definiu nenhum sonho.</div>';
            return;
        }

        objectives.forEach(obj => {
            const target = parseFloat(obj.target_amount);
            const current = parseFloat(obj.current_amount);
            const pct = target > 0 ? (current / target) * 100 : 0;
            const isCompleted = current >= target;

            const div = document.createElement('div');
            div.className = "bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm p-5 relative group";
            
            div.innerHTML = `
                <div class="flex items-start justify-between mb-4">
                    <div class="flex items-center gap-2.5 min-w-0">
                        <div class="w-9 h-9 rounded-xl ${isCompleted ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'bg-indigo-50 dark:bg-indigo-900/30'} flex items-center justify-center flex-shrink-0">
                            <i class="${isCompleted ? 'fas fa-check text-emerald-500' : 'fas fa-star text-indigo-500'} text-xs"></i>
                        </div>
                        <div class="min-w-0">
                            <h3 class="font-bold text-slate-800 dark:text-slate-100 text-base leading-tight truncate">${escapeHTML(obj.title)}</h3>
                            <p class="text-[11px] text-slate-400 font-medium mt-0.5">Meta <span class="blur-target font-bold text-slate-500 dark:text-slate-400">R$ ${target.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></p>
                        </div>
                    </div>
                    <button onclick="window.removeObjective(${obj.id})" class="btn-danger-ghost opacity-0 group-hover:opacity-100 transition"><i class="fas fa-trash text-xs"></i></button>
                </div>

                <div class="flex items-baseline justify-between mb-2">
                    <p class="text-2xl font-extrabold tracking-tight ${isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'} blur-target leading-none">
                        R$ ${current.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                    </p>
                    <p class="text-xs font-bold ${isCompleted ? 'text-emerald-600' : 'text-slate-500 dark:text-slate-400'}">${pct.toFixed(0)}%</p>
                </div>

                <div class="progress-track mb-4">
                    <div class="progress-fill ${isCompleted ? 'bg-emerald-500' : 'bg-indigo-500'}" style="width: ${Math.min(pct, 100)}%"></div>
                </div>

                <div class="flex gap-2">
                    <button onclick="window.addMoneyObjective(${obj.id})" class="flex-1 btn btn-primary btn-sm"><i class="fas fa-plus text-xs"></i> Guardar</button>
                    <button onclick="window.removeMoneyObjective(${obj.id})" class="flex-1 btn btn-ghost btn-sm"><i class="fas fa-minus text-xs"></i> Resgatar</button>
                </div>
            `;
            list.appendChild(div);
        });
    }
};
