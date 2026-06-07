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

// --- Конфигурация ---
const API_BASE_URL = 'https://a931-176-113-164-251.ngrok-free.app';

// Стек экранов для каждой вкладки
const screenStacks = {
  home: ['main'],
  words: ['main'],
  grammar: ['main'],
  settings: ['main']
};

// --- Состояние игры карточек (изолировано от глобальных переменных) ---
const cardGame = {
  words: [],           // массив слов { en, ru, ... }
  currentIndex: 0,
  deck: null,         // будет установлен после загрузки DOM
  currentCard: null,
  isDragging: false,
  startX: 0,
  startY: 0,
  SWIPE_THRESHOLD: 80,
  MAX_OPACITY_DISTANCE: 100
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
      const data = await response.json();
      if (!data || data.length === 0) throw new Error('empty list');
      startCardGame(data); // сброс и инициализация карточек
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
}

// --- Показать конкретный экран внутри панели ---
function showScreen(tabId, screenId) {
  const panel = document.getElementById('panel-' + tabId);
  if (!panel) return;
  panel.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const screen = document.getElementById(`screen-${tabId}-${screenId}`);
  if (screen) screen.classList.add('active');
}

// --- Логика карточек (свайп-карточки) ---

// Создаёт DOM карточки
function renderCard(wordObj) {
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `
    <div class="card-inner">
      <div class="face front">
        <span class="word-label">Слово</span>
        <span class="word-text">${escapeHtml(wordObj.en)}</span>
        <span class="hint">Нажмите для перевода</span>
      </div>
      <div class="face back">
        <span class="word-label">Перевод</span>
        <span class="word-text">${escapeHtml(wordObj.ru)}</span>
        <span class="hint">Нажмите, чтобы вернуть</span>
      </div>
    </div>
    <div class="indicator left">НЕ ЗНАЮ</div>
    <div class="indicator right">ЗНАЮ</div>
  `;
  return card;
}

// Простейшая защита от XSS
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function (m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

// Инициализация или перезапуск игры с новыми словами
function startCardGame(newWords) {
  cardGame.words = newWords;
  cardGame.currentIndex = 0;
  cardGame.currentCard = null;
  cardGame.isDragging = false;
  if (cardGame.deck) {
    cardGame.deck.innerHTML = '';
    if (newWords.length === 0) {
      cardGame.deck.innerHTML = '<div style="text-align:center; padding:40px;">Список слов пуст 🫤</div>';
      return;
    }
    loadNextCard();
  }
}

// Загружает следующую карточку в колоду
function loadNextCard() {
  const { deck, words, currentIndex } = cardGame;
  if (!deck) return;
  deck.innerHTML = '';
  if (currentIndex >= words.length) {
    deck.innerHTML = '<div style="text-align:center; padding:40px; font-size:24px;">Слова закончились 🎉</div>';
    return;
  }

  const card = renderCard(words[currentIndex]);
  deck.appendChild(card);
  cardGame.currentCard = card;
  attachEvents(card);

  if (currentIndex === 0) {
    card.classList.add('hint-sway');
  }
}

// Прикрепление обработчиков мыши/тача
function attachEvents(card) {
  card.addEventListener('mousedown', onDragStart);
  card.addEventListener('touchstart', onDragStart, { passive: false });
}

function onDragStart(e) {
  if (e.target.closest('.card') !== cardGame.currentCard) return;

  cardGame.isDragging = true;
  const point = e.touches ? e.touches[0] : e;
  cardGame.startX = point.clientX;
  cardGame.startY = point.clientY;

  const card = cardGame.currentCard;
  card.classList.remove('hint-sway');
  card.style.transition = 'none';

  document.addEventListener('mousemove', onDragMove);
  document.addEventListener('mouseup', onDragEnd);
  document.addEventListener('touchmove', onDragMove, { passive: false });
  document.addEventListener('touchend', onDragEnd);
}

function onDragMove(e) {
  if (!cardGame.isDragging || !cardGame.currentCard) return;
  e.preventDefault();

  const point = e.touches ? e.touches[0] : e;
  const diffX = point.clientX - cardGame.startX;
  const diffY = point.clientY - cardGame.startY;
  const rotate = diffX * 0.05;

  const card = cardGame.currentCard;
  card.style.transform = `translate(${diffX}px, ${diffY}px) rotate(${rotate}deg)`;

  const leftIndicator = card.querySelector('.indicator.left');
  const rightIndicator = card.querySelector('.indicator.right');
  const absDiff = Math.abs(diffX);
  const opacity = Math.min(1, absDiff / cardGame.MAX_OPACITY_DISTANCE);

  if (diffX > 0) {
    if (leftIndicator) leftIndicator.style.opacity = 0;
    if (rightIndicator) rightIndicator.style.opacity = opacity;
  } else if (diffX < 0) {
    if (leftIndicator) leftIndicator.style.opacity = opacity;
    if (rightIndicator) rightIndicator.style.opacity = 0;
  } else {
    if (leftIndicator) leftIndicator.style.opacity = 0;
    if (rightIndicator) rightIndicator.style.opacity = 0;
  }
}

function onDragEnd(e) {
  if (!cardGame.isDragging || !cardGame.currentCard) return;
  cardGame.isDragging = false;

  document.removeEventListener('mousemove', onDragMove);
  document.removeEventListener('mouseup', onDragEnd);
  document.removeEventListener('touchmove', onDragMove);
  document.removeEventListener('touchend', onDragEnd);

  const point = e.changedTouches ? e.changedTouches[0] : e;
  const diffX = point.clientX - cardGame.startX;
  const diffY = point.clientY - cardGame.startY;
  const card = cardGame.currentCard;

  // Скрываем индикаторы
  const leftIndicator = card.querySelector('.indicator.left');
  const rightIndicator = card.querySelector('.indicator.right');
  if (leftIndicator) leftIndicator.style.opacity = 0;
  if (rightIndicator) rightIndicator.style.opacity = 0;

  // Клик (почти без движения) — переворот карточки
  if (Math.abs(diffX) < 5 && Math.abs(diffY) < 5) {
    card.style.transition = 'transform 0.25s ease';
    card.style.transform = '';
    card.classList.toggle('flipped');
    return;
  }

  // Свайп
  card.style.transition = 'transform 0.25s ease, opacity 0.25s ease';
  if (Math.abs(diffX) > cardGame.SWIPE_THRESHOLD) {
    const direction = diffX > 0 ? 'swiped-right' : 'swiped-left';
    card.classList.add(direction);

    setTimeout(() => {
      if (cardGame.currentCard === card) {
        card.remove();
        cardGame.currentCard = null;
      }
      cardGame.currentIndex++;
      loadNextCard();
    }, 250);
  } else {
    // Не дотянули – возвращаем на место
    card.style.transform = '';
  }
}

// --- Инициализация приложения после загрузки DOM ---
document.addEventListener('DOMContentLoaded', () => {
  // Устанавливаем ссылку на deck для карточной игры
  cardGame.deck = document.getElementById('deck');
  // Начальное состояние: все экраны main активны по умолчанию (уже в разметке)
  // Показываем первую вкладку home
  switchTab('home');

  // Обработчик для кнопки "Назад" (если есть в интерфейсе)
  // Предполагаем, что в каждом экране есть элемент с классом .back-button
  document.addEventListener('click', (e) => {
    const backBtn = e.target.closest('.back-button');
    if (backBtn) {
      const panel = backBtn.closest('.tab-panel');
      if (panel) {
        const tabId = panel.id.replace('panel-', '');
        closeScreen(tabId);
      }
    }
  });
});