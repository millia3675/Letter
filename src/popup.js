/**
 * DDB Letter - Popup Script
 * 팝업 창 스크립트
 */

// URL 파라미터 파싱
const urlParams = new URLSearchParams(window.location.search);
const pageType = urlParams.get('type');
const pageData = JSON.parse(urlParams.get('data') || '{}');

// 상태
let state = {
  settings: null,
  letters: {},
  fortunes: {},
  currentCalendarDate: new Date()
};

// 초기화
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  initPage();
  initEventListeners();
});

// 데이터 로드
async function loadData() {
  state.settings = window.electronAPI.storage.getSettings();
  state.letters = window.electronAPI.storage.getLetters();
  state.fortunes = window.electronAPI.storage.getFortune();
}

// 페이지 초기화
function initPage() {
  // 모든 페이지 숨기기
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  
  // 폰트 적용
  applyLetterFont();
  
  // 맞춤법 검사 설정 적용
  applySpellCheck();
  
  switch (pageType) {
    case 'letter':
      document.getElementById('letter-page').classList.remove('hidden');
      break;
    case 'fortune':
      initFortunePage();
      document.getElementById('fortune-page').classList.remove('hidden');
      break;
    case 'settings':
      initSettingsPage();
      document.getElementById('settings-page').classList.remove('hidden');
      break;
    case 'alert':
      document.getElementById('alert-message').textContent = pageData.message || '';
      document.getElementById('alert-page').classList.remove('hidden');
      break;
  }
}

// 편지 폰트 적용
function applyLetterFont() {
  const font = state.settings.letterFont || 'NanumSquare';
  const letterBodies = document.querySelectorAll('.letter-paper-body');
  const letterInput = document.getElementById('letter-input');
  
  letterBodies.forEach(body => {
    body.style.fontFamily = `'${font}', 'Malgun Gothic', sans-serif`;
  });
  
  if (letterInput) {
    letterInput.style.fontFamily = `'${font}', 'Malgun Gothic', sans-serif`;
  }
}

// 맞춤법 검사 설정 적용
function applySpellCheck() {
  const spellCheckEnabled = state.settings.spellCheck === true;
  const textareas = document.querySelectorAll('textarea');
  const inputs = document.querySelectorAll('input[type="text"]');
  
  textareas.forEach(textarea => {
    textarea.spellcheck = spellCheckEnabled;
  });
  
  inputs.forEach(input => {
    input.spellcheck = spellCheckEnabled;
  });
}

// 이벤트 리스너 초기화
function initEventListeners() {
  // 편지 페이지
  document.getElementById('btn-write-letter')?.addEventListener('click', showWriteSection);
  document.getElementById('btn-view-letters')?.addEventListener('click', showArchiveSection);
  document.getElementById('btn-back-menu')?.addEventListener('click', hideAllSections);
  document.getElementById('btn-back-menu2')?.addEventListener('click', hideAllSections);
  document.getElementById('btn-send-letter')?.addEventListener('click', sendLetter);
  document.getElementById('btn-rewrite-letter')?.addEventListener('click', confirmRewrite);
  
  // 편지 저장 버튼
  document.getElementById('btn-save-my-letter')?.addEventListener('click', () => saveLetterAsImage('my'));
  document.getElementById('btn-save-reply-letter')?.addEventListener('click', () => saveLetterAsImage('reply'));
  
  // 글자 수 카운터
  document.getElementById('letter-input')?.addEventListener('input', (e) => {
    document.getElementById('letter-char-count').textContent = e.target.value.length;
  });
  
  // 캘린더
  document.getElementById('prev-month')?.addEventListener('click', () => navigateCalendar(-1));
  document.getElementById('next-month')?.addEventListener('click', () => navigateCalendar(1));
  document.getElementById('btn-back-calendar')?.addEventListener('click', () => {
    document.getElementById('letter-detail').classList.add('hidden');
    document.getElementById('calendar-container').classList.remove('hidden');
  });
  
  // 답장 받기 버튼
  document.getElementById('btn-receive-reply')?.addEventListener('click', receiveReplyNow);
  
  // 답장 다시 받기 버튼
  document.getElementById('btn-regenerate-reply')?.addEventListener('click', regenerateReply);
  
  // 운세 페이지
  document.getElementById('btn-get-fortune')?.addEventListener('click', getFortune);
  
  // 설정 페이지
  document.getElementById('btn-save-settings')?.addEventListener('click', saveSettings);
  
  // 폰트 미리보기
  document.getElementById('font-select')?.addEventListener('change', updateFontPreview);
  
  // 알림 닫기
  document.getElementById('btn-close-alert')?.addEventListener('click', () => {
    window.electronAPI.closePopup();
  });
}

// ===== 편지 기능 =====
function showWriteSection() {
  document.querySelector('.button-group').classList.add('hidden');
  document.getElementById('write-section').classList.remove('hidden');
  document.getElementById('archive-section').classList.add('hidden');
  
  const today = getTodayString();
  const todayLetter = state.letters[today];
  
  const rewriteBtn = document.getElementById('btn-rewrite-letter');
  const sendBtn = document.getElementById('btn-send-letter');
  const rewriteNotice = document.getElementById('rewrite-notice');
  
  if (todayLetter && todayLetter.user) {
    document.getElementById('letter-input').value = todayLetter.user;
    document.getElementById('letter-char-count').textContent = todayLetter.user.length;
    
    // 이미 답장이 있는 경우
    if (todayLetter.reply) {
      rewriteBtn.classList.remove('hidden');
      sendBtn.classList.add('hidden');
      rewriteNotice.classList.remove('hidden');
    } else {
      // 답장 대기 중인 경우
      rewriteBtn.classList.add('hidden');
      sendBtn.classList.remove('hidden');
      rewriteNotice.classList.add('hidden');
    }
  } else {
    // 오늘 편지 없음
    document.getElementById('letter-input').value = '';
    document.getElementById('letter-char-count').textContent = '0';
    rewriteBtn.classList.add('hidden');
    sendBtn.classList.remove('hidden');
    rewriteNotice.classList.add('hidden');
  }
}

function showArchiveSection() {
  document.querySelector('.button-group').classList.add('hidden');
  document.getElementById('write-section').classList.add('hidden');
  document.getElementById('archive-section').classList.remove('hidden');
  document.getElementById('letter-detail').classList.add('hidden');
  document.getElementById('calendar-container').classList.remove('hidden');
  renderCalendar();
}

function hideAllSections() {
  document.querySelector('.button-group').classList.remove('hidden');
  document.getElementById('write-section').classList.add('hidden');
  document.getElementById('archive-section').classList.add('hidden');
}

// 다시 쓰기 확인
function confirmRewrite() {
  const confirmed = confirm('지금까지 받은 답장을 포기하고 편지를 다시 쓰시겠습니까?\n포기한 답장은 복구할 수 없습니다.');
  
  if (confirmed) {
    const today = getTodayString();
    // 오늘 편지 삭제
    delete state.letters[today];
    window.electronAPI.storage.saveLetter(today, null);
    
    // UI 초기화
    document.getElementById('letter-input').value = '';
    document.getElementById('letter-char-count').textContent = '0';
    document.getElementById('btn-rewrite-letter').classList.add('hidden');
    document.getElementById('btn-send-letter').classList.remove('hidden');
    document.getElementById('rewrite-notice').classList.add('hidden');
  }
}

async function sendLetter() {
  const letterContent = document.getElementById('letter-input').value.trim();
  
  if (!letterContent) {
    alert('편지 내용을 입력해주세요.');
    return;
  }
  
  if (!state.settings.apiKey) {
    alert('API 키가 설정되지 않았습니다. 설정에서 API 키를 입력해주세요.');
    return;
  }
  
  const today = getTodayString();
  
  // 먼저 사용자 편지 저장
  state.letters[today] = {
    user: letterContent,
    reply: null
  };
  window.electronAPI.storage.saveLetter(today, state.letters[today]);
  
  // 바로 알림 후 창 닫기
  alert('편지를 보냈습니다! 📮\n답장은 내일 확인할 수 있어요.');
  window.electronAPI.closePopup();
  
  // 백그라운드에서 답장 생성 (창이 닫힌 후에도 처리됨)
  try {
    const reply = await window.LLM.generateLetterReply(state.settings, letterContent);
    const stampId = getRandomStampId();
    
    const updatedLetter = {
      user: letterContent,
      reply: reply,
      stampId: stampId
    };
    window.electronAPI.storage.saveLetter(today, updatedLetter);
    console.log('답장 저장 완료, 우표:', stampId);
    
  } catch (error) {
    console.error('답장 생성 실패:', error.message);
    // 실패해도 사용자 편지는 저장되어 있음
  }
}

function renderCalendar() {
  const year = state.currentCalendarDate.getFullYear();
  const month = state.currentCalendarDate.getMonth();
  
  document.getElementById('current-month').textContent = `${year}년 ${month + 1}월`;
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDay.getDay();
  
  const container = document.getElementById('calendar-days');
  container.innerHTML = '';
  
  // 이전 달 빈 칸
  for (let i = 0; i < startDayOfWeek; i++) {
    const prevDate = new Date(year, month, -startDayOfWeek + i + 1);
    const dayEl = createDayElement(prevDate, true);
    container.appendChild(dayEl);
  }
  
  // 현재 달
  const today = getTodayString();
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day);
    const dateStr = formatDateString(date);
    const letter = state.letters[dateStr] || null;
    const dayEl = createDayElement(date, false, letter);
    
    if (dateStr === today) {
      dayEl.classList.add('today');
    }
    
    dayEl.addEventListener('click', () => showLetterDetail(dateStr));
    container.appendChild(dayEl);
  }
  
  // 다음 달 빈 칸
  const totalCells = startDayOfWeek + lastDay.getDate();
  const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let i = 1; i <= remainingCells; i++) {
    const nextDate = new Date(year, month + 1, i);
    const dayEl = createDayElement(nextDate, true);
    container.appendChild(dayEl);
  }
}

function createDayElement(date, isOtherMonth, letter = null) {
  const el = document.createElement('div');
  el.className = 'calendar-day';
  
  const dateStr = formatDateString(date);
  const today = getTodayString();
  const isToday = (dateStr === today);
  
  // 답장이 있는 경우 우표 배경 추가 (오늘 날짜는 제외 - 내일 확인 가능)
  if (letter && letter.reply && letter.stampId && !isToday) {
    const stampImg = document.createElement('img');
    stampImg.className = 'stamp-bg';
    stampImg.src = window.electronAPI.getStampPath(letter.stampId);
    stampImg.alt = '';
    stampImg.onerror = () => console.error('우표 로드 실패:', letter.stampId);
    el.appendChild(stampImg);
    el.classList.add('has-letter');
  }
  
  const daySpan = document.createElement('span');
  daySpan.className = 'day-number';
  daySpan.textContent = date.getDate();
  el.appendChild(daySpan);
  
  if (isOtherMonth) el.classList.add('other-month');
  return el;
}

// 랜덤 우표 ID 생성 (001~118)
function getRandomStampId() {
  const num = Math.floor(Math.random() * 118) + 1;
  return String(num).padStart(3, '0');
}

function navigateCalendar(direction) {
  state.currentCalendarDate.setMonth(state.currentCalendarDate.getMonth() + direction);
  renderCalendar();
}

// 현재 보고 있는 편지 날짜 저장
let currentViewingDate = null;

function showLetterDetail(dateStr) {
  const letter = state.letters[dateStr];
  
  if (!letter) {
    alert('해당 날짜에 편지가 없습니다.');
    return;
  }
  
  currentViewingDate = dateStr;
  
  const today = getTodayString();
  const isToday = (dateStr === today);
  
  // 날짜 포맷팅
  const [year, month, day] = dateStr.split('-');
  const formattedDate = `${year}년 ${parseInt(month)}월 ${parseInt(day)}일`;
  
  document.getElementById('my-letter-date').textContent = formattedDate;
  document.getElementById('reply-letter-date').textContent = formattedDate;
  document.getElementById('my-letter-content').textContent = letter.user || '(편지 없음)';
  
  // 답장 받기 버튼
  const receiveBtn = document.getElementById('btn-receive-reply');
  
  // 답장 다시 받기 버튼
  const regenerateBtn = document.getElementById('btn-regenerate-reply');
  
  // 오늘 보낸 편지의 답장은 내일까지 숨김
  if (isToday) {
    document.getElementById('reply-content').textContent = '답장은 내일 확인할 수 있어요 💌';
    document.getElementById('reply-stamp').classList.add('hidden');
    receiveBtn.classList.add('hidden');
    regenerateBtn.classList.add('hidden');
  } else {
    // 과거 날짜
    if (letter.reply) {
      // 답장이 있는 경우
      document.getElementById('reply-content').textContent = letter.reply;
      receiveBtn.classList.add('hidden');
      regenerateBtn.classList.remove('hidden'); // 다시 받기 버튼 표시
      
      // 우표 이미지 설정
      const stampImg = document.getElementById('reply-stamp');
      if (letter.stampId) {
        stampImg.src = window.electronAPI.getStampPath(letter.stampId);
        stampImg.classList.remove('hidden');
      } else {
        stampImg.classList.add('hidden');
      }
    } else {
      // 답장이 없는 경우 - 답장 받기 버튼 표시
      document.getElementById('reply-content').textContent = '아직 답장이 도착하지 않았어요... 😢';
      document.getElementById('reply-stamp').classList.add('hidden');
      receiveBtn.classList.remove('hidden');
      regenerateBtn.classList.add('hidden');
    }
  }
  
  document.getElementById('calendar-container').classList.add('hidden');
  document.getElementById('letter-detail').classList.remove('hidden');
}

// 즉시 답장 받기
async function receiveReplyNow() {
  if (!currentViewingDate) return;
  
  const letter = state.letters[currentViewingDate];
  if (!letter || !letter.user) {
    alert('편지 정보를 찾을 수 없습니다.');
    return;
  }
  
  if (letter.reply) {
    alert('이미 답장이 있습니다.');
    return;
  }
  
  if (!state.settings.apiKey) {
    alert('API 키가 설정되지 않았습니다. 설정에서 API 키를 입력해주세요.');
    return;
  }
  
  showLoading('답장을 받아오는 중...');
  
  try {
    const reply = await window.LLM.generateLetterReply(state.settings, letter.user);
    const stampId = getRandomStampId();
    
    // 저장
    state.letters[currentViewingDate] = {
      user: letter.user,
      reply: reply,
      stampId: stampId
    };
    window.electronAPI.storage.saveLetter(currentViewingDate, state.letters[currentViewingDate]);
    
    hideLoading();
    
    // UI 업데이트
    document.getElementById('reply-content').textContent = reply;
    document.getElementById('btn-receive-reply').classList.add('hidden');
    
    const stampImg = document.getElementById('reply-stamp');
    stampImg.src = window.electronAPI.getStampPath(stampId);
    stampImg.classList.remove('hidden');
    
    alert('답장이 도착했습니다! 💌');
    
  } catch (error) {
    hideLoading();
    alert('답장을 받아오는데 실패했습니다: ' + error.message);
  }
}

// 답장 다시 받기
async function regenerateReply() {
  if (!currentViewingDate) return;
  
  const letter = state.letters[currentViewingDate];
  if (!letter || !letter.user) {
    alert('편지 정보를 찾을 수 없습니다.');
    return;
  }
  
  if (!state.settings.apiKey) {
    alert('API 키가 설정되지 않았습니다. 설정에서 API 키를 입력해주세요.');
    return;
  }
  
  const confirmed = confirm('정말 답장을 다시 받으시겠습니까?\n기존 답장은 삭제됩니다.');
  if (!confirmed) return;
  
  showLoading('새 답장을 받아오는 중...');
  
  try {
    const reply = await window.LLM.generateLetterReply(state.settings, letter.user);
    const stampId = getRandomStampId();
    
    // 저장
    state.letters[currentViewingDate] = {
      user: letter.user,
      reply: reply,
      stampId: stampId
    };
    window.electronAPI.storage.saveLetter(currentViewingDate, state.letters[currentViewingDate]);
    
    hideLoading();
    
    // UI 업데이트
    document.getElementById('reply-content').textContent = reply;
    
    const stampImg = document.getElementById('reply-stamp');
    stampImg.src = window.electronAPI.getStampPath(stampId);
    stampImg.classList.remove('hidden');
    
    // 캘린더도 업데이트
    renderCalendar();
    
    alert('새 답장이 도착했습니다! 💌');
    
  } catch (error) {
    hideLoading();
    alert('답장을 받아오는데 실패했습니다: ' + error.message);
  }
}

// ===== 운세 기능 =====
function initFortunePage() {
  const today = getTodayString();
  const todayFortune = state.fortunes[today];
  
  const fortuneText = document.getElementById('fortune-text');
  const fortuneBtn = document.getElementById('btn-get-fortune');
  
  if (todayFortune) {
    fortuneText.textContent = todayFortune;
    fortuneBtn.textContent = '✓ 오늘의 운세 확인 완료';
    fortuneBtn.disabled = true;
  } else {
    fortuneText.textContent = '🔮 버튼을 눌러 오늘의 운세를 확인하세요!';
    fortuneBtn.textContent = '🔮 운세 확인하기';
    fortuneBtn.disabled = false;
  }
}

async function getFortune() {
  if (!state.settings.apiKey) {
    alert('API 키가 설정되지 않았습니다. 설정에서 API 키를 입력해주세요.');
    return;
  }
  
  const today = getTodayString();
  
  if (state.fortunes[today]) {
    alert('오늘의 운세는 이미 확인했습니다!');
    return;
  }
  
  showLoading('운세를 점치는 중...');
  
  try {
    const fortune = await window.LLM.generateFortune(state.settings);
    
    state.fortunes[today] = fortune;
    window.electronAPI.storage.saveFortune(today, fortune);
    
    hideLoading();
    
    document.getElementById('fortune-text').textContent = fortune;
    document.getElementById('btn-get-fortune').textContent = '✓ 오늘의 운세 확인 완료';
    document.getElementById('btn-get-fortune').disabled = true;
    
  } catch (error) {
    hideLoading();
    alert('운세를 가져오는데 실패했습니다: ' + error.message);
  }
}

// ===== 설정 기능 =====
function initSettingsPage() {
  document.getElementById('api-key').value = state.settings.apiKey || '';
  document.getElementById('user-name').value = state.settings.userName || '';
  document.getElementById('user-prompt').value = state.settings.userPrompt || '';
  document.getElementById('character-prompt').value = state.settings.characterPrompt || '';
  document.getElementById('relationship').value = state.settings.relationship || '';
  document.getElementById('formal-speech').checked = state.settings.formalSpeech !== false;
  document.getElementById('always-on-top').checked = state.settings.alwaysOnTop !== false;
  document.getElementById('spellcheck-toggle').checked = state.settings.spellCheck === true;
  document.getElementById('font-select').value = state.settings.letterFont || 'NanumSquare';
  updateFontPreview();
}

function updateFontPreview() {
  const fontSelect = document.getElementById('font-select');
  const fontPreview = document.getElementById('font-preview');
  
  if (fontSelect && fontPreview) {
    const selectedFont = fontSelect.value;
    fontPreview.style.fontFamily = `'${selectedFont}', 'Malgun Gothic', sans-serif`;
  }
}

function saveSettings() {
  state.settings = {
    apiKey: document.getElementById('api-key').value.trim(),
    userName: document.getElementById('user-name').value.trim(),
    userPrompt: document.getElementById('user-prompt').value.trim(),
    characterPrompt: document.getElementById('character-prompt').value.trim(),
    relationship: document.getElementById('relationship').value.trim(),
    formalSpeech: document.getElementById('formal-speech').checked,
    alwaysOnTop: document.getElementById('always-on-top').checked,
    spellCheck: document.getElementById('spellcheck-toggle').checked,
    letterFont: document.getElementById('font-select').value
  };
  
  window.electronAPI.storage.saveSettings(state.settings);
  window.electronAPI.setAlwaysOnTop(state.settings.alwaysOnTop);
  
  alert('설정이 저장되었습니다!');
}

// ===== 유틸리티 =====
function showLoading(text = '처리 중...') {
  document.getElementById('loading-text').textContent = text;
  document.getElementById('loading').classList.remove('hidden');
}

function hideLoading() {
  document.getElementById('loading').classList.add('hidden');
}

function getTodayString() {
  return formatDateString(new Date());
}

function formatDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ===== 편지 이미지 저장 =====
async function saveLetterAsImage(type) {
  const elementId = type === 'my' ? 'my-letter-paper' : 'reply-letter-paper';
  const element = document.getElementById(elementId);
  
  if (!element) {
    alert('저장할 편지를 찾을 수 없습니다.');
    return;
  }
  
  try {
    // html2canvas 동적 로드
    if (!window.html2canvas) {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    }
    
    showLoading('이미지 생성 중...');
    
    const scale = 2;
    const canvas = await html2canvas(element, {
      backgroundColor: null,  // 투명하게 설정하여 직접 그림
      scale: scale,
      useCORS: true,
      allowTaint: true
    });
    
    // 밑줄이 있는 새 캔버스 생성
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = canvas.width;
    finalCanvas.height = canvas.height;
    const ctx = finalCanvas.getContext('2d');
    
    // 배경색 칠하기
    ctx.fillStyle = '#fffef8';
    ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
    
    // 밑줄 그리기 (30px 간격, scale 적용)
    const lineSpacing = 30 * scale;
    ctx.strokeStyle = '#e8e4dc';
    ctx.lineWidth = 1 * scale;
    
    for (let y = lineSpacing; y < finalCanvas.height; y += lineSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(finalCanvas.width, y);
      ctx.stroke();
    }
    
    // 원본 캔버스 내용 그리기
    ctx.drawImage(canvas, 0, 0);
    
    const dataUrl = finalCanvas.toDataURL('image/png');
    const dateStr = document.getElementById(type === 'my' ? 'my-letter-date' : 'reply-letter-date').textContent;
    const prefix = type === 'my' ? '보낸편지' : '받은답장';
    const filename = `${prefix}_${dateStr.replace(/[년월일\s]/g, '')}.png`;
    
    hideLoading();
    
    const result = await window.electronAPI.saveImage(dataUrl, filename);
    
    if (result.success) {
      alert('편지가 이미지로 저장되었습니다!');
    } else if (!result.canceled) {
      alert('저장에 실패했습니다: ' + (result.error || '알 수 없는 오류'));
    }
  } catch (error) {
    hideLoading();
    console.error('이미지 저장 오류:', error);
    alert('이미지 저장 중 오류가 발생했습니다.');
  }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}
