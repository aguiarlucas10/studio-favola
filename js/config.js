
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
// Chave canônica do mês corrente no formato em memória (MM/YYYY, pós-normalizaMesAno).
// Toda comparação com e.mes_ano/s.mes_ano usa esta chave.
const mesAtual = () => { const d=new Date(); return `${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}` }
// Rótulo de exibição de uma chave MM/YYYY: "agosto de 2026"
const mesAnoLabel = mesAno => {
  const [m,y] = String(mesAno||'').split('/').map(Number)
  if(!m || !y) return String(mesAno||'')
  return new Date(y, m-1, 1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'})
}
// Deriva o mes_ano GRAVADO NO BANCO (formato legado 01/MM/YYYY) a partir de uma
// data ISO (YYYY-MM-DD). Cai no mês atual se a data for inválida/vazia.
const mesAnoDeData = d => {
  if(d && /^\d{4}-\d{2}-\d{2}/.test(d)){ const [y,m]=d.split('-'); return `01/${m}/${y}` }
  const h = new Date()
  return `01/${String(h.getMonth()+1).padStart(2,'0')}/${h.getFullYear()}`
}
const statusMap = { Pago:'bg-green','A Receber':'bg-amber','A Pagar':'bg-amber',Atrasado:'bg-red',Ativo:'bg-green',Finalizado:'bg-gray',Pausado:'bg-amber',Proposta:'bg-blue',Descontinuado:'bg-gray','A receber':'bg-amber','Inadimplência':'bg-red' }
// Escapa texto vindo do banco/CSV antes de inserir via innerHTML (previne XSS)
const esc = v => String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')
const badge = (t,c) => `<span class="badge ${statusMap[t]||c||'bg-gray'}">${esc(t||'—')}</span>`
const contaBadge = c => c==='jurídica'?`<span class="badge bg-blue">PJ</span>`:`<span class="badge bg-oat">PF</span>`
const g = id => document.getElementById(id)?.value

// Feedback flutuante on-brand (substitui alert() nativo)
function toast(msg, type='info', ms=4500){
  const fb = document.createElement('div')
  fb.className = `toast toast-${type}`
  fb.textContent = msg
  document.body.appendChild(fb)
  setTimeout(()=>fb.remove(), ms)
}

// Traduz erros crus do Supabase/Postgres para mensagens que a sócia entende
function friendlyError(error){
  const raw = error?.message || String(error||'')
  const map = [
    [/row-level security/i, 'Você não tem permissão para fazer isso. Confirme que está logada com a conta certa.'],
    [/jwt|session|not authenticated/i, 'Sua sessão expirou. Atualize a página e faça login novamente.'],
    [/duplicate key|already exists/i, 'Já existe um registro com esses dados.'],
    [/foreign key|violates foreign/i, 'Não foi possível salvar: um registro relacionado não foi encontrado (ex: contrato apagado).'],
    [/network|fetch|failed to fetch/i, 'Falha de conexão. Verifique sua internet e tente novamente.'],
    [/null value in column/i, 'Faltou preencher um campo obrigatório.'],
  ]
  for(const [re,msg] of map) if(re.test(raw)) return msg
  return 'Não foi possível concluir a ação. Tente novamente em instantes.'
}
