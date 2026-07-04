
// ═══════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════
const SUPABASE_URL = 'https://cvymqbjaxtricwimusld.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2eW1xYmpheHRyaWN3aW11c2xkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODA3ODUsImV4cCI6MjA4ODU1Njc4NX0.GpIfMCxzb9bY3oHVQE7l6O9DBJQuoe1tose_71rwYww'
const { createClient } = supabase
const db = createClient(SUPABASE_URL, SUPABASE_KEY)

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════
const fmt = v => (v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
const fmtD = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—'
const mesAtual = () => { const d=new Date(); return `01/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}` }
const statusMap = { Pago:'bg-green','A Receber':'bg-amber','A Pagar':'bg-amber',Atrasado:'bg-red',Ativo:'bg-green',Finalizado:'bg-gray',Pausado:'bg-amber',Proposta:'bg-blue',Descontinuado:'bg-gray','A receber':'bg-amber','Inadimplência':'bg-red' }
// Escapa texto vindo do banco/CSV antes de inserir via innerHTML (previne XSS)
const esc = v => String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')
const badge = (t,c) => `<span class="badge ${statusMap[t]||c||'bg-gray'}">${esc(t||'—')}</span>`
const contaBadge = c => c==='jurídica'?`<span class="badge bg-blue">PJ</span>`:`<span class="badge bg-oat">PF</span>`
const g = id => document.getElementById(id)?.value
