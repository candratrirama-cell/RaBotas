const { exec } = require('child_process')
const os = require('os')
const fs = require('fs')

async function handleMessage(sock, chatUpdate, store) {
    try {
        const m = chatUpdate.messages[0]
        if (!m.message || m.key.fromMe) return
        
        const from = m.key.remoteJid
        const type = Object.keys(m.message)[0]
        const content = JSON.stringify(m.message)
        const msg = (type === 'conversation') ? m.message.conversation : (type === 'extendedTextMessage') ? m.message.extendedTextMessage.text : (type === 'imageMessage') ? m.message.imageMessage.caption : ''
        
        const isCmd = msg.startsWith('.')
        const command = isCmd ? msg.slice(1).toLowerCase().split(' ')[0] : ''
        const args = msg.trim().split(/ +/).slice(1)
        const text = args.join(" ")
        const isOwner = ["62882008519349@s.whatsapp.net"].includes(m.key.remoteJid) || m.key.fromMe

        const reply = (teks) => {
            sock.sendMessage(from, { text: teks }, { quoted: m })
        }

        switch (command) {
            case 'jadibot':
                reply("Fitur Jadibot sedang memproses sesi baru... Silakan tunggu instruksi selanjutnya di private chat.")
                break
            case 'stopjadibot':
                reply("Sesi bot dihentikan.")
                break
            case 'listjadibot':
                reply(`Total bot aktif: ${global.conns.length}`)
                break
            case 'tiktok':
            case 'igdl':
            case 'fbdown':
            case 'twitter':
            case 'ytmp3':
            case 'ytmp4':
                if (!text) return reply(`Masukkan link yang ingin di download!`)
                reply(`Sedang mengunduh media dari: ${text}`)
                break
            case 'gitclone':
                if (!text) return reply(`Masukkan link github!`)
                reply(`Cloning repository...`)
                break
            case 'ai':
                if (!text) return reply(`Mau tanya apa?`)
                reply(`Keqing sedang berpikir...`)
                break
            case 'brat':
            case 'sticker':
            case 's':
                reply(`Kirim/balas gambar dengan caption ${command}`)
                break
            case 'remini':
                reply(`Mempertajam resolusi gambar...`)
                break
            case 'ocr':
                reply(`Membaca teks pada gambar...`)
                break
            case 'nulis':
                if (!text) return reply(`Masukkan teks yang ingin ditulis!`)
                reply(`Tunggu sebentar, sedang menulis...`)
                break
            case 'translate':
                reply(`Fitur translate aktif.`)
                break
            case 'kalkulator':
                if (!text) return reply(`Masukkan angka!`)
                try { reply(`Hasil: ${eval(text)}`) } catch { reply("Error perhitungan") }
                break
            case 'kick':
                if (!isOwner) return
                sock.groupParticipantsUpdate(from, [m.message.extendedTextMessage.contextInfo.participant], "remove")
                break
            case 'add':
                if (!isOwner) return
                reply(`Menambahkan user...`)
                break
            case 'hidetag':
                if (!isOwner) return
                const groupMetadata = await sock.groupMetadata(from)
                sock.sendMessage(from, { text: text, mentions: groupMetadata.participants.map(a => a.id) })
                break
            case 'group':
                if (!isOwner) return
                if (args[0] === 'open') await sock.groupSettingUpdate(from, 'not_announcement')
                else if (args[0] === 'close') await sock.groupSettingUpdate(from, 'announcement')
                break
            case 'setppgc':
                reply(`Update foto profil grup...`)
                break
            case 'setname':
                if (!text) return reply(`Masukkan nama baru!`)
                await sock.groupUpdateSubject(from, text)
                break
            case 'linkgc':
                const code = await sock.groupInviteCode(from)
                reply(`https://chat.whatsapp.com/${code}`)
                break
            case 'self':
                if (!isOwner) return
                sock.public = false
                reply(`Mode Self Aktif`)
                break
            case 'public':
                if (!isOwner) return
                sock.public = true
                reply(`Mode Public Aktif`)
                break
            case 'bc':
                if (!isOwner) return
                reply(`Menyebarkan pesan broadcast...`)
                break
            case 'eval':
                if (!isOwner) return
                try {
                    let evaled = await eval(text)
                    reply(require('util').format(evaled))
                } catch (e) { reply(String(e)) }
                break
            case 'shutdown':
                if (!isOwner) return
                await reply(`Mematikan sistem...`)
                process.exit()
                break
            case 'ping':
                const used = process.memoryUsage().heapUsed / 1024 / 1024
                reply(`*Speed:* ${Date.now() - m.messageTimestamp * 1000}ms\n*RAM:* ${used.toFixed(2)}MB`)
                break
        }
    } catch (err) {
        console.log(err)
    }
}

module.exports = { handleMessage }
