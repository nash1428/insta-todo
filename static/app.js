const API_URL = '/api/todos';

/* ===== State ===== */
const state = {
    todos: [],
    loading: true,
    isModalOpen: false
};

/* ===== DOM refs ===== */
const els = {
    feed: document.getElementById('feed'),
    loader: document.getElementById('loader'),
    modal: document.getElementById('modal'),
    navAdd: document.getElementById('nav-add'),
    closeModal: document.getElementById('close-modal'),
    postBtn: document.getElementById('post-btn'),
    input: document.getElementById('todo-input'),
    themeToggle: document.getElementById('theme-toggle'),
    addStoryBtn: document.getElementById('add-story-btn')
};

/* ===== Theme ===== */
let isDark = true;

function toggleTheme() {
    isDark = !isDark;
    document.body.classList.toggle('light-mode', !isDark);
    els.themeToggle.textContent = isDark ? '🌙' : '☀️';
    localStorage.setItem('instado-theme', isDark ? 'dark' : 'light');
}

const savedTheme = localStorage.getItem('instado-theme');
if (savedTheme === 'light') {
    isDark = false;
    document.body.classList.add('light-mode');
    els.themeToggle.textContent = '☀️';
}
els.themeToggle.addEventListener('click', toggleTheme);

/* ===== Modal ===== */
function openModal() {
    state.isModalOpen = true;
    els.modal.classList.add('active');
    els.modal.setAttribute('aria-hidden', 'false');
    setTimeout(() => els.input.focus(), 300);
}

function closeModalFn() {
    state.isModalOpen = false;
    els.modal.classList.remove('active');
    els.modal.setAttribute('aria-hidden', 'true');
    els.input.value = '';
    setTimeout(() => els.postBtn.disabled = true, 300);
}

els.navAdd.addEventListener('click', openModal);
els.addStoryBtn.addEventListener('click', openModal);
els.closeModal.addEventListener('click', closeModalFn);

els.input.addEventListener('input', () => {
    const hasText = els.input.value.trim().length > 0;
    els.postBtn.disabled = !hasText;
    els.postBtn.style.opacity = hasText ? '1' : '0.4';
});
els.postBtn.disabled = true;
els.postBtn.style.opacity = '0.4';

/* ===== Time formatting ===== */
function timeAgo(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.max(0, Math.floor((now - date) / 1000));
    if (seconds < 60) return 'Just now';
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
}

/* ===== Escape HTML ===== */
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/* ===== Render ===== */
function renderTodos() {
    els.loader.style.display = 'none';

    if (state.todos.length === 0) {
        els.feed.innerHTML = `
            <div class="empty-state">
                No tasks yet.<br>
                Tap <b>+</b> to create your first post!
            </div>
        `;
        return;
    }

    els.feed.innerHTML = '';

    state.todos.forEach((todo, index) => {
        const card = document.createElement('article');
        card.className = 'todo-card';
        card.style.animationDelay = `${index * 0.05}s`;

        const liked = todo.likes > 0;
        const heart = liked ? '❤️' : '🤍';

        card.innerHTML = `
            <div class="card-header">
                <div class="avatar">👤</div>
                <div class="user-info">
                    <span class="username">you</span>
                    <span class="location">${timeAgo(todo.created_at)}</span>
                </div>
                <button class="more-btn" aria-label="More options" onclick="deleteTodo(${todo.id})">⋯</button>
            </div>
            <div class="card-body">
                <p class="todo-text ${todo.completed ? 'completed' : ''}">${escapeHtml(todo.text)}</p>
            </div>
            <div class="card-actions">
                <div class="actions-left">
                    <button class="action-btn ${liked ? 'liked' : ''}" aria-label="Like" onclick="toggleLike(${todo.id})">
                        ${heart}
                    </button>
                    <button class="action-btn" aria-label="Comment">💬</button>
                    <button class="action-btn" aria-label="Share">✈️</button>
                </div>
                <button class="action-btn" aria-label="Save">🔖</button>
            </div>
            <div class="card-likes">${todo.likes} likes</div>
            <div class="card-time">${timeAgo(todo.created_at)}</div>
            <div class="card-done">
                <button class="done-btn ${todo.completed ? 'done' : ''}" onclick="toggleDone(${todo.id})">
                    ${todo.completed ? '✅ Completed' : '⭕ Mark as done'}
                </button>
            </div>
        `;
        els.feed.appendChild(card);
    });
}

/* ===== API calls ===== */
async function loadTodos() {
    try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error(res.statusText);
        state.todos = await res.json();
        state.loading = false;
        renderTodos();
    } catch (err) {
        console.error('Failed to load todos', err);
        els.loader.style.display = 'none';
        els.feed.innerHTML = `
            <div class="empty-state">
                Could not load tasks.<br>Please refresh and try again.
            </div>
        `;
    }
}

async function createTodo() {
    const text = els.input.value.trim();
    if (!text) return;

    els.postBtn.disabled = true;
    els.postBtn.textContent = 'Sharing...';

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        if (!res.ok) throw new Error(res.statusText);
        const todo = await res.json();
        state.todos.unshift(todo);
        renderTodos();
        closeModalFn();
    } catch (err) {
        console.error('Failed to create todo', err);
        alert('Failed to share task. Please try again.');
    } finally {
        els.postBtn.textContent = 'Share';
        els.postBtn.disabled = false;
    }
}

els.postBtn.addEventListener('click', createTodo);
els.input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        createTodo();
    }
});

async function toggleLike(id) {
    const todo = state.todos.find(t => t.id === id);
    if (!todo) return;

    const newLikes = todo.likes + 1;
    todo.likes = newLikes; // optimistic
    renderTodos();

    try {
        const res = await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ likes: newLikes })
        });
        if (!res.ok) throw new Error(res.statusText);
        const updated = await res.json();
        const idx = state.todos.findIndex(t => t.id === id);
        if (idx >= 0) state.todos[idx] = updated;
        renderTodos();
    } catch (err) {
        console.error(err);
        todo.likes -= 1; // rollback
        renderTodos();
    }
}

async function toggleDone(id) {
    const todo = state.todos.find(t => t.id === id);
    if (!todo) return;

    const newState = !todo.completed;
    todo.completed = newState; // optimistic
    renderTodos();

    try {
        const res = await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ completed: newState })
        });
        if (!res.ok) throw new Error(res.statusText);
        const updated = await res.json();
        const idx = state.todos.findIndex(t => t.id === id);
        if (idx >= 0) state.todos[idx] = updated;
        renderTodos();
    } catch (err) {
        console.error(err);
        todo.completed = !newState; // rollback
        renderTodos();
    }
}

async function deleteTodo(id) {
    const todo = state.todos.find(t => t.id === id);
    if (!todo) return;

    const ok = confirm('Delete this task?');
    if (!ok) return;

    state.todos = state.todos.filter(t => t.id !== id);
    renderTodos();

    try {
        const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error(res.statusText);
    } catch (err) {
        console.error(err);
        state.todos.unshift(todo); // rollback roughly
        renderTodos();
    }
}

/* ===== Swipe gesture for modal ===== */
let touchStartY = 0;
els.modal.addEventListener('touchstart', e => {
    touchStartY = e.changedTouches[0].screenY;
});
els.modal.addEventListener('touchend', e => {
    const touchEndY = e.changedTouches[0].screenY;
    if (touchEndY - touchStartY > 100) {
        closeModalFn();
    }
});

/* ===== Init ===== */
loadTodos();
