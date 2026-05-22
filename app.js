    // Tab switching
    //document.querySelectorAll('.nav-item').forEach(btn => {
    //  btn.addEventListener('click', () => {
    //    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    //    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    //    btn.classList.add('active');
    //    document.getElementById(btn.dataset.tab).classList.add('active');
    //  });
    //});

    // Стек экранов для каждой вкладки

// 1. Убедимся, что мы внутри Telegram
if (window.Telegram && window.Telegram.WebApp) {
    const tg = window.Telegram.WebApp;

    // 2. Быстрый доступ к данным (НЕБЕЗОПАСНО для передачи на сервер!)
    const unsafeData = tg.initDataUnsafe;
    console.log('Данные пользователя (небезопасно):', unsafeData);
    
    if (unsafeData && unsafeData.user) {
        console.log('ID:', unsafeData.user.id);
        console.log('Имя:', unsafeData.user.first_name);
        // ... другие поля
    }

    // 3. Данные для отправки на сервер (БЕЗОПАСНО)
    const safeInitData = tg.initData;
    console.log('Строка для проверки на сервере:', safeInitData);

    // Далее вы можете отправить safeInitData на ваш бэкенд через fetch
}  

const screenStacks = {
  home: ['main'],
  words: ['main'],
  grammar: ['main'],
  settings: ['main']
};

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
function openScreen(tabId, screenId) {
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