const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');

console.log('=== preload.js 로드 시작 ===');

// 데이터 저장 경로
let appDataPath;
let lettersPath;
let fortunePath;
let settingsPath;

try {
  const userDataPath = process.env.APPDATA || process.env.HOME;
  appDataPath = path.join(userDataPath, 'StarlightLetter');
  console.log('앱 데이터 경로:', appDataPath);

  // 앱 데이터 폴더 생성
  if (!fs.existsSync(appDataPath)) {
    fs.mkdirSync(appDataPath, { recursive: true });
    console.log('폴더 생성됨');
  }

  // 파일 경로
  lettersPath = path.join(appDataPath, 'letters.json');
  fortunePath = path.join(appDataPath, 'fortune.json');
  settingsPath = path.join(appDataPath, 'settings.json');

  // 파일 초기화
  function initFile(filePath, defaultData = {}) {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), 'utf8');
    }
  }

  initFile(lettersPath);
  initFile(fortunePath);
  initFile(settingsPath, {
    apiKey: '',
    characterPrompt: '',
    relationship: '',
    formalSpeech: true,
    alwaysOnTop: true
  });
  
  console.log('파일 초기화 완료');
} catch (err) {
  console.error('preload.js 초기화 에러:', err);
}

console.log('=== contextBridge 노출 시작 ===');

// 스탬프 폴더 경로 (개발 환경과 빌드 환경 모두 지원)
let stampPath;
if (process.resourcesPath && !process.resourcesPath.includes('node_modules')) {
  // 빌드된 앱에서는 extraResources 경로 사용
  stampPath = path.join(process.resourcesPath, 'stamp');
} else {
  // 개발 환경에서는 프로젝트 폴더 사용 (preload.js와 같은 레벨)
  stampPath = path.join(__dirname, 'stamp');
}
console.log('스탬프 경로:', stampPath);
console.log('스탬프 폴더 존재:', fs.existsSync(stampPath));

// API 노출
try {
  contextBridge.exposeInMainWorld('electronAPI', {
    // 스탬프 경로 가져오기 (file:// URL로 반환)
    getStampPath: (stampId) => {
      const filePath = path.join(stampPath, `${stampId}.png`);
      // Windows 경로를 file:// URL로 변환
      return 'file:///' + filePath.replace(/\\/g, '/');
    },
    
    // 이미지 저장
    saveImage: (dataUrl, filename) => {
      return ipcRenderer.invoke('save-image', dataUrl, filename);
    },
    
    // 창 제어
    setAlwaysOnTop: (flag) => ipcRenderer.invoke('set-always-on-top', flag),
    appQuit: () => ipcRenderer.invoke('app-quit'),
    windowMinimize: () => ipcRenderer.invoke('window-minimize'),
    windowStartDrag: () => ipcRenderer.invoke('window-start-drag'),
    windowMove: (x, y) => ipcRenderer.invoke('window-move', x, y),
    
    // 팝업 제어
    openPopup: (type, data) => ipcRenderer.invoke('open-popup', type, data),
    closePopup: () => ipcRenderer.invoke('close-popup'),
    showAlert: (title, message) => ipcRenderer.invoke('show-alert', title, message),

    // 스토리지
    storage: {
      // 편지 관련
      getLetters: () => {
        try {
          const data = fs.readFileSync(lettersPath, 'utf8');
          return JSON.parse(data);
        } catch (e) {
          return {};
        }
      },
      saveLetter: (date, letterData) => {
        try {
          const letters = JSON.parse(fs.readFileSync(lettersPath, 'utf8') || '{}');
          letters[date] = letterData;
          fs.writeFileSync(lettersPath, JSON.stringify(letters, null, 2), 'utf8');
          return true;
        } catch (e) {
          console.error('편지 저장 실패:', e);
          return false;
        }
      },

      // 운세 관련
      getFortune: () => {
        try {
          const data = fs.readFileSync(fortunePath, 'utf8');
          return JSON.parse(data);
        } catch (e) {
          return {};
        }
      },
      saveFortune: (date, fortuneText) => {
        try {
          const fortunes = JSON.parse(fs.readFileSync(fortunePath, 'utf8') || '{}');
          fortunes[date] = fortuneText;
          fs.writeFileSync(fortunePath, JSON.stringify(fortunes, null, 2), 'utf8');
          return true;
        } catch (e) {
          console.error('운세 저장 실패:', e);
          return false;
        }
      },

      // 설정 관련
      getSettings: () => {
        try {
          const data = fs.readFileSync(settingsPath, 'utf8');
          return JSON.parse(data);
        } catch (e) {
          return {
            apiKey: '',
            characterPrompt: '',
            relationship: '',
            formalSpeech: true,
            alwaysOnTop: true
          };
        }
      },
      saveSettings: (settings) => {
        try {
          fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
          return true;
        } catch (e) {
          console.error('설정 저장 실패:', e);
          return false;
        }
      }
    }
  });
  
  console.log('=== contextBridge 노출 완료 ===');
} catch (err) {
  console.error('contextBridge 에러:', err);
}
