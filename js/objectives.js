import { store } from './store.js';

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

        if (objectives.length === 0) {
            list.innerHTML = '<div class="glass p-6 rounded-xl border border-slate-100 dark:border-slate-700 text-center text-slate-400">Você ainda não definiu nenhum sonho.</div>';
            return;
        }

        objectives.forEach(obj => {
            const target = parseFloat(obj.target_amount);
            const current = parseFloat(obj.current_amount);
            const pct = target > 0 ? (current / target) * 100 : 0;
            const isCompleted = current >= target;

            const div = document.createElement('div');
            div.className = "glass p-5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden group";
            
            div.innerHTML = `
                <div class="flex justify-between items-start mb-3 relative z-10">
                    <div>
                        <h3 class="font-bold text-slate-800 dark:text-slate-200 text-lg flex items-center gap-2">
                            ${isCompleted ? '<i class="fas fa-check-circle text-emerald-500"></i>' : '<i class="fas fa-star text-indigo-400"></i>'}
                            ${obj.title}
                        </h3>
                        <p class="text-xs font-bold text-slate-400 uppercase mt-1">
                            Meta: <span class="blur-target">R$ ${target.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                        </p>
                    </div>
                    <div class="text-right">
                        <p class="text-xs font-bold text-slate-400 uppercase">Guardado</p>
                        <p class="text-xl font-bold ${isCompleted ? 'text-emerald-500' : 'text-indigo-600 dark:text-indigo-400'} blur-target">
                            R$ ${current.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </p>
                    </div>
                </div>

                <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mb-4 relative z-10 overflow-hidden">
                    <div class="${isCompleted ? 'bg-emerald-500' : 'bg-indigo-500'} h-2 rounded-full transition-all duration-1000" style="width: ${Math.min(pct, 100)}%"></div>
                </div>

                <div class="flex gap-2 relative z-10">
                    <button onclick="window.addMoneyObjective(${obj.id})" class="flex-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold py-2 rounded-lg text-xs hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition border border-indigo-100 dark:border-indigo-800/50">
                        <i class="fas fa-plus mr-1"></i> Guardar
                    </button>
                    <button onclick="window.removeMoneyObjective(${obj.id})" class="flex-1 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 font-bold py-2 rounded-lg text-xs hover:bg-rose-100 dark:hover:bg-rose-900/40 transition border border-rose-100 dark:border-rose-800/50">
                        <i class="fas fa-minus mr-1"></i> Resgatar
                    </button>
                </div>

                <button onclick="window.removeObjective(${obj.id})" class="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100 z-20">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            list.appendChild(div);
        });
    }
};
