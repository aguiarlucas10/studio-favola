
// ═══════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════
let P=[], E=[], S=[], R=[], F=[], C=[]  // C = contas bancárias
let currentUserId = null, currentUserName = ''

async function initApp(){
  document.getElementById('login-screen').style.display='none'
  document.getElementById('app').style.display='block'
  const {data:{user}} = await db.auth.getUser()
  if(!user){ location.reload(); return }  // token revogado entre o check e aqui
  const {data:u} = await db.from('usuarios').select('nome').eq('id',user.id).single()
  currentUserId = user.id
  currentUserName = u?.nome||user.email.split('@')[0]
  document.getElementById('user-name').textContent = currentUserName
  document.getElementById('dash-month').textContent = new Date().toLocaleDateString('pt-BR',{month:'long',year:'numeric'})
  document.getElementById('socias-month').textContent = mesAnoLabel(mesAtual())
  await loadData()
  await loadAjustes()
  renderDashboard()
}

async function loadData(){
  const [p,e,s,r,f,c] = await Promise.all([
    db.from('contratos').select('*').order('id',{ascending:false}),
    db.from('entradas').select('*').order('data_pagamento',{ascending:false}).limit(500),
    db.from('saidas').select('*').order('data_pagamento',{ascending:false}).limit(800),
    db.from('rt_comissoes').select('*').order('data_fechamento',{ascending:false}),
    db.from('fluxo_caixa').select('*').order('mes_ano',{ascending:false}).limit(60),
    db.from('contas_bancarias').select('*').order('nome',{ascending:true}),
  ])
  P=p.data||[]; E=e.data||[]; S=s.data||[]; R=r.data||[]; F=f.data||[]; C=c.data||[]
  normalizaArrays()
}

// ═══════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════
function showPage(name){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'))
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'))
  document.getElementById('page-'+name).classList.add('active')
  document.getElementById('nav-'+name).classList.add('active')
  const r={dashboard:renderDashboard,projetos:renderProjetos,financeiro:renderFinanceiro,rt:renderRT,socias:renderSocias}
  r[name]?.()
}

// ═══════════════════════════════════════════════
// DRAWER
// ═══════════════════════════════════════════════
function openDrawer(title, html){
  document.getElementById('drawer-title').textContent = title
  document.getElementById('drawer-body').innerHTML = html
  document.getElementById('drawer-overlay').classList.add('open')
  document.getElementById('drawer').classList.add('open')
}
function closeDrawer(){
  document.getElementById('drawer-overlay').classList.remove('open')
  document.getElementById('drawer').classList.remove('open')
}

// ═══════════════════════════════════════════════
// FLUXO CALCULADO EM TEMPO REAL
// ═══════════════════════════════════════════════

// Normaliza qualquer formato de mes_ano para MM/YYYY
function normalizaMesAno(v){
  if(!v) return ''
  const s = String(v).trim()
  // DD/MM/YYYY (ex: "01/10/2022", "01/1/2023") — formato real do banco
  if(/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)){
    const parts = s.split('/')
    const m = parts[1].padStart(2,'0')
    const y = parts[2]
    return `${m}/${y}`
  }
  // YYYY-MM (ex: "2025-03")
  if(/^\d{4}-\d{2}$/.test(s)){ const [y,m]=s.split('-'); return `${m}/${y}` }
  // YYYY/MM (ex: "2025/03")
  if(/^\d{4}\/\d{2}$/.test(s)){ const [y,m]=s.split('/'); return `${m}/${y}` }
  // MM/YYYY legado (ex: "03/2026") — registros cadastrados antes da correção
  if(/^\d{2}\/\d{4}$/.test(s)){ const [m,y]=s.split('/'); return `${m}/${y}` }
  return s
}

// Garante que todos os registros em memória tenham mes_ano normalizado
function normalizaArrays(){
  E.forEach(e=>{ e.mes_ano=normalizaMesAno(e.mes_ano) })
  S.forEach(s=>{ s.mes_ano=normalizaMesAno(s.mes_ano) })
}

function calcFluxoMeses(nMeses=6){
  const hoje = new Date()
  const meses = []
  for(let i=nMeses-1; i>=0; i--){
    const d = new Date(hoje.getFullYear(), hoje.getMonth()-i, 1)
    const mesAno = `${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
    const entradas = E.filter(e=>e.mes_ano===mesAno && e.status==='Pago').reduce((a,e)=>a+(e.valor||0),0)
    const saidas   = S.filter(s=>s.mes_ano===mesAno && s.status==='Pago').reduce((a,s)=>a+(s.valor||0),0)
    meses.push({mesAno, entradas, saidas, saldo:entradas-saidas, label:d.toLocaleDateString('pt-BR',{month:'short',year:'2-digit'})})
  }
  return meses
}

function calcFluxoMesAtual(){
  const mes = mesAtual()
  const entradas = E.filter(e=>e.mes_ano===mes && e.status==='Pago').reduce((a,e)=>a+(e.valor||0),0)
  const saidas   = S.filter(s=>s.mes_ano===mes && s.status==='Pago').reduce((a,s)=>a+(s.valor||0),0)
  return {entradas, saidas}
}

// "A receber" de um contrato = soma das parcelas (entradas) pendentes daquele contrato.
// Fonte única da verdade: em vez do campo a_receber digitado à mão, soma as entradas
// não pagas vinculadas ao contrato. Exclui RT (contabilizada em rt_comissoes).
// A coluna contratos.a_receber é LEGADA: os saldos antigos viraram entradas
// '[Backfill saldo legado]' via docs/migracao-2026-08.sql (Seção 4).
// Vínculo: contrato_id tem precedência; nome só vale quando a entrada não tem id
// e o nome não é vazio (senão ''==='' e null===null casariam entradas avulsas).
function contratoAReceber(p){
  if(!p) return 0
  return E.filter(e =>
      (e.contrato_id != null
        ? e.contrato_id === p.id
        : (!!e.nome_contrato && e.nome_contrato === p.nome_contrato))
      && e.status!=='Pago'
      && e.tipo_entrada!=='rt')
    .reduce((a,e)=>a+(e.valor||0),0)
}

// Calcula saldo acumulado total de todos os registros pagos
function calcSaldoAcumulado(){
  const totalE = E.filter(e=>e.status==='Pago').reduce((a,e)=>a+(e.valor||0),0)
  const totalS = S.filter(s=>s.status==='Pago').reduce((a,s)=>a+(s.valor||0),0)
  return totalE - totalS
}
