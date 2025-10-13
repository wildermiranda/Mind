const newTitleInput = document.querySelector('#title');
const newDescribeInput = document.querySelector('#describe');
const addNewTask = document.querySelector('#add');
const editTitleInput = document.querySelector('.edit-title');
const editDescribeInput = document.querySelector('.edit-describe');
const closeWindow = document.querySelector('#close')
const todos = document.querySelector('.unorderedlist');
const edit = document.querySelector('.edit');

function formatMonospace(text) {
    if (!text) return '';
    return text.replace(/`([^`]+)`/g, '<code class="monospace">$1</code>');
}

function removeGraves(text) {
    if (!text) return '';
    return text.replace(/`/g, '');
}

function containsGraves(text) {
    if (!text) return false;
    return text.includes('`');
}

function createTodoElement(todo) {
    const isCompleted = todo.completed;
    const completedClass = isCompleted ? 'completed' : '';
    const liVisibleClass = isCompleted ? 'visible' : '';
    const imgSrc = isCompleted ? 'assets/images/filled.svg' : 'assets/images/not-filled.svg';

    const formattedDescribe = formatMonospace(todo.describe);

    const todoHTML = `
        <li class="${liVisibleClass}">
            <div>
                <img src="${imgSrc}" class="checkbox" alt="Marcar como concluída">
                <p class="todo-title ${completedClass}">${todo.title}</p>
            </div>
            <p class="todo-describe ${completedClass}">${formattedDescribe}</p>
        </li>
    `;

    const temp = document.createElement('div');
    temp.innerHTML = todoHTML.trim();
    const li = temp.firstChild; 

    const img = li.querySelector('.checkbox');
    const title = li.querySelector('.todo-title');
    const describe = li.querySelector('.todo-describe');
    const code = li.querySelector('code')

    img.addEventListener('click', (event) => {
        event.stopPropagation();

        li.classList.toggle('visible');
        const isCurrentlyCompleted = li.classList.contains('visible');
        img.src = isCurrentlyCompleted ? 'assets/images/filled.svg' : 'assets/images/not-filled.svg';
        
        code && code.classList.toggle('completed');
        describe.classList.toggle('completed');
        title.classList.toggle('completed');

        fetch(`http://127.0.0.1:8000/todos/${todo.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                title: todo.title, 
                describe: todo.describe, 
                completed: isCurrentlyCompleted 
            })
        })
        .then(response => response.json())
        .then(data => console.log("Tarefa atualizada no backend:", data))
        .catch(err => console.error("Erro ao atualizar no backend:", err));
    });

    li.addEventListener('click', () => {
        edit.classList.add('active');

        editTitleInput.classList.remove('monospace');
        editDescribeInput.classList.remove('monospace');

        editTitleInput.value = removeGraves(todo.title);
        editDescribeInput.value = removeGraves(todo.describe); 

        if (containsGraves(todo.describe)) {
            editDescribeInput.classList.add('monospace');
        }

        closeWindow.addEventListener('click', () => {
            edit.classList.remove('active');
        }, { once: true });
    });

    todos.prepend(li);
}

async function loadTasks() {
    try {
        const response = await fetch("http://127.0.0.1:8000/todos/");
        
        if (!response.ok) {
            throw new Error(`Erro de HTTP: ${response.status}`);
        }
        
        const tasks = await response.json(); 
        tasks.forEach(task => createTodoElement(task)); 
    
    } catch (error) {
        console.error("Erro ao carregar tarefas:", error);
    }
}

addNewTask.addEventListener('click', () => {
    const _title = newTitleInput.value.trim();
    const _describe = newDescribeInput.value.trim();

    if (_title) {
        fetch("http://127.0.0.1:8000/todos/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: _title, describe: _describe , completed: false })
        })
        .then(response => response.json())
        .then(data => {
            console.log("Tarefa salva no Back-end:", data);
            createTodoElement(data);
        })
        .catch(error => console.error("Erro ao salvar no backend:", error));

        newTitleInput.value = '';
        newDescribeInput.value = '';
        newTitleInput.focus();
    }
});

document.addEventListener('DOMContentLoaded', loadTasks);