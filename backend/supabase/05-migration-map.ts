// ============================================================
// 🗺️ PETA MIGRASI — GAS V5.0 Action → Supabase Query
//    Untuk frontend: ganti fetch(GAS_URL, ...) → supabase.xxx(...)
// ============================================================

// ═══════════════════════════════════════════════════════════
// SETUP — ganti import di frontend
// ═══════════════════════════════════════════════════════════
// DARI:
//   const GAS_URL = 'https://script.google.com/macros/s/AKfycbxxx/exec'
//   fetch(GAS_URL, { method:'POST', body: JSON.stringify({action, ...}) })
//
// KE:
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(
  'https://xxxxx.supabase.co',
  'eyJhbGciOi...'  // anon key (public)
)

// ═══════════════════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════════════════
// GAS:  GET  ?action=health
// SUPABASE: tidak perlu — kalau client connect, berarti ok

// ═══════════════════════════════════════════════════════════
// AUTH — Verifikasi ID
// ═══════════════════════════════════════════════════════════
// GAS:
//   GET ?action=verifikasiID&id=RL03-006
// SUPABASE:
const { data, error } = await supabase.rpc('verifikasi_id', { p_id: 'RL03-006' })
// → { valid: true, message: 'ID ditemukan: Ahmad', member: {...} }

// ═══════════════════════════════════════════════════════════
// AUTH — Verifikasi PIN
// ═══════════════════════════════════════════════════════════
// GAS:
//   POST { action:'verifikasiPin', id_anggota:'RL03-006', pin:'1234' }
// SUPABASE:
await supabase.rpc('verifikasi_pin', { p_id: 'RL03-006', p_pin: '1234' })

// ═══════════════════════════════════════════════════════════
// AUTH — Login (pakai Supabase Auth built-in)
// ═══════════════════════════════════════════════════════════
// GAS:
//   POST { action:'login', id_anggota:'RL03-006', pin:'1234' }
// SUPABASE (pakai signInWithPassword):
const { data: authData } = await supabase.auth.signInWithPassword({
  email: 'anggota@rt03.id',
  password: pin
})
// lalu baca role dari user_metadata:
// authData.user.user_metadata.role    → 'KETUA'
// authData.user.user_metadata.id_anggota → 'RL03-006'

// ═══════════════════════════════════════════════════════════
// READ — Semua data
// ═══════════════════════════════════════════════════════════
// GAS:
//   GET ?action=read&table=Anggota
//   GET ?action=read&table=Anggota&query=Ahmad
//   GET ?action=read&table=Anggota&id=RL03-006
// SUPABASE:
await supabase.from('anggota').select('*')
await supabase.from('anggota').select('*').or('nama_lengkap.ilike.%Ahmad%,email.ilike.%Ahmad%')
await supabase.from('anggota').select('*').eq('id_anggota', 'RL03-006').single()

// ═══════════════════════════════════════════════════════════
// SEARCH — by field
// ═══════════════════════════════════════════════════════════
// GAS:
//   GET ?action=read&table=Anggota&searchField=Nama_Lengkap&searchValue=Ahmad
// SUPABASE:
await supabase.from('anggota').select('*').ilike('nama_lengkap', '%Ahmad%')

// ═══════════════════════════════════════════════════════════
// CREATE
// ═══════════════════════════════════════════════════════════
// GAS:
//   POST { action:'create', table:'Agenda', data: { nama_kegiatan:'Rapat', ... } }
// SUPABASE:
await supabase.from('agenda').insert({ nama_kegiatan: 'Rapat', tanggal: '2026-08-01', ... }).select()

// ═══════════════════════════════════════════════════════════
// UPDATE
// ═══════════════════════════════════════════════════════════
// GAS:
//   POST { action:'update', table:'Anggota', id:'RL03-006', data: { no_hp:'08123' } }
// SUPABASE:
await supabase.from('anggota').update({ no_hp: '08123' }).eq('id_anggota', 'RL03-006')

// ═══════════════════════════════════════════════════════════
// DELETE (dengan cascade)
// ═══════════════════════════════════════════════════════════
// GAS:
//   POST { action:'delete', table:'Anggota', id:'RL03-006', cascade:true }
// SUPABASE (via RPC karena ada cascade logic):
await supabase.rpc('delete_cascade', { p_id_anggota: 'RL03-006' })
// atau langsung (trigger ON DELETE SET NULL akan jalan otomatis):
await supabase.from('anggota').delete().eq('id_anggota', 'RL03-006')

// ═══════════════════════════════════════════════════════════
// BULK CREATE
// ═══════════════════════════════════════════════════════════
// GAS:
//   POST { action:'bulkCreate', table:'Agenda', rows:[{...},{...}] }
// SUPABASE:
await supabase.from('agenda').insert([{ ... }, { ... }])

// ═══════════════════════════════════════════════════════════
// BULK DELETE
// ═══════════════════════════════════════════════════════════
// GAS:
//   POST { action:'bulkDelete', table:'Agenda', ids:['id1','id2'] }
// SUPABASE:
await supabase.from('agenda').delete().in('id', ['id1', 'id2'])

// ═══════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════
// GAS:
//   GET ?action=dashboard
// SUPABASE:
await supabase.rpc('dashboard_summary')

// ═══════════════════════════════════════════════════════════
// TELEGRAM UPLOAD
// ═══════════════════════════════════════════════════════════
// GAS:
//   POST { action:'telegramUpload', payload: { table:'Galeri', data:{...}, fileInfo:{...} } }
// SUPABASE:
// 1. Upload file ke Storage
const { data: upload } = await supabase.storage.from('media').upload(
  `galeri/${Date.now()}.jpg`, fileBlob
)
// 2. Insert row ke galeri
await supabase.from('galeri').insert({
  judul_kegiatan: '...',
  foto_url: supabase.storage.from('media').getPublicUrl(upload.path).data.publicUrl,
  uploader: currentUserId,
  ...
})

// ═══════════════════════════════════════════════════════════
// CHAT AI
// ═══════════════════════════════════════════════════════════
// GAS:
//   POST { action:'chat', message:'Halo', provider:'gemini' }
// SUPABASE (via Edge Function):
const { data: chatRes } = await supabase.functions.invoke('chat-ai', {
  body: { message: 'Halo', provider: 'gemini' }
})

// ═══════════════════════════════════════════════════════════
// FILE UPLOAD
// ═══════════════════════════════════════════════════════════
// GAS:
//   POST { action:'uploadFile', fileData: base64string, fileName:'...', mimeType:'...' }
// SUPABASE:
await supabase.storage.from('media').upload(`path/${fileName}`, blob)

// ═══════════════════════════════════════════════════════════
// LIKE ASPIRASI (fitur baru — tidak ada di GAS)
// ═══════════════════════════════════════════════════════════
await supabase.rpc('like_aspirasi', { p_aspirasi_id: 'uuid', p_id_anggota: 'RL03-006' })
// → { liked: true, jumlah_dukung: 5 }

// ═══════════════════════════════════════════════════════════
// GLOBAL SEARCH
// ═══════════════════════════════════════════════════════════
await supabase.rpc('search_global', { p_query: 'rapat' })
// → { query: 'rapat', results: [{ table:'agenda', data:{...} }, { table:'pengumuman', data:{...} }] }
