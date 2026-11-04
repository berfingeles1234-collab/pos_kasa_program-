const { app, BrowserWindow, Menu } = require('electron');

// Windows açılışında otomatik başlatma ayarı
app.setLoginItemSettings({
  openAtLogin: true,
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      // Mevcut HTML/JS uyumluluğu için korunuyor.
      // İleride: nodeIntegration: false, contextIsolation: true + preload script
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Menü çubuğu / Alt kısayolu input focusunu bozmasın
  Menu.setApplicationMenu(null);

  win.loadFile('login.html').catch((error) => {
    console.error('login.html yüklenemedi:', error);
  });
}

app.whenReady().then(createWindow);

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
