const { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let popupWindow = null;
let tray = null;

// 창 위치 저장 경로
const userDataPath = process.env.APPDATA || process.env.HOME;
const appDataPath = path.join(userDataPath, 'StarlightLetter');
const windowPositionsPath = path.join(appDataPath, 'window-positions.json');

// 창 위치 로드
function loadWindowPositions() {
  try {
    if (fs.existsSync(windowPositionsPath)) {
      return JSON.parse(fs.readFileSync(windowPositionsPath, 'utf8'));
    }
  } catch (e) {
    console.error('창 위치 로드 실패:', e);
  }
  return {};
}

// 창 위치 저장
function saveWindowPosition(windowType, bounds) {
  try {
    const positions = loadWindowPositions();
    positions[windowType] = { x: bounds.x, y: bounds.y };
    fs.writeFileSync(windowPositionsPath, JSON.stringify(positions, null, 2), 'utf8');
  } catch (e) {
    console.error('창 위치 저장 실패:', e);
  }
}

function createWindow() {
  const savedPositions = loadWindowPositions();
  const mainPos = savedPositions['main'];
  
  mainWindow = new BrowserWindow({
    width: 280,
    height: 350,
    x: mainPos ? mainPos.x : undefined,
    y: mainPos ? mainPos.y : undefined,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,  // Node.js API 사용을 위해 sandbox 비활성화
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('src/index.html');

  // 기본 컨텍스트 메뉴 비활성화 (커스텀 메뉴 사용)
  mainWindow.webContents.on('context-menu', (e) => {
    e.preventDefault();
  });

  // 창 이동시 위치 저장
  mainWindow.on('moved', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      saveWindowPosition('main', mainWindow.getBounds());
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (popupWindow && !popupWindow.isDestroyed()) {
      try {
        popupWindow.close();
      } catch (e) {
        console.error('팝업 닫기 실패:', e);
      }
      popupWindow = null;
    }
  });
}

// 팝업 창 생성
function createPopupWindow(type, data = {}) {
  // 기존 팝업이 있으면 닫기
  const oldPopup = popupWindow;
  popupWindow = null;  // 먼저 참조 해제
  
  if (oldPopup && !oldPopup.isDestroyed()) {
    try {
      oldPopup.close();
    } catch (e) {
      console.error('기존 팝업 닫기 실패:', e);
    }
  }

  const savedPositions = loadWindowPositions();
  const popupPos = savedPositions[`popup-${type}`];

  const popupConfig = {
    width: 600,
    height: 700,
    x: popupPos ? popupPos.x : undefined,
    y: popupPos ? popupPos.y : undefined,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    parent: mainWindow,
    modal: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,  // Node.js API 사용을 위해 sandbox 비활성화
      preload: path.join(__dirname, 'preload.js')
    }
  };

  switch (type) {
    case 'letter':
      popupConfig.title = '📮 편지';
      popupConfig.width = 600;
      popupConfig.height = 750;
      break;
    case 'letter-view':
      popupConfig.title = '📜 편지 읽기';
      popupConfig.width = 550;
      popupConfig.height = 800;
      break;
    case 'fortune':
      popupConfig.title = '🔮 오늘의 운세';
      popupConfig.width = 500;
      popupConfig.height = 550;
      break;
    case 'settings':
      popupConfig.title = '⚙️ 설정';
      popupConfig.height = 700;
      break;
    case 'alert':
      popupConfig.title = data.title || '알림';
      popupConfig.width = 300;
      popupConfig.height = 180;
      break;
  }

  popupWindow = new BrowserWindow(popupConfig);
  
  // 현재 팝업 타입 저장 (위치 저장용)
  popupWindow.popupType = type;
  
  // 현재 창의 ID 저장 (closed 이벤트에서 비교용)
  const currentWindowId = popupWindow.id;
  
  const queryString = new URLSearchParams({ type, data: JSON.stringify(data) }).toString();
  popupWindow.loadFile('src/popup.html', { query: { type, data: JSON.stringify(data) } });
  
  popupWindow.setMenuBarVisibility(false);

  // 창 이동시 위치 저장
  popupWindow.on('moved', () => {
    if (popupWindow && !popupWindow.isDestroyed() && popupWindow.id === currentWindowId) {
      saveWindowPosition(`popup-${popupWindow.popupType}`, popupWindow.getBounds());
    }
  });

  popupWindow.on('closed', () => {
    // 현재 popupWindow가 이 창인 경우에만 null로 설정
    if (popupWindow && popupWindow.id === currentWindowId) {
      popupWindow = null;
    }
  });

  return popupWindow;
}

// 시스템 트레이 생성
function createTray() {
  const iconPath = path.join(__dirname, 'src', 'assets', 'tray-icon.png');
  tray = new Tray(nativeImage.createEmpty());
  
  const contextMenu = Menu.buildFromTemplate([
    { label: '열기', click: () => mainWindow.show() },
    { label: '종료', click: () => app.quit() }
  ]);
  
  tray.setToolTip('DDB Letter');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC 핸들러 - 창 항상 위 설정
ipcMain.handle('set-always-on-top', (event, flag) => {
  if (mainWindow) {
    mainWindow.setAlwaysOnTop(flag);
  }
});

// IPC 핸들러 - 앱 종료
ipcMain.handle('app-quit', () => {
  // 모든 창을 먼저 닫고 앱 종료
  if (popupWindow && !popupWindow.isDestroyed()) {
    try {
      popupWindow.close();
    } catch (e) {
      console.error('팝업 닫기 실패:', e);
    }
    popupWindow = null;
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      mainWindow.close();
    } catch (e) {
      console.error('메인 창 닫기 실패:', e);
    }
    mainWindow = null;
  }
  app.quit();
});

// IPC 핸들러 - 창 최소화
ipcMain.handle('window-minimize', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

// IPC 핸들러 - 창 이동 (드래그 구현용)
ipcMain.handle('window-start-drag', () => {
  if (mainWindow) {
    const pos = mainWindow.getPosition();
    return { x: pos[0], y: pos[1] };
  }
  return { x: 0, y: 0 };
});

ipcMain.handle('window-move', (event, x, y) => {
  if (mainWindow) {
    mainWindow.setPosition(x, y);
  }
});

// IPC 핸들러 - 팝업 열기
ipcMain.handle('open-popup', (event, type, data) => {
  createPopupWindow(type, data);
});

// IPC 핸들러 - 팝업 닫기
ipcMain.handle('close-popup', () => {
  if (popupWindow && !popupWindow.isDestroyed()) {
    try {
      popupWindow.close();
    } catch (e) {
      console.error('팝업 닫기 실패:', e);
    }
    popupWindow = null;
  }
});

// IPC 핸들러 - 알림 팝업
ipcMain.handle('show-alert', (event, title, message) => {
  createPopupWindow('alert', { title, message });
});

// IPC 핸들러 - 이미지 저장
ipcMain.handle('save-image', async (event, dataUrl, defaultFilename) => {
  try {
    const result = await dialog.showSaveDialog(popupWindow || mainWindow, {
      title: '편지 이미지 저장',
      defaultPath: defaultFilename,
      filters: [
        { name: 'PNG 이미지', extensions: ['png'] }
      ]
    });
    
    if (!result.canceled && result.filePath) {
      // dataUrl에서 base64 데이터 추출
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
      fs.writeFileSync(result.filePath, base64Data, 'base64');
      return { success: true, path: result.filePath };
    }
    return { success: false, canceled: true };
  } catch (error) {
    console.error('이미지 저장 실패:', error);
    return { success: false, error: error.message };
  }
});
