const API_URL = "http://127.0.0.1:8000/todos/";
const DELAY_MS = 250; 

async function fetchApi(url, method = 'GET', body = null) {
    try {
        const options = { 
            method, 
            headers: { 'Content-Type': 'application/json' } 
        };
        // Adiciona o corpo da requisição se for um método que o requer.
        if (body) options.body = JSON.stringify(body);

        const res = await fetch(url, options);

        if (!res.ok) {
             throw new Error(`HTTP ${res.status} — Falha em ${method} ${url}`);
        }
        
        if (res.status === 204 || method === 'DELETE') return {};
        
        // Converte a resposta para JSON.
        return await res.json();
    } catch (err) {
        console.error("fetchApi erro:", err);
        throw err;
    }
}


function createTodoElement(todo) {
    // Determina a classe CSS e o ícone de checkbox baseado no status 'completed'.
    const completedClass = todo.completed ? 'completed' : '';
    const imgSrc = todo.completed ? '/static/images/filled.svg' : '/static/images/not-filled.svg';

    const li = document.createElement('li');
    li.className = 'todo-item';
    li.dataset.todoId = todo.id; 

    li.innerHTML = `
        <div>
            <div class="wrapper">
                <img src="${imgSrc}" class="checkbox-toggle" alt="Marcar como concluída">
                <p class="todo-title ${completedClass}">${todo.title ?? ''}</p>
            </div>

            <button type="button" id="trash-btn" class="trash-btn" aria-label="Excluir Tarefa">
                Excluir
            </button>
        </div>
        <p class="todo-describe ${completedClass}">${todo.describe ?? ''}</p>
    `.trim();

    return li;
}


function renderTodo(todo, taskLists) {
    if (!todo) return;

    const target = todo.completed ? taskLists.completed : taskLists.pending;
    
    if (!target) return;

    // Remove a versão antiga do item no DOM (necessário ao alternar entre listas).
    const existing = document.querySelector(`.todo-item[data-todo-id="${todo.id}"]`);
    if (existing) existing.remove();

    // Adiciona o novo elemento no topo da lista (método prepend).
    target.prepend(createTodoElement(todo));
}


function customConfirm(message) {
    return new Promise((resolve) => {
        const modal = document.querySelector('#custom-confirm-modal');
        const confirmBtn = document.querySelector('#btn-confirm-delete');
        const cancelBtn = document.querySelector('#btn-cancel');

        // Fallback: Se o HTML do modal não estiver presente, usa o `confirm()` nativo.
        if (!modal || !confirmBtn || !cancelBtn) {
            console.error("Custom Confirm Modal HTML não encontrado. Usando confirm() nativo.");
            resolve(confirm(message));
            return;
        }

        const messageElement = modal.querySelector('.modal-content p');
        if (messageElement) messageElement.textContent = message;

        confirmBtn.onclick = null;
        cancelBtn.onclick = null;

        // Exibe o modal
        modal.classList.add('active');
        
        const closeAndResolve = (result) => {
            modal.classList.remove('active');
            resolve(result);
        };

        confirmBtn.onclick = () => closeAndResolve(true);
        cancelBtn.onclick = () => closeAndResolve(false);
    });
}


async function handleToggleCompleted(event, liElement, todoId, API_URL, taskLists) {
    event.stopPropagation();

    const isCurrentlyCompleted = liElement.closest('.list-completed') !== null;
    const newCompletedStatus = !isCurrentlyCompleted;

    const title = liElement.querySelector('.todo-title')?.textContent ?? '';
    const describe = liElement.querySelector('.todo-describe')?.textContent ?? '';
    const payload = { title, describe, completed: newCompletedStatus };

    const checkbox = liElement.querySelector('.checkbox-toggle');
    const titleElement = liElement.querySelector('.todo-title');
    const describeElement = liElement.querySelector('.todo-describe');

    const applyVisualUpdate = (isCompleted) => {
        const src = isCompleted ? '/static/images/filled.svg' : '/static/images/not-filled.svg';
        const method = isCompleted ? 'add' : 'remove';
        if (checkbox) checkbox.src = src;
        if (titleElement) titleElement.classList[method]('completed');
        if (describeElement) describeElement.classList[method]('completed');
    };
    
    applyVisualUpdate(newCompletedStatus); 

    liElement.classList.add('is-processing'); 
    if (checkbox) checkbox.style.pointerEvents = 'none';

    try {
        const updated = await fetchApi(`${API_URL}${todoId}`, 'PUT', payload);

        setTimeout(() => {
            liElement.classList.remove('is-processing');
            liElement.remove(); 
            renderTodo(updated, taskLists);
        }, DELAY_MS); 

    } catch (err) {
        console.error("Erro toggle:", err);
        alert("Não foi possível atualizar a tarefa.");

        applyVisualUpdate(isCurrentlyCompleted); 
        
        liElement.classList.remove('is-processing');
        if (checkbox) checkbox.style.pointerEvents = 'auto';
    }
}



async function handleDeleteTodo(event, liElement, todoId, API_URL) {
    event.stopPropagation(); // Impede que o clique no botão ative outros listeners do item <li>.

    const shouldDelete = await customConfirm("Você realmente deseja excluir esta tarefa?");

    if (!shouldDelete) {
        return; // Usuário cancelou.
    }

    liElement.classList.add('is-processing'); 
    
    try {
        // 2. Envia a requisição DELETE para a API.
        await fetchApi(`${API_URL}${todoId}`, 'DELETE');

        // 3. Em caso de sucesso: remove o elemento do DOM após o delay.
        setTimeout(() => {
            liElement.remove();
        }, DELAY_MS); 

    } catch (err) {
        console.error("Erro ao excluir tarefa:", err);
        alert("Não foi possível excluir a tarefa.");

        liElement.classList.remove('is-processing');
    }
}


function openEditModal(liElement, editModal) {
    if (!editModal.container) return;
    
    editModal.container.dataset.editingId = liElement.dataset.todoId;

    const title = liElement.querySelector('.todo-title')?.textContent ?? '';
    const describe = liElement.querySelector('.todo-describe')?.textContent ?? '';
    
    if (editModal.title) editModal.title.value = title;
    if (editModal.describe) editModal.describe.value = describe;
    
    // Exibe o modal.
    editModal.container.classList.add('active');
}

function closeEditModal(editModal) {
    if (!editModal.container) return;
    editModal.container.classList.remove('active');
    editModal.container.dataset.editingId = ''; // Limpa a referência ao ID.
}


async function loadTasks(API_URL, taskLists) {
    // Limpa as listas para evitar duplicação em caso de recarregamento.
    if (taskLists.pending) taskLists.pending.innerHTML = '';
    if (taskLists.completed) taskLists.completed.innerHTML = '';

    try {
        const res = await fetchApi(API_URL, 'GET');
        let tasks = Array.isArray(res) ? res : (res.todos || res.data || []);
        
        if (!Array.isArray(tasks)) {
            console.error("Formato inesperado do backend:", res);
            return;
        }
        
        tasks.reverse(); 

        tasks.forEach(t => renderTodo(t, taskLists));
    } catch (err) {
        console.error("Erro ao carregar tasks:", err);
        alert("Não foi possível carregar as tarefas do servidor.");
    }
}


function initApp() {
    const newTask = {
        title: document.querySelector('#title'),
        describe: document.querySelector('#describe'),
        button: document.querySelector('#task-btn')
    };

    const editModal = {
        container: document.querySelector('.modal-edit'),
        title: document.querySelector('.input-edit-title'),
        describe: document.querySelector('.input-edit-describe'),
        closeButton: document.querySelector('#close-modal-btn')
    };

    const taskLists = {
        pending: document.querySelector('.list-pending'),
        completed: document.querySelector('.list-completed')
    };

    if (taskLists.pending || taskLists.completed) {
        loadTasks(API_URL, taskLists);
    }

    if (newTask.button) {
        newTask.button.addEventListener('click', async (ev) => {
            ev.preventDefault();
            const title = newTask.title?.value?.trim() ?? '';
            const describe = newTask.describe?.value?.trim() ?? '';

            if (!title) {
                alert("O título da tarefa é obrigatório.");
                return;
            }

            try {
                const created = await fetchApi(API_URL, 'POST', { title, describe, completed: false });
                renderTodo(created, taskLists);
                
                if (newTask.title) newTask.title.value = '';
                if (newTask.describe) newTask.describe.value = '';
                newTask.title?.focus();
            } catch (err) {
                console.error("Erro ao criar task:", err);
                alert("Não foi possível criar a tarefa.");
            }
        });
    }

    [taskLists.pending, taskLists.completed].filter(Boolean).forEach(list => {
        list.addEventListener('click', (event) => {
            // Encontra o elemento <li> mais próximo (o item da tarefa).
            const li = event.target.closest('.todo-item');
            if (!li) return; 
            
            const todoId = li.dataset.todoId;

            if (event.target.classList.contains('checkbox-toggle')) {
                // Clique no checkbox: Alternar status concluído (PUT).
                handleToggleCompleted(event, li, todoId, API_URL, taskLists);
            } else if (event.target.closest('#trash-btn')) {
                // Clique no botão de lixeira: Excluir tarefa (DELETE).
                handleDeleteTodo(event, li, todoId, API_URL);
            } 
            else {
                // Qualquer outro clique no item <li>, abre o modal de edição.
                openEditModal(li, editModal);
            }
        });
    });

    if (editModal.closeButton) {
        editModal.closeButton.addEventListener('click', () => closeEditModal(editModal));
    }
}

document.addEventListener('DOMContentLoaded', initApp);