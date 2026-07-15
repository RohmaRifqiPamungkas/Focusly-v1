// PERBAIKAN 1: Impor 'session' dari electron
const { app, BrowserWindow, Tray, Menu, ipcMain, session } = require('electron')
const path = require('path')

let tray = null
let mainWindow = null

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.resolve(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    })

    // Paksa session Electron menyamar sebagai browser Chrome standar 
    const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    mainWindow.webContents.setUserAgent(userAgent)

    // PERBAIKAN 2: Cegat request ke Supabase dan paksa Origin-nya menjadi http://localhost:3000
    // Ini menghilangkan deteksi header internal Electron yang memicu error 406
    session.defaultSession.webRequest.onBeforeSendHeaders(
        { urls: ['https://*.supabase.co/*'] },
        (details, callback) => {
            const headers = { ...details.requestHeaders }

            headers['User-Agent'] = userAgent
            headers['Origin'] = 'http://localhost:3000'

            callback({ requestHeaders: headers })
        }
    )

    // Load aplikasi Next.js kamu
    mainWindow.loadURL('http://localhost:3000')

    // Otomatis membuka DevTools untuk pantauan log
    mainWindow.webContents.openDevTools()

    mainWindow.on('closed', () => {
        mainWindow = null
    })
}

app.whenReady().then(() => {
    createWindow()

    // Gunakan try-catch agar jika icon /favicon.ico tidak terbaca, menu bar tidak crash
    try {
        const iconPath = path.join(__dirname, 'public/favicon.ico')
        tray = new Tray(iconPath)
    } catch (error) {
        console.log('Gagal memuat icon, membuat tray kosong tanpa gambar...')
        // Membuat tray kosong bawaan sistem (tetap bisa menampilkan teks judul di Mac)
        tray = new Tray(path.join(__dirname, ''))
    }

    const contextMenu = Menu.buildFromTemplate([
        { label: 'Show Focusly', click: () => { if (mainWindow) mainWindow.show(); else createWindow(); } },
        { type: 'separator' },
        { label: 'Quit', click: () => app.quit() }
    ])

    tray.setToolTip('Focusly Pro Timer')
    tray.setContextMenu(contextMenu)

    // Paksa teks muncul pertama kali aplikasi dibuka untuk ngetes Menu Bar Mac penuh/tidak
    if (tray) {
        tray.setTitle("25:00")
    }
})

// Menangkap data dari Next.js untuk diupdate ke Menu Bar Mac
ipcMain.on('update-timer', (event, timeString) => {
    // Tambahkan log ke terminal untuk cek apakah data dari Next.js masuk
    console.log('-> Menerima data waktu dari Next.js:', timeString)

    if (tray) {
        // tray.setTitle adalah fungsi khusus macOS untuk menampilkan teks di samping icon menu bar
        tray.setTitle(timeString)
    }
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
    if (mainWindow === null) createWindow()
})