// --- Инициализация Telegram WebApp ---
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

;

// --- Конфигурация ---
const API_BASE_URL = 'https://5f4b-176-113-164-251.ngrok-free.app';

// Стек экранов для каждой вкладки
const screenStacks = {
  home: ['main'],
  words: ['main'],
  grammar: ['main'],
  settings: ['main']
};


// --- Функция загрузки списка (подэкран) ---
async function loadList(listPrefix) {
  const container = document.getElementById('subscreen-list');
  if (!container) return;
  container.textContent = 'Загрузка...';

  try {
    const response = await apiFetch(`${API_BASE_URL}/api/list/${listPrefix}`, {
      headers: {
        'ngrok-skip-browser-warning': 'true'
      }
    });
    if (!response.ok) throw new Error('Server error');
    const data = await response.json();
    if (!data || data.length === 0) throw new Error('empty list');
    renderList(container, data);
  } catch (error) {
    container.textContent = 'Не удалось загрузить';
    console.error('loading error:', error);
    throw error; // пробрасываем для openScreen
  }
}

// --- Отрисовка списка тем (карточек списков) ---
function renderList(container, list) {
  container.innerHTML = '';
  list.forEach(item => {
    const card = document.createElement('div');
    card.className = 'theme-card';
    card.innerHTML = `
      <div class="theme-icon home">${item.icon || '📚'}</div>
      <div class="theme-info">
        <span class="theme-name">${item.name}</span>
        <span class="theme-count">${item.wordCount || 0}</span>
      </div>
      <div class="theme-progress">
        <div class="progress-bar small">
          <div class="progress-fill" style="width: 70%"></div>
        </div>
      </div>`;
    // Клик по карточке списка – открываем экран карточек с этим списком
    card.onclick = () => {
      openScreen('words', 'cards', null, item.name);
    };
    container.appendChild(card);
  });
}

const apiFetch = async (url, options = {}) => {
  const initData = window.Telegram?.WebApp?.initData;
  if (!initData) {
    console.error('Ошибка: initData не доступен');
    throw new Error('Telegram initData not available');
  }

  const headers = {
    ...options.headers,
    'X-Telegram-Init-Data': initData
  };

  // Чтобы избежать дублирования заголовка Content-Type, если он уже был установлен
  if (options.body && !(options.headers && options.headers['Content-Type'])) {
    headers['Content-Type'] = 'application/json';
  }

  return fetch(url, { ...options, headers });
};

apiFetch(`${API_BASE_URL}/api/user/auth`, { method: 'POST' });

// --- Навигация по вкладкам ---
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    const tabId = btn.dataset.tab;
    switchTab(tabId);
  });
});

function switchTab(tabId) {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');

  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + tabId).classList.add('active');

  const stack = screenStacks[tabId];
  const currentScreenId = stack[stack.length - 1];
  showScreen(tabId, currentScreenId);
}

// --- Открыть новый экран внутри вкладки (главный метод) ---
async function openScreen(tabId, screenId, listPrefix = null, listName = null) {
  // 1. Если открывается подэкран со списками слов – загружаем данные
  if (screenId === 'subscreen' && listPrefix) {
    await loadList(listPrefix); // дожидаемся загрузки
  }
  // 2. Если открывается экран карточек – загружаем слова и запускаем игру
  else if (screenId === 'cards' && listName) {
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/word/${listName}`, {
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      });
      if (!response.ok) throw new Error('Server error');
      words = await response.json();
      if (!words || words.length === 0) throw new Error('empty list');
      loadNextCard(); // сброс и инициализация карточек
    } catch (error) {
      console.error('loading error:', error);
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.showAlert('Не удалось загрузить слова');
      }
      return; // не переходим на экран карточек при ошибке
    }
  }

  // 3. Добавляем экран в стек и показываем
  const stack = screenStacks[tabId];
  stack.push(screenId);
  showScreen(tabId, screenId);
}

// --- Закрыть текущий экран (назад) ---
function closeScreen(tabId) {
  const stack = screenStacks[tabId];
  if (stack.length <= 1) return;
  stack.pop();
  const previousScreenId = stack[stack.length - 1];
  showScreen(tabId, previousScreenId);
  index = 0; //временное решение, надо доделать когда реализую функцию экрана итогов сессии
}

// --- Показать конкретный экран внутри панели ---
function showScreen(tabId, screenId) {
  const panel = document.getElementById('panel-' + tabId);
  if (!panel) return;
  panel.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const screen = document.getElementById(`screen-${tabId}-${screenId}`);
  if (screen) screen.classList.add('active');
}

let words = [];
let index = 0;
let currentCard = null;
let animating = false;

const deckDiv = document.getElementById('deck');
const progressDiv = document.getElementById('progress');

function updateProgress() {
  const percent = (index / words.length) * 100;   // index = сколько карточек уже обработано
  const fill = document.getElementById('progressFill');
  const text = document.getElementById('progressText');
  if (fill) fill.style.width = `${percent}%`;
  if (text) text.textContent = `${index} / ${words.length}`;
}

// Создаёт карточку
function createCard(wordObj) {
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `
      <div class="card-inner">
        <div class="face front">
          <div class="word-label">СЛОВО</div>
          <div class="word-text">${escapeHtml(wordObj.en)}</div>
          <div class="hint">нажмите → перевод</div>
        </div>
        <div class="face back">
          <div class="word-label">ПЕРЕВОД</div>
          <div class="word-text">${escapeHtml(wordObj.ru)}</div>
          <div class="hint">нажмите ← обратно</div>
        </div>
      </div>
    `;
  // переворот по клику
  card.addEventListener('click', (e) => {
    if (animating) return;
    card.classList.toggle('flipped');
  });
  return card;
}

function escapeHtml(str) {
  return str.replace(/[&<>]/g, function (m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

// Загрузить следующую карточку (или финиш)
function loadNextCard() {
  if (index >= words.length) {
    deckDiv.innerHTML = `
        <div class="end">
          🎉 Все слова повторены! 🎉
          <div class="restart" id="restartBtn">⟳ Начать сначала</div>
        </div>
      `;
    currentCard = null;
    updateProgress();
    document.getElementById('restartBtn')?.addEventListener('click', () => {
      index = 0;
      loadNextCard();
    });
    return;
  }

  const card = createCard(words[index]);
  deckDiv.innerHTML = '';
  deckDiv.appendChild(card);
  currentCard = card;
  updateProgress();
  animating = false;  // новая карточка готова
}

// Анимация уезда
function exitCard(direction) {
  if (!currentCard || animating) return;
  animating = true;

  currentCard.classList.add(direction === 'right' ? 'slide-right' : 'slide-left');
  currentCard.style.pointerEvents = 'none';

  const onFinish = () => {
    if (currentCard && currentCard.parentNode) currentCard.remove();
    index++;
    loadNextCard();
    animating = false;
  };
  currentCard.addEventListener('transitionend', onFinish, { once: true });
  // запасной таймер (на случай, если transition не сработает)
  setTimeout(() => {
    if (animating) onFinish();
  }, 300);
}

// Обработчики кнопок
document.getElementById('btnKnow').onclick = () => exitCard('right');
document.getElementById('btnNotKnow').onclick = () => exitCard('left');

// Старт
loadNextCard();