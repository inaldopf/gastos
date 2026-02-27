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
        if (!form) return;
        
        if (form.dataset.listenerAttached === 'true') return;
        form.dataset.listenerAttached = 'true';

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('objTitle').value;
            const target = parseFloat(document.getElementById('objTarget').value);
            
            if (!title || isNaN(target) || target <= 0) return alert("Preencha corretamente.");

            const btn = form.querySelector('button');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; 
            btn.disabled = true;

            try {
                await store.addObjective(title, target);
                form.reset();
                this.renderList();
            } catch (err) { 
                console.error(err); 
            } finally { 
                btn.innerHTML = originalText; 
                btn.disabled = false; 
            }
        });
    },

    renderList() {
        const list = document.getElementById('objectivesList');
        if (!list) return;
        list.innerHTML = '';

        const objectives = store.objectives || [];

        if (objectives.length === 0) {
            list.innerHTML = '<p class="text-slate-400 dark:text-slate-500 text-center py-10 text-sm">Nenhum sonho cadastrado ainda. Qual o seu próximo alvo?</p>';
            return;
        }

        objectives.forEach(obj => {
            const current = parseFloat(obj.current_amount) || 0;
            const target = parseFloat(obj.target_amount) || 0;
            const remaining = target - current;
            const percent = target > 0 ? (current / target) * 100 : 0;
            const visualPercent = Math.min(Math.max(percent, 0), 100); // Trava entre 0 e 100%

            const card = document.createElement('div');
            card.className = "glass p-5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm mb-4 relative";
            
            card.innerHTML = `
                <button onclick="window.removeObjective(${obj.id})" class="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition"><i class="fas fa-trash"></i></button>
                
                <div class="flex justify-between items-end mb-2 pr-6">
                    <div>
                        <h3 class="font-bold text-slate-800 dark:text-slate-200 text-lg">${obj.title}</h3>
                        <p class="text-xs font-semibold mt-1 ${remaining > 0 ? 'text-slate-500' : 'text-emerald-500'}">
                            ${remaining > 0 ? `Faltam R$ ${remaining.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : 'Meta Alcançada! 🎉'}
                        </p>
                    </div>
                    <div class="text-right">
                        <span class="text-xs text-slate-400 font-bold uppercase">Guardado</span>
                        <h2 class="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                            R$ ${current.toLocaleString('pt-BR', {minimumFractionDigits: 2})} 
                            <span class="text-sm text-slate-400 dark:text-slate-500 block sm:inline"> / R$ ${target.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                        </h2>
                    </div>
                </div>
                
                <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 overflow-hidden mt-4 relative border border-slate-300 dark:border-slate-600">
                    <div class="${percent >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'} h-4 rounded-full transition-all duration-1000" style="width: ${visualPercent}%"></div>
                    <span class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-800 dark:text-white drop-shadow-md z-10">${percent.toFixed(1)}%</span>
                </div>
                
                <div class="mt-4 flex gap-2">
                    <button onclick="window.addMoneyObjective(${obj.id})" class="flex-1 text-sm font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-300 px-4 py-2 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition border border-indigo-100 dark:border-indigo-800 shadow-sm">
                        <i class="fas fa-plus mr-1"></i> Guardar
                    </button>
                    <button onclick="window.removeMoneyObjective(${obj.id})" class="flex-1 text-sm font-bold text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-300 px-4 py-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition border border-red-100 dark:border-red-800 shadow-sm">
                        <i class="fas fa-minus mr-1"></i> Resgatar
                    </button>
                </div>
            `;
            list.appendChild(card);
        });
    }
};
