if (window.Telegram && window.Telegram.WebApp) {
  const user = window.Telegram.WebApp.initDataUnsafe.user;
  if (user) {
    if (user.photo_url) {
      document.getElementById('avatar').innerHTML = `<img src="${user.photo_url}" alt="avatar">`;
    }
    if (user.first_name) {
      document.querySelector('.username').textContent = user.first_name;
    }
  }
}

const screenStacks = {
  home: ['main'],
  words: ['main'],
  grammar: ['main'],
  settings: ['main']
};

async function loadList(listId) {
  const container = document.getElementById('subscreen-list');
  container.textContent = 'Загрузка...';

  try {
    const response = await fetch(`api/${listId}`);
    if (!responde.ok) throw new Error('Server error');

    const data = await response.json();

    if (!data || data.length === 0) {
      throw new Error('empty list')
    }

    renderList(container, data);
  } catch (error) {
    console.error('loading error:', error)
  }
}

function renderList(container, list) {
  container.innerHTML = '';

  words.forEach(list => {
    const card = document.createElement('div');
    card.className = 'theme-card';
    card.innerHTML = `
      <div class="theme-icon home">${list.icon}</div>
      <div class="theme-info">
        <span class="theme-name">${list.name}</span>
        <span class="theme-count">${list.count}</span>
      </div>
      <div class="theme-progress">
        <div class="progress-bar small">
          <div class="progress-fill" style="width: 70%"></div>
        </div>
      </div>`;
    container.appendChild(card);
  })
}

// Переключение вкладок (адаптировано под твой data-tab)
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    const tabId = btn.dataset.tab;
    switchTab(tabId);
  });
});

function switchTab(tabId) {
  // Активный класс на кнопке
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');

  // Показываем нужную панель
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + tabId).classList.add('active');

  // Показываем последний экран в стеке этой вкладки
  const stack = screenStacks[tabId];
  const currentScreenId = stack[stack.length - 1];
  showScreen(tabId, currentScreenId);
}

// Открыть новый экран внутри вкладки
function openScreen(tabId, screenId, listName = null) {
  if (screenId === 'subscreen') {
    loadList(listName);
  }
  const stack = screenStacks[tabId];
  stack.push(screenId); // добавили в стек
  showScreen(tabId, screenId);
}

// Закрыть верхний экран (вернуться назад)
function closeScreen(tabId) {
  const stack = screenStacks[tabId];
  if (stack.length <= 1) return; // не уходим дальше главного экрана
  stack.pop(); // убрали верхний
  const previousScreenId = stack[stack.length - 1];
  showScreen(tabId, previousScreenId);
}

// Вспомогательная: показать конкретный screen внутри панели
function showScreen(tabId, screenId) {
  const panel = document.getElementById('panel-' + tabId);
  // скрываем все screen внутри этой панели
  panel.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  // показываем нужный
  const screen = document.getElementById('screen-' + tabId + '-' + screenId);
  if (screen) screen.classList.add('active');
}