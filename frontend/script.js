const API_URL = "http://127.0.0.1:8000/todos";

// Adicionar uma nova tarefa
const newTask = {
    title: document.querySelector('#title'),
    describe: document.querySelector('#describe'),
    button: document.querySelector('#task-btn') 
};

// Seção de edição
const editModal = {
    container: document.querySelector('.modal-edit'), 
    title: document.querySelector('.input-edit-title'), 
    describe: document.querySelector('.input-edit-describe'), 
    closeButton: document.querySelector('#close-modal-btn') 
};

// Listas de tarefas
const taskLists = {
    pending: document.querySelector('.list-pending'), 
    completed: document.querySelector('.list-completed') 
};

// Variável para armazenar o ID da tarefa atualmente em edição (UX/UI)
let currentEditingTodoId = null;




/* Centraliza a lógica de fetch para reuso e tratamento de erros. */

async function fetchApi(url, method, body = null) {
    try {
        const options = {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : undefined
        };

        const response = await fetch(url, options);

        if (!response.ok) {
            // Retorna um erro se o status HTTP não for 2xx
            throw new Error(`Erro de HTTP: ${response.status} ao ${method} em ${url}`);
        }

        if (response.status === 204 && method === 'DELETE') {
             return {};
        }

        return await response.json();

    } catch (error) {
        console.error("Erro na operação de API:", error);
        throw error;
    }
}




/*
* Cria e retorna o elemento <li> para uma tarefa.
* Esta função é a única responsável por gerar o HTML.
*/

function createTodoElement(todo) {
    const isCompleted = todo.completed;
    const completedClass = isCompleted ? 'completed' : '';
    const imgSrc = isCompleted ? 'assets/images/filled.svg' : 'assets/images/not-filled.svg';

    const todoHTML = `
        <li class="todo-item" data-todo-id="${todo.id}">
            <div>
                <img src="${imgSrc}" class="checkbox-toggle" alt="Marcar como concluída">
                <p class="todo-title ${completedClass}">${todo.title}</p>
            </div>
            <p class="todo-describe ${completedClass}">${todo.describe}</p>
        </li>
    `;

    const temp = document.createElement('div');
    temp.innerHTML = todoHTML.trim();

    // Retorna o elemento <li>
    return temp.firstChild; 
}



/* Renderiza uma única tarefa na lista correta (pendente ou concluída). */

function renderTodo(todo) {
    const newLi = createTodoElement(todo);
    const targetList = todo.completed ? taskLists.completed : taskLists.pending;

    // Remove qualquer elemento existente com o mesmo ID antes de adicionar.
    const existingLi = document.querySelector(`.todo-item[data-todo-id="${todo.id}"]`);
    if (existingLi) {
        existingLi.remove();
    }
    
    // Adiciona o novo elemento no topo da lista.
    targetList.prepend(newLi);
}




/* Trata o evento de clique no checkbox para alternar o status 'completed' da tarefa. */

async function handleToggleCompleted(event, liElement, todoId) {
    // Para evitar que o clique no checkbox acione o clique no <li> para edição.
    event.stopPropagation();

    const isCurrentlyCompleted = liElement.closest('.list-completed') !== null;
    const newCompletedStatus = !isCurrentlyCompleted;

    // Obtém os dados atuais da tarefa para a requisição PUT.
    const titleElement = liElement.querySelector('.todo-title');
    const describeElement = liElement.querySelector('.todo-describe');
    const newTodoData = {
        title: titleElement.textContent,
        describe: describeElement.textContent,
        completed: newCompletedStatus
    };

    try {
        // 1. Atualiza no backend
        const updatedTodo = await fetchApi(`${API_URL}/${todoId}`, 'PUT', newTodoData);
        
        // 2. Remove o elemento do DOM
        liElement.remove();

        // 3. Renderiza a tarefa na lista correta com os dados atualizados
        renderTodo(updatedTodo);
        
        console.log(`Tarefa ${updatedTodo.id} movida para ${updatedTodo.completed ? 'Concluídas' : 'Pendentes'}.`);
        
    } catch (error) {
        // Em caso de erro, avise o usuário
        alert("Erro ao atualizar o status da tarefa. Tente novamente.");
        console.error("Falha ao alternar status da tarefa:", error);
    }
}


/* Abre o modal de edição e preenche os campos. */

function openEditModal(liElement, todoId) {
    // 1. Pega os valores atuais
    const title = liElement.querySelector('.todo-title').textContent;
    const describe = liElement.querySelector('.todo-describe').textContent;

    // 2. Preenche o modal e armazena o ID
    editModal.title.value = title;
    editModal.describe.value = describe;
    currentEditingTodoId = todoId;

    // 3. Exibe o modal
    editModal.container.classList.add('active');
}

/* Fecha o modal de edição. */

function closeEditModal() {
    editModal.container.classList.remove('active');
    currentEditingTodoId = null; // Limpa o ID da tarefa em edição
}




/* Carrega todas as tarefas do backend e as renderiza. */

async function loadTasks() {
    // Limpa as listas antes de recarregar (opcional, mas bom para evitar duplicatas em reloads)
    taskLists.pending.innerHTML = '';
    taskLists.completed.innerHTML = '';

    try {
        const tasks = await fetchApi(API_URL, 'GET');
        
        tasks.forEach(renderTodo);
    
    } catch (error) {
        alert("Não foi possível carregar as tarefas. Verifique a conexão com o backend.");
    }
}

/* Adiciona uma nova tarefa através da interface de input. */

newTask.button.addEventListener('click', async (event) => {
    event.preventDefault(); 
    
    const title = newTask.title.value.trim();
    const describe = newTask.describe.value.trim();

    if (!title) {
        alert("O título da tarefa não pode estar vazio.");
        return;
    }

    const newTodoData = { title, describe, completed: false };

    try {
        // 1. Salva no backend
        const createdTodo = await fetchApi(API_URL + '/', 'POST', newTodoData);
        
        // 2. Renderiza no DOM (sem reload de página)
        renderTodo(createdTodo);
        console.log("Tarefa salva no Back-end:", createdTodo);
        
        // 3. Limpa os campos
        newTask.title.value = '';
        newTask.describe.value = '';
        newTask.title.focus();

    } catch (error) {
        alert("Erro ao criar a nova tarefa.");
        console.error("Falha ao salvar nova tarefa:", error);
    }
});


/* Delegação de Eventos para as Listas de Tarefas. */

[taskLists.pending, taskLists.completed].forEach(list => {
    list.addEventListener('click', (event) => {
        // Encontra o <li> mais próximo do clique
        const liElement = event.target.closest('.todo-item');
        if (!liElement) return;

        const todoId = liElement.dataset.todoId;

        // 1. Clique no Checkbox (imagem)
        if (event.target.classList.contains('checkbox-toggle')) {
            handleToggleCompleted(event, liElement, todoId);
        }
        // 2. Clique no <li> (para abrir edição)
        else {
            openEditModal(liElement, todoId);
        }
    });
});

// Listener para fechar o modal de edição
editModal.closeButton.addEventListener('click', closeEditModal);




/* Inicialização */
document.addEventListener('DOMContentLoaded', loadTasks);