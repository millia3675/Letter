/**
 * DDB Letter - Main Renderer Script
 * 메인 위젯 렌더러 스크립트
 */

// 상태
let state = {
  settings: null,
  targetTime: null
};

// 초기화
document.addEventListener('DOMContentLoaded', async () => {
  console.log('=== DOMContentLoaded ===');
  await loadData();
  initEventListeners();
  initCountdown();
  console.log('=== 초기화 완료 ===');
});

// 데이터 로드
async function loadData() {
  state.settings = window.electronAPI.storage.getSettings();
  
  if (state.settings.alwaysOnTop !== undefined) {
    window.electronAPI.setAlwaysOnTop(state.settings.alwaysOnTop);
  }
  
  initTargetTime();
}

// 목표 시간 초기화 (다음날 자정)
function initTargetTime() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  state.targetTime = tomorrow.getTime();
}

// 이벤트 리스너
function initEventListeners() {
  console.log('initEventListeners 시작');
  const mailbox = document.getElementById('mailbox');
  const mailboxImg = document.getElementById('mailbox-img');
  const menu = document.getElementById('context-menu');
  
  console.log('mailbox:', mailbox);
  console.log('context-menu:', menu);
  
  // 호버 시 이미지 변경 (Close -> Open)
  mailbox.addEventListener('mouseenter', () => {
    mailboxImg.src = 'assets/Open.png';
  });
  
  mailbox.addEventListener('mouseleave', () => {
    mailboxImg.src = 'assets/Close.png';
  });
  
  // 좌클릭 드래그로 창 이동
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let windowStartX = 0;
  let windowStartY = 0;
  
  mailbox.addEventListener('mousedown', async (e) => {
    if (e.button === 0) { // 좌클릭만
      isDragging = true;
      dragStartX = e.screenX;
      dragStartY = e.screenY;
      const pos = await window.electronAPI.windowStartDrag();
      windowStartX = pos.x;
      windowStartY = pos.y;
      e.preventDefault();
    }
  });
  
  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      const deltaX = e.screenX - dragStartX;
      const deltaY = e.screenY - dragStartY;
      window.electronAPI.windowMove(windowStartX + deltaX, windowStartY + deltaY);
    }
  });
  
  document.addEventListener('mouseup', (e) => {
    if (e.button === 0) {
      isDragging = false;
    }
  });
  
  // 우클릭 - 컨텍스트 메뉴
  document.addEventListener('contextmenu', (e) => {
    console.log('우클릭!', e.clientX, e.clientY);
    e.preventDefault();
    showContextMenu(e.clientX, e.clientY);
  });
  
  // 클릭 시 메뉴 숨기기
  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target)) {
      menu.classList.add('hidden');
    }
  });
  
  // 메뉴 아이템 클릭
  document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = item.dataset.action;
      console.log('메뉴 클릭:', action);
      menu.classList.add('hidden');
      handleMenuAction(action);
    });
  });
  
  console.log('initEventListeners 완료');
}

// 우체통 흔들기
function shakeMailbox() {
  const mailbox = document.getElementById('mailbox');
  mailbox.classList.add('shake');
  setTimeout(() => mailbox.classList.remove('shake'), 200);
}

// 카운트다운
function initCountdown() {
  updateCountdown();
  setInterval(updateCountdown, 1000);
}

function updateCountdown() {
  const now = Date.now();
  let remaining = state.targetTime - now;
  
  if (remaining < 0) remaining = 0;
  
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
  
  const timerEl = document.getElementById('countdown-timer');
  timerEl.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// 컨텍스트 메뉴
function showContextMenu(x, y) {
  const menu = document.getElementById('context-menu');
  menu.classList.remove('hidden');
  
  const menuRect = menu.getBoundingClientRect();
  if (x + menuRect.width > window.innerWidth) {
    x = window.innerWidth - menuRect.width - 10;
  }
  if (y + menuRect.height > window.innerHeight) {
    y = window.innerHeight - menuRect.height - 10;
  }
  
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
}

// 메뉴 동작
function handleMenuAction(action) {
  switch (action) {
    case 'letter':
      window.electronAPI.openPopup('letter', {});
      break;
    case 'fortune':
      window.electronAPI.openPopup('fortune', {});
      break;
    case 'settings':
      window.electronAPI.openPopup('settings', {});
      break;
    case 'quit':
      window.electronAPI.appQuit();
      break;
  }
}

// 유틸리티
function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
