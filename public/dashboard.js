// public/dashboard.js
// API base URL
const API_BASE = '/api';

// Check authentication
async function checkAuth() {
    try {
        const response = await fetch(`${API_BASE}/auth/me`);
        if (!response.ok) {
            window.location.href = 'login.html';
            return null;
        }
        const user = await response.json();
        return user;
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = 'login.html';
        return null;
    }
}

// Load user data and tasks
async function loadDashboard() {
    const user = await checkAuth();
    if (!user) return;
    
    // Display user info
    document.getElementById('userName').textContent = user.username;
    document.getElementById('userEmail').textContent = user.email;
    
    // Store user data globally
    window.currentUser = user;
    
    // Load tasks
    await loadTasks();
    
    // Initialize navigation
    initNavigation();
}

// Load tasks
async function loadTasks() {
    try {
        const response = await fetch(`${API_BASE}/tasks`);
        const tasks = await response.json();
        
        updateStats(tasks);
        displayTasks(tasks);
        
        // Store tasks for filtering
        localStorage.setItem('currentTasks', JSON.stringify(tasks));
    } catch (error) {
        console.error('Error loading tasks:', error);
        showNotification('Failed to load tasks', 'error');
    }
}

// Update statistics
function updateStats(tasks) {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;
    const highPriority = tasks.filter(t => t.priority === 'high' && !t.completed).length;
    
    document.getElementById('totalTasks').textContent = total;
    document.getElementById('completedTasks').textContent = completed;
    document.getElementById('pendingTasks').textContent = pending;
    document.getElementById('highPriority').textContent = highPriority;
}

// Display tasks in table
function displayTasks(tasks) {
    const tbody = document.getElementById('tasksTableBody');
    const emptyState = document.getElementById('emptyState');
    const tableContainer = document.querySelector('.table-container');
    
    if (!tasks || tasks.length === 0) {
        if (tbody) tbody.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        if (tableContainer) tableContainer.style.display = 'none';
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    if (tableContainer) tableContainer.style.display = 'block';
    
    if (!tbody) return;
    
    tbody.innerHTML = tasks.map(task => {
        const priorityClass = `priority-${task.priority || 'medium'}`;
        const categoryClass = `category-${task.category || 'general'}`;
        
        return `
            <tr data-task-id="${task.id}">
                <td>
                    <input type="checkbox" class="status-checkbox" 
                           ${task.completed ? 'checked' : ''} 
                           onchange="toggleTaskStatus('${task.id}', this.checked)">
                </td>
                <td>${escapeHtml(task.title)}</td>
                <td>${escapeHtml(task.description || '-')}</td>
                <td>
                    <span class="category-badge ${categoryClass}">
                        ${task.category || 'General'}
                    </span>
                </td>
                <td>
                    <span class="priority-badge ${priorityClass}">
                        ${task.priority || 'medium'}
                    </span>
                </td>
                <td>${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}</td>
                <td>${new Date(task.createdAt).toLocaleDateString()}</td>
                <td>
                    <button class="action-btn btn-edit" onclick="editTask('${task.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn btn-delete" onclick="deleteTask('${task.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Toggle task status
async function toggleTaskStatus(taskId, completed) {
    try {
        const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ completed })
        });
        
        if (!response.ok) throw new Error('Failed to update task');
        
        await loadTasks();
        showNotification('Task updated successfully', 'success');
    } catch (error) {
        console.error('Error updating task:', error);
        showNotification('Failed to update task', 'error');
    }
}

// Delete task
async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete task');
        
        await loadTasks();
        showNotification('Task deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting task:', error);
        showNotification('Failed to delete task', 'error');
    }
}

// Edit task - FIXED VERSION
async function editTask(taskId) {
    try {
        // Fetch task details
        const response = await fetch(`${API_BASE}/tasks/${taskId}`);
        if (!response.ok) throw new Error('Task not found');
        
        const task = await response.json();
        
        // Get modal elements
        const modal = document.getElementById('taskModal');
        const titleInput = document.getElementById('taskTitle');
        const descInput = document.getElementById('taskDescription');
        const prioritySelect = document.getElementById('taskPriority');
        const categorySelect = document.getElementById('taskCategory');
        const dueDateInput = document.getElementById('taskDueDate');
        const modalTitle = document.querySelector('#taskModal .modal-header h2');
        const submitBtn = document.querySelector('#taskModal .btn-primary');
        
        // Populate modal with task data
        titleInput.value = task.title || '';
        descInput.value = task.description || '';
        prioritySelect.value = task.priority || 'medium';
        categorySelect.value = task.category || 'general';
        
        // Format date for input field (YYYY-MM-DD)
        if (task.dueDate) {
            const date = new Date(task.dueDate);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            dueDateInput.value = `${year}-${month}-${day}`;
        } else {
            dueDateInput.value = '';
        }
        
        // Change modal title and button
        modalTitle.textContent = 'Edit Task';
        submitBtn.textContent = 'Update Task';
        
        // Store task ID for update
        document.getElementById('taskForm').dataset.taskId = taskId;
        
        // Open modal
        modal.classList.add('show');
        modal.style.display = 'flex';
        
    } catch (error) {
        console.error('Error fetching task:', error);
        showNotification('Failed to load task details', 'error');
    }
}

// Add or Update task - FIXED VERSION
document.getElementById('taskForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const taskId = e.target.dataset.taskId;
    const submitBtn = document.querySelector('#taskModal .btn-primary');
    const originalText = submitBtn.textContent;
    
    const taskData = {
        title: document.getElementById('taskTitle').value,
        description: document.getElementById('taskDescription').value,
        priority: document.getElementById('taskPriority').value,
        category: document.getElementById('taskCategory').value,
        dueDate: document.getElementById('taskDueDate').value || null
    };
    
    // Validate
    if (!taskData.title.trim()) {
        showNotification('Task title is required', 'error');
        return;
    }
    
    // Disable button
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    
    try {
        let response;
        if (taskId) {
            // Update existing task
            response = await fetch(`${API_BASE}/tasks/${taskId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(taskData)
            });
        } else {
            // Create new task
            response = await fetch(`${API_BASE}/tasks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(taskData)
            });
        }
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to save task');
        }
        
        // Close modal and reset form
        closeModal();
        resetTaskForm();
        
        // Reload tasks
        await loadTasks();
        showNotification(taskId ? 'Task updated successfully' : 'Task created successfully', 'success');
    } catch (error) {
        console.error('Error saving task:', error);
        showNotification(error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
});

// Reset task form
function resetTaskForm() {
    document.getElementById('taskForm').reset();
    document.getElementById('taskForm').dataset.taskId = '';
    document.querySelector('#taskModal .modal-header h2').textContent = 'Add New Task';
    document.querySelector('#taskModal .btn-primary').textContent = 'Add Task';
}

// Modal functions - FIXED
function openAddTaskModal() {
    const modal = document.getElementById('taskModal');
    resetTaskForm();
    modal.classList.add('show');
    modal.style.display = 'flex';
}

function closeModal() {
    const modal = document.getElementById('taskModal');
    modal.classList.remove('show');
    modal.style.display = 'none';
    resetTaskForm();
}

// ==================== NAVIGATION FUNCTIONALITY ====================
function initNavigation() {
    const navLinks = document.querySelectorAll('.sidebar-nav a');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Update active state
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            const pageName = this.querySelector('span').textContent.toLowerCase();
            
            // Handle different pages
            switch(pageName) {
                case 'dashboard':
                    showDashboard();
                    break;
                case 'all tasks':
                    showAllTasks();
                    break;
                case 'calendar':
                    showCalendar();
                    break;
                case 'analytics':
                    showAnalytics();
                    break;
                case 'settings':
                    showSettings();
                    break;
            }
        });
    });
}

// Show Dashboard
function showDashboard() {
    const mainContent = document.querySelector('.main-content');
    
    mainContent.innerHTML = `
        <header class="dashboard-header">
            <h1>My Tasks</h1>
            <div class="header-actions">
                <button class="btn-primary" onclick="openAddTaskModal()">
                    <i class="fas fa-plus"></i>
                    Add New Task
                </button>
            </div>
        </header>
        
        <!-- Stats Cards -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon blue">
                    <i class="fas fa-tasks"></i>
                </div>
                <div class="stat-details">
                    <h3 id="totalTasks">0</h3>
                    <p>Total Tasks</p>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon green">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="stat-details">
                    <h3 id="completedTasks">0</h3>
                    <p>Completed</p>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon orange">
                    <i class="fas fa-clock"></i>
                </div>
                <div class="stat-details">
                    <h3 id="pendingTasks">0</h3>
                    <p>Pending</p>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon purple">
                    <i class="fas fa-flag"></i>
                </div>
                <div class="stat-details">
                    <h3 id="highPriority">0</h3>
                    <p>High Priority</p>
                </div>
            </div>
        </div>
        
        <!-- Filters -->
        <div class="filters-bar">
            <div class="search-box">
                <i class="fas fa-search"></i>
                <input type="text" id="searchTask" placeholder="Search tasks...">
            </div>
            
            <div class="filter-options">
                <select id="filterPriority">
                    <option value="all">All Priorities</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                </select>
                
                <select id="filterCategory">
                    <option value="all">All Categories</option>
                    <option value="work">Work</option>
                    <option value="personal">Personal</option>
                    <option value="shopping">Shopping</option>
                    <option value="general">General</option>
                </select>
                
                <select id="filterStatus">
                    <option value="all">All Status</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                </select>
            </div>
        </div>
        
        <!-- Tasks Table -->
        <div class="table-container">
            <table class="tasks-table">
                <thead>
                    <tr>
                        <th>Status</th>
                        <th>Task Title</th>
                        <th>Description</th>
                        <th>Category</th>
                        <th>Priority</th>
                        <th>Due Date</th>
                        <th>Created</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="tasksTableBody">
                    <!-- Tasks will be dynamically inserted here -->
                </tbody>
            </table>
        </div>
        
        <!-- Empty State -->
        <div id="emptyState" class="empty-state" style="display: none;">
            <i class="fas fa-clipboard-list"></i>
            <h3>No tasks yet</h3>
            <p>Get started by adding your first task</p>
            <button class="btn-primary" onclick="openAddTaskModal()">
                <i class="fas fa-plus"></i>
                Add Task
            </button>
        </div>
    `;
    
    // Reattach event listeners
    reattachDashboardListeners();
    
    // Load tasks
    loadTasks();
}

// Reattach dashboard listeners
function reattachDashboardListeners() {
    // Search
    document.getElementById('searchTask')?.addEventListener('input', debounce(async (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const tasks = JSON.parse(localStorage.getItem('currentTasks') || '[]');
        const filtered = tasks.filter(task => 
            task.title.toLowerCase().includes(searchTerm) ||
            (task.description && task.description.toLowerCase().includes(searchTerm))
        );
        displayTasks(filtered);
    }, 300));
    
    // Filters
    document.getElementById('filterPriority')?.addEventListener('change', filterTasks);
    document.getElementById('filterCategory')?.addEventListener('change', filterTasks);
    document.getElementById('filterStatus')?.addEventListener('change', filterTasks);
}

// Filter tasks
async function filterTasks() {
    const priority = document.getElementById('filterPriority')?.value;
    const category = document.getElementById('filterCategory')?.value;
    const status = document.getElementById('filterStatus')?.value;
    
    const tasks = JSON.parse(localStorage.getItem('currentTasks') || '[]');
    
    const filtered = tasks.filter(task => {
        if (priority && priority !== 'all' && task.priority !== priority) return false;
        if (category && category !== 'all' && task.category !== category) return false;
        if (status === 'completed' && !task.completed) return false;
        if (status === 'pending' && task.completed) return false;
        return true;
    });
    
    displayTasks(filtered);
}

// Fetch tasks
async function fetchTasks() {
    const response = await fetch(`${API_BASE}/tasks`);
    const tasks = await response.json();
    localStorage.setItem('currentTasks', JSON.stringify(tasks));
    return tasks;
}

// Show All Tasks page
function showAllTasks() {
    const mainContent = document.querySelector('.main-content');
    
    mainContent.innerHTML = `
        <header class="dashboard-header">
            <h1>All Tasks</h1>
            <div class="header-actions">
                <button class="btn-primary" onclick="openAddTaskModal()">
                    <i class="fas fa-plus"></i>
                    New Task
                </button>
            </div>
        </header>
        
        <div class="tasks-grid">
            <div class="task-categories">
                <h3>Categories</h3>
                <ul class="category-list" id="categoryList">
                    <li class="active" data-category="all">All Tasks <span id="totalTasksCount">0</span></li>
                    <li data-category="work">Work <span id="workTasksCount">0</span></li>
                    <li data-category="personal">Personal <span id="personalTasksCount">0</span></li>
                    <li data-category="shopping">Shopping <span id="shoppingTasksCount">0</span></li>
                    <li data-category="general">General <span id="generalTasksCount">0</span></li>
                </ul>
            </div>
            
            <div class="tasks-list" id="allTasksList">
                <div class="loading-spinner">Loading tasks...</div>
            </div>
        </div>
    `;
    
    loadAllTasksView();
}

// Load all tasks view
async function loadAllTasksView() {
    try {
        const tasks = await fetchTasks();
        
        // Update category counts
        updateCategoryCounts(tasks);
        
        // Display tasks
        displayTasksList(tasks);
        
        // Category filter
        document.querySelectorAll('.category-list li').forEach(item => {
            item.addEventListener('click', function() {
                document.querySelectorAll('.category-list li').forEach(li => li.classList.remove('active'));
                this.classList.add('active');
                const category = this.dataset.category;
                filterTasksByCategory(category);
            });
        });
        
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
}

// Update category counts
function updateCategoryCounts(tasks) {
    const total = tasks.length;
    const work = tasks.filter(t => t.category === 'work').length;
    const personal = tasks.filter(t => t.category === 'personal').length;
    const shopping = tasks.filter(t => t.category === 'shopping').length;
    const general = tasks.filter(t => t.category === 'general' || !t.category).length;
    
    document.getElementById('totalTasksCount').textContent = total;
    document.getElementById('workTasksCount').textContent = work;
    document.getElementById('personalTasksCount').textContent = personal;
    document.getElementById('shoppingTasksCount').textContent = shopping;
    document.getElementById('generalTasksCount').textContent = general;
}

// Display tasks in list
function displayTasksList(tasks) {
    const container = document.getElementById('allTasksList');
    
    if (!tasks || tasks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-list"></i>
                <h3>No tasks yet</h3>
                <p>Get started by adding your first task</p>
                <button class="btn-primary" onclick="openAddTaskModal()">
                    <i class="fas fa-plus"></i>
                    Add Task
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = tasks.map(task => {
        const priorityClass = `priority-${task.priority || 'medium'}`;
        const categoryClass = `category-${task.category || 'general'}`;
        
        return `
            <div class="task-item-card" data-task-id="${task.id}">
                <div class="task-check">
                    <input type="checkbox" ${task.completed ? 'checked' : ''} 
                           onchange="toggleTaskStatus('${task.id}', this.checked)">
                </div>
                <div class="task-info">
                    <h4>${escapeHtml(task.title)}</h4>
                    <p>${task.description ? escapeHtml(task.description) : 'No description'}</p>
                    <div class="task-meta">
                        <span class="category-badge ${categoryClass}">
                            ${task.category || 'General'}
                        </span>
                        <span class="priority-badge ${priorityClass}">
                            ${task.priority || 'medium'}
                        </span>
                        ${task.dueDate ? `<span><i class="far fa-calendar"></i> ${new Date(task.dueDate).toLocaleDateString()}</span>` : ''}
                    </div>
                </div>
                <div class="task-actions">
                    <button class="action-btn btn-edit" onclick="editTask('${task.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn btn-delete" onclick="deleteTask('${task.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Filter tasks by category
function filterTasksByCategory(category) {
    const tasks = JSON.parse(localStorage.getItem('currentTasks') || '[]');
    if (category === 'all') {
        displayTasksList(tasks);
    } else {
        const filtered = tasks.filter(t => t.category === category);
        displayTasksList(filtered);
    }
}

// Show Calendar
function showCalendar() {
    const mainContent = document.querySelector('.main-content');
    const currentDate = new Date();
    const month = currentDate.toLocaleString('default', { month: 'long' });
    const year = currentDate.getFullYear();
    
    mainContent.innerHTML = `
        <header class="dashboard-header">
            <h1>Calendar</h1>
            <div class="header-actions">
                <button class="btn-primary" onclick="openAddTaskModal()">
                    <i class="fas fa-plus"></i>
                    Add Task
                </button>
            </div>
        </header>
        
        <div class="calendar-container">
            <div class="calendar-header">
                <button class="calendar-nav" onclick="changeMonth(-1)"><i class="fas fa-chevron-left"></i></button>
                <h2>${month} ${year}</h2>
                <button class="calendar-nav" onclick="changeMonth(1)"><i class="fas fa-chevron-right"></i></button>
            </div>
            
            <div class="calendar-grid" id="calendarGrid">
                <!-- Calendar will be generated here -->
            </div>
        </div>
    `;
    
    generateCalendar(currentDate);
}

// Generate calendar
async function generateCalendar(date) {
    const tasks = await fetchTasks();
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const startDay = firstDay.getDay();
    const totalDays = lastDay.getDate();
    
    let calendarHTML = '';
    
    // Add weekday headers
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    weekdays.forEach(day => {
        calendarHTML += `<div class="weekday">${day}</div>`;
    });
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startDay; i++) {
        calendarHTML += '<div class="calendar-day other-month"></div>';
    }
    
    // Add days of the month
    for (let day = 1; day <= totalDays; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const hasTask = tasks.some(task => task.dueDate === dateStr);
        
        const isToday = 
            day === new Date().getDate() && 
            month === new Date().getMonth() && 
            year === new Date().getFullYear();
        
        calendarHTML += `
            <div class="calendar-day ${hasTask ? 'has-task' : ''} ${isToday ? 'today' : ''}" 
                 data-date="${dateStr}"
                 onclick="showTasksForDate('${dateStr}')">
                ${day}
                ${hasTask ? '<span class="task-indicator"></span>' : ''}
            </div>
        `;
    }
    
    document.getElementById('calendarGrid').innerHTML = calendarHTML;
}

// Change month
window.changeMonth = function(delta) {
    const headerDate = document.querySelector('.calendar-header h2').textContent;
    const [month, year] = headerDate.split(' ');
    const monthIndex = new Date(Date.parse(month + " 1, " + year)).getMonth();
    const currentDate = new Date(year, monthIndex + delta, 1);
    
    // Update header
    const newMonth = currentDate.toLocaleString('default', { month: 'long' });
    const newYear = currentDate.getFullYear();
    document.querySelector('.calendar-header h2').textContent = `${newMonth} ${newYear}`;
    
    generateCalendar(currentDate);
};

// Show tasks for date
window.showTasksForDate = async function(date) {
    const tasks = await fetchTasks();
    const dayTasks = tasks.filter(task => task.dueDate === date);
    
    if (dayTasks.length === 0) {
        showNotification('No tasks for this date', 'info');
        return;
    }
    
    const taskList = dayTasks.map(t => `• ${t.title} (${t.priority})`).join('\n');
    showNotification(`Tasks for ${date}:\n${taskList}`, 'info');
};

// Show Analytics
function showAnalytics() {
    const mainContent = document.querySelector('.main-content');
    
    mainContent.innerHTML = `
        <header class="dashboard-header">
            <h1>Analytics</h1>
            <div class="header-actions">
                <select class="analytics-period" id="analyticsPeriod" onchange="updateAnalytics()">
                    <option value="week">This Week</option>
                    <option value="month" selected>This Month</option>
                    <option value="year">This Year</option>
                </select>
            </div>
        </header>
        
        <div class="analytics-grid" id="analyticsGrid">
            <!-- Analytics will be loaded here -->
        </div>
    `;
    
    updateAnalytics();
}

// Update analytics
async function updateAnalytics() {
    const tasks = await fetchTasks();
    
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // Priority breakdown
    const highPriority = tasks.filter(t => t.priority === 'high').length;
    const mediumPriority = tasks.filter(t => t.priority === 'medium').length;
    const lowPriority = tasks.filter(t => t.priority === 'low').length;
    
    // Category breakdown
    const categories = {};
    tasks.forEach(task => {
        const cat = task.category || 'general';
        categories[cat] = (categories[cat] || 0) + 1;
    });
    
    const analyticsGrid = document.getElementById('analyticsGrid');
    if (!analyticsGrid) return;
    
    analyticsGrid.innerHTML = `
        <div class="chart-card">
            <h3>Task Completion Rate</h3>
            <div class="chart-container">
                <div class="progress-circle" style="background: conic-gradient(#667eea ${completionRate * 3.6}deg, #2d3748 0deg)">
                    <span>${completionRate}%</span>
                </div>
                <p>${completed} of ${total} tasks completed</p>
            </div>
        </div>
        
        <div class="chart-card">
            <h3>Productivity Score</h3>
            <div class="chart-container">
                <div class="stat-large">${completionRate}<span>/100</span></div>
                <p>${completionRate > 70 ? 'Excellent' : completionRate > 40 ? 'Good' : 'Needs improvement'}</p>
            </div>
        </div>
        
        <div class="chart-card full-width">
            <h3>Tasks by Priority</h3>
            <div class="priority-chart">
                <div class="chart-bar">
                    <span>High</span>
                    <div class="bar priority-high" style="width: ${total > 0 ? (highPriority/total)*100 : 0}%">
                        ${highPriority} (${total > 0 ? Math.round((highPriority/total)*100) : 0}%)
                    </div>
                </div>
                <div class="chart-bar">
                    <span>Medium</span>
                    <div class="bar priority-medium" style="width: ${total > 0 ? (mediumPriority/total)*100 : 0}%">
                        ${mediumPriority} (${total > 0 ? Math.round((mediumPriority/total)*100) : 0}%)
                    </div>
                </div>
                <div class="chart-bar">
                    <span>Low</span>
                    <div class="bar priority-low" style="width: ${total > 0 ? (lowPriority/total)*100 : 0}%">
                        ${lowPriority} (${total > 0 ? Math.round((lowPriority/total)*100) : 0}%)
                    </div>
                </div>
            </div>
        </div>
        
        <div class="chart-card full-width">
            <h3>Tasks by Category</h3>
            <div class="category-chart">
                ${Object.entries(categories).map(([category, count]) => {
                    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                    return `
                        <div class="chart-bar">
                            <span>${category.charAt(0).toUpperCase() + category.slice(1)}</span>
                            <div class="bar category-${category}" style="width: ${percentage}%">
                                ${count} (${percentage}%)
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

// Show Settings - FIXED with profile update
function showSettings() {
    const mainContent = document.querySelector('.main-content');
    const user = window.currentUser || {};
    
    mainContent.innerHTML = `
        <header class="dashboard-header">
            <h1>Settings</h1>
        </header>
        
        <div class="settings-container">
            <div class="settings-nav">
                <button class="settings-tab active" data-tab="profile">Profile</button>
                <button class="settings-tab" data-tab="notifications">Notifications</button>
                <button class="settings-tab" data-tab="privacy">Privacy</button>
                <button class="settings-tab" data-tab="appearance">Appearance</button>
            </div>
            
            <div class="settings-panel" id="settingsPanel">
                <!-- Profile Settings -->
                <div class="settings-section" id="profileSection">
                    <h3>Profile Information</h3>
                    <div class="settings-form">
                        <div class="form-group">
                            <label>Username</label>
                            <input type="text" id="settingsUsername" value="${user.username || ''}" placeholder="Your username">
                        </div>
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" id="settingsEmail" value="${user.email || ''}" placeholder="Your email">
                        </div>
                        <div class="form-group">
                            <label>Bio</label>
                            <textarea id="settingsBio" placeholder="Tell us about yourself">${user.bio || 'Productivity enthusiast'}</textarea>
                        </div>
                        <button class="btn-primary" onclick="saveProfileSettings()">Save Changes</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add settings tab listeners
    document.querySelectorAll('.settings-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            const tabName = this.dataset.tab;
            showSettingsTab(tabName);
        });
    });
}

// Show different settings tabs
function showSettingsTab(tabName) {
    const panel = document.getElementById('settingsPanel');
    const user = window.currentUser || {};
    
    switch(tabName) {
        case 'profile':
            panel.innerHTML = `
                <div class="settings-section">
                    <h3>Profile Information</h3>
                    <div class="settings-form">
                        <div class="form-group">
                            <label>Username</label>
                            <input type="text" id="settingsUsername" value="${user.username || ''}" placeholder="Your username">
                        </div>
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" id="settingsEmail" value="${user.email || ''}" placeholder="Your email">
                        </div>
                        <div class="form-group">
                            <label>Bio</label>
                            <textarea id="settingsBio" placeholder="Tell us about yourself">${user.bio || 'Productivity enthusiast'}</textarea>
                        </div>
                        <button class="btn-primary" onclick="saveProfileSettings()">Save Changes</button>
                    </div>
                </div>
            `;
            break;
            
        case 'notifications':
            panel.innerHTML = `
                <div class="settings-section">
                    <h3>Notification Preferences</h3>
                    <div class="settings-form">
                        <label class="checkbox">
                            <input type="checkbox" checked>
                            <span>Email notifications for task reminders</span>
                        </label>
                        <label class="checkbox">
                            <input type="checkbox" checked>
                            <span>Push notifications for due tasks</span>
                        </label>
                        <label class="checkbox">
                            <input type="checkbox">
                            <span>Weekly productivity report</span>
                        </label>
                        <button class="btn-primary" onclick="showNotification('Settings saved', 'success')">Save Preferences</button>
                    </div>
                </div>
            `;
            break;
            
        case 'privacy':
            panel.innerHTML = `
                <div class="settings-section">
                    <h3>Privacy Settings</h3>
                    <div class="settings-form">
                        <label class="checkbox">
                            <input type="checkbox" checked>
                            <span>Make my profile public</span>
                        </label>
                        <label class="checkbox">
                            <input type="checkbox">
                            <span>Show my task statistics</span>
                        </label>
                        <label class="checkbox">
                            <input type="checkbox" checked>
                            <span>Allow analytics collection</span>
                        </label>
                        <button class="btn-primary" onclick="showNotification('Privacy settings saved', 'success')">Save Settings</button>
                    </div>
                </div>
            `;
            break;
            
        case 'appearance':
            panel.innerHTML = `
                <div class="settings-section">
                    <h3>Appearance</h3>
                    <div class="settings-form">
                        <div class="form-group">
                            <label>Theme</label>
                            <select id="themeSelect">
                                <option value="dark" selected>Dark (Default)</option>
                                <option value="light">Light</option>
                                <option value="system">System Default</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Compact Mode</label>
                            <select id="compactSelect">
                                <option value="normal" selected>Normal</option>
                                <option value="compact">Compact</option>
                            </select>
                        </div>
                        <button class="btn-primary" onclick="showNotification('Appearance settings saved', 'success')">Save Settings</button>
                    </div>
                </div>
            `;
            break;
    }
}

// Save profile settings - FIXED to update UI
window.saveProfileSettings = async function() {
    const username = document.getElementById('settingsUsername')?.value;
    const email = document.getElementById('settingsEmail')?.value;
    const bio = document.getElementById('settingsBio')?.value;
    
    if (!username || !email) {
        showNotification('Username and email are required', 'error');
        return;
    }
    
    try {
        // Here you would typically send to backend
        // For now, update local storage and UI
        const user = window.currentUser;
        user.username = username;
        user.email = email;
        user.bio = bio;
        window.currentUser = user;
        localStorage.setItem('user', JSON.stringify(user));
        
        // Update sidebar user info
        document.getElementById('userName').textContent = username;
        document.getElementById('userEmail').textContent = email;
        
        showNotification('Profile updated successfully', 'success');
    } catch (error) {
        console.error('Error saving profile:', error);
        showNotification('Failed to update profile', 'error');
    }
};

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
        await fetch(`${API_BASE}/auth/logout`, { method: 'POST' });
        localStorage.removeItem('user');
        localStorage.removeItem('currentTasks');
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
    }
});

// Escape HTML helper
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Notification function
function showNotification(message, type = 'info') {
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notif => notif.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Add notification styles
if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            display: flex;
            align-items: center;
            gap: 0.75rem;
            z-index: 9999;
            animation: slideInRight 0.3s;
            max-width: 350px;
            border-left: 4px solid;
        }
        
        .notification.success {
            border-left-color: #10b981;
        }
        
        .notification.success i {
            color: #10b981;
        }
        
        .notification.error {
            border-left-color: #ef4444;
        }
        
        .notification.error i {
            color: #ef4444;
        }
        
        .notification.info {
            border-left-color: #3b82f6;
        }
        
        .notification.info i {
            color: #3b82f6;
        }
        
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', loadDashboard);

// Modal close button
document.querySelector('.close-modal')?.addEventListener('click', closeModal);

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    const modal = document.getElementById('taskModal');
    if (e.target === modal) {
        closeModal();
    }
});

// Make functions global
window.toggleTaskStatus = toggleTaskStatus;
window.deleteTask = deleteTask;
window.editTask = editTask;
window.openAddTaskModal = openAddTaskModal;
window.closeModal = closeModal;
window.showNotification = showNotification;