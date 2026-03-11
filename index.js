const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  jidDecode,
  makeInMemoryStore,
  PHONENUMBER_MCC
} = require('@whiskeysockets/baileys')

const fs = require('fs')
const Pino = require('pino')
const readline = require('readline')
const { handleMessage } = require('./lib/handler')

const store = makeInMemoryStore({ logger: Pino().child({ level: 'silent', stream: 'store' }) })
global.conns = []

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (text) => new Promise((resolve) => rl.question(text, resolve))

const ownerNumber = "62882008519349@s.whatsapp.net"

async function startKeqing() {
  const { state, saveCreds } = await useMultiFileAuthState('./session')
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, Pino({ level: 'silent' })),
    },
    version,
    logger: Pino({ level: 'silent' }),
    browser: ["Ubuntu", "Chrome", "20.0.04"],
    printQRInTerminal: false,
    patchMessageBeforeSending: (message) => {
        const requiresPatch = !!(message.buttonsMessage || message.templateMessage || message.listMessage);
        if (requiresPatch) {
            message = { viewOnceMessage: { message: { messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 }, ...message } } };
        }
        return message;
    }
  })

  store.bind(sock.ev)

  if (!sock.authState.creds.registered) {
    console.clear()
    let phoneNumber = await question('Masukkan Nomor WhatsApp (628xxx): ')
    phoneNumber = phoneNumber.replace(/[^0-9]/g, '')

    if (!Object.keys(PHONENUMBER_MCC).some(v => phoneNumber.startsWith(v))) {
        process.exit(0)
    }

    setTimeout(async () => {
      let code = await sock.requestPairingCode(phoneNumber)
      code = code?.match(/.{1,4}/g)?.join("-") || code
      console.log(`KODE PAIRING: ${code}`)
    }, 3000)
  }

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update
    if (connection === 'open') {
      await sock.sendMessage(ownerNumber, { text: `Keqing Bot Aktif\nOwner: @62882008519349`, mentions: [ownerNumber] })
    }
    if (connection === 'close') {
      let reason = lastDisconnect?.error?.output?.statusCode
      if (reason !== DisconnectReason.loggedOut) {
        startKeqing()
      }
    }
  })

  sock.ev.on('messages.upsert', async (chatUpdate) => {
    try {
      const m = chatUpdate.messages[0]
      if (!m.message) return
      
      const from = m.key.remoteJid
      const msg = (m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || "").trim()
      const isCmd = msg.startsWith('.')
      const command = isCmd ? msg.slice(1).toLowerCase().split(' ')[0] : ''

      await handleMessage(sock, chatUpdate, store)

      if (command === 'menu') {
        const menuHeader = `⚡ *KEQING MULTI-DEVICE* ⚡

╔═══『 *USER INFO* 』
║ 👤 Owner: @62882008519349
║ 🛠️ Engine: Baileys v5
╚══════════════════

*––『 CLONE SYSTEM 』––*
1. .jadibot
2. .stopjadibot
3. .listjadibot

*––『 DOWNLOADER 』––*
4. .tiktok
5. .igdl
6. .ytmp3
7. .ytmp4
8. .fbdown
9. .twitter
10. .gitclone

*––『 TOOLS & AI 』––*
11. .ai
12. .brat
13. .sticker
14. .remini
15. .ocr
16. .nulis
17. .translate
18. .kalkulator

*––『 GROUP MENU 』––*
19. .kick
20. .add
21. .hidetag
22. .group (open/close)
23. .setppgc
24. .setname
25. .linkgc

*––『 OWNER ONLY 』––*
26. .self
27. .public
28. .bc
29. .eval
30. .shutdown

_Tag Dev: @62882008519349_`

        await sock.sendMessage(from, { 
            text: menuHeader, 
            mentions: ["62882008519349@s.whatsapp.net"] 
        }, { quoted: m })
      }

    } catch (err) {
      console.log(err)
    }
  })

  return sock
}

startKeqing()
