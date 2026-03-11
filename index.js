const fs = require('fs')
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  PHONENUMBER_MCC
} = require('@whiskeysockets/baileys')

const Pino = require('pino')
const readline = require('readline')
const { handleMessage } = require('./lib/handler')

// Setup Interface untuk Input Nomor
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (text) => new Promise((resolve) => rl.question(text, resolve))

process.on('uncaughtException', err => {
  if (err.message?.includes('Bad MAC')) return
  console.error('Ada error yang tidak terduga:', err)
})

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./session')
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, Pino({ level: 'silent' })),
    },
    version,
    logger: Pino({ level: 'silent' }),
    // Identitas browser (Penting agar pairing code berhasil)
    browser: ["Ubuntu", "Chrome", "20.0.04"], 
    printQRInTerminal: false // Matikan QR karena pakai pairing
  })

  // LOGIKA UTAMA PAIRING CODE
  if (!sock.authState.creds.registered) {
    console.log('\n--- LOGIN VIA PAIRING CODE ---')
    let phoneNumber = await question('Masukkan nomor WhatsApp (contoh: 628xxx): ')
    
    // Hilangkan karakter non-angka
    phoneNumber = phoneNumber.replace(/[^0-9]/g, '')

    // Validasi apakah nomor valid (minimal 10 digit)
    if (!Object.keys(PHONENUMBER_MCC).some(v => phoneNumber.startsWith(v))) {
        console.log("❌ Nomor harus dimulai dengan kode negara (contoh: 62)!")
        process.exit(0)
    }

    // Request pairing code dari server WhatsApp
    setTimeout(async () => {
        let code = await sock.requestPairingCode(phoneNumber)
        code = code?.match(/.{1,4}/g)?.join("-") || code
        console.log(`\n✅ KODE PAIRING KAMU: ${code}\n`)
        console.log('Buka WhatsApp > Perangkat Tertaut > Tautkan Perangkat > Tautkan dengan nomor telepon saja\n')
    }, 3000) // Delay 3 detik agar koneksi socket stabil dulu
  }

  // Simpan kredensial setiap ada perubahan
  sock.ev.on('creds.update', saveCreds)

  // Status Koneksi
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update

    if (connection === 'open') {
      console.log('✅ Berhasil terhubung! Bot siap digunakan.')
    }

    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode
      console.log('⚠️ Koneksi terputus. Reason:', reason)

      // Auto reconnect kecuali jika logout manual
      if (reason === DisconnectReason.loggedOut) {
        console.log('❌ Sesi telah berakhir. Hapus folder session dan login kembali.')
        process.exit(1)
      } else {
        console.log('⏳ Mencoba menyambungkan kembali dalam 5 detik...')
        setTimeout(startBot, 5000)
      }
    }
  })

  // Handler Pesan
  sock.ev.on('messages.upsert', async (m) => {
    try {
      if (!m.messages[0]) return
      await handleMessage(sock, m)
    } catch (e) {
      if (e.message?.includes('Bad MAC')) return
      console.log('❌ Error di handler:', e)
    }
  })
}

// Jalankan Bot
startBot()
