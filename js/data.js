
// ═══════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════
let P=[], E=[], S=[], R=[], C=[]  // C = contas bancárias
let currentUserId = null, currentUserName = ''

async function initApp(){
  document.getElementById('login-screen').style.display='none'
  document.getElementById('app').style.display='block'
  // getSession() (checkSession) lê do localStorage sem rede; getUser() vai à
  // rede. Recarregar quando getUser falha por conexão entraria em loop infinito
  // de reload — por isso a falha vira aviso e volta ao login, sem recarregar.
  const {data:{user}, error:errUser} = await db.auth.getUser()
  if(errUser || !user){
    toast('Não foi possível confirmar seu login. Verifique a conexão e recarregue a página.', 'error', 9000)
    document.getElementById('app').style.display='none'
    document.getElementById('login-screen').style.display='flex'
    return
  }
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

// Busca TODAS as linhas de uma tabela, paginando de 1000 em 1000 (teto por
// requisição do Supabase). Substitui os antigos limit(500)/limit(800): como a
// ordenação é por data desc, as parcelas futuras vinham primeiro e empurravam
// o histórico antigo para fora da janela — o saldo acumulado ficava errado.
// Ordena também por id para paginação estável em datas empatadas/nulas.
// Avança pelo número de linhas REALMENTE recebidas e só para quando a página
// vem vazia. Parar em "recebeu menos de 1000" quebraria silenciosamente se o
// projeto tivesse db-max-rows menor que isso — voltaríamos ao bug do histórico
// truncado, agora sem nenhum .limit() visível para dar a pista.
async function fetchAll(tabela, orderCol){
  const out = []
  let de = 0
  for(;;){
    const {data, error} = await db.from(tabela).select('*')
      .order(orderCol,{ascending:false}).order('id',{ascending:false})
      .range(de, de+999)
    if(error) return {data:out, error}
    const n = data?.length || 0
    if(!n) return {data:out, error:null}
    out.push(...data)
    de += n
  }
}

async function loadData(){
  const [p,e,s,r,c] = await Promise.all([
    fetchAll('contratos','id'),
    fetchAll('entradas','data_pagamento'),
    fetchAll('saidas','data_pagamento'),
    fetchAll('rt_comissoes','data_fechamento'),
    db.from('contas_bancarias').select('*').order('nome',{ascending:true}),
  ])
  // Uma consulta que falha no meio da paginação devolve dados PARCIAIS. Exibir
  // números sobre metade do histórico é pior que exibir nada: um caixa zerado
  // é obviamente suspeito, um caixa 40% menor parece correto. Por isso a
  // atribuição é por consulta — quem falhou mantém o que já estava carregado.
  const falha = [p,e,s,r,c].find(x=>x.error)
  if(falha) toast(friendlyError(falha.error)+' Os números podem estar incompletos — recarregue a página.', 'error', 10000)
  if(!p.error) P=p.data||[]
  if(!e.error) E=e.data||[]
  if(!s.error) S=s.data||[]
  if(!r.error) R=r.data||[]
  if(!c.error) C=c.data||[]
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

// Garante que todos os registros em memória tenham mes_ano normalizado (MM/YYYY),
// guardando o valor ORIGINAL do banco em _mesAnoBanco — é ele que deve ser
// regravado quando um registro sem data_pagamento é editado, senão o lançamento
// pularia para o mês corrente. Não-enumerável de propósito: assim não vaza em
// spread/Object.entries (ex.: no payload de duplicação).
function guardaOriginal(r){
  Object.defineProperty(r, '_mesAnoBanco', {value: r.mes_ano, enumerable: false, configurable: true, writable: true})
  r.mes_ano = normalizaMesAno(r.mes_ano)
}
function normalizaArrays(){
  E.forEach(guardaOriginal)
  S.forEach(guardaOriginal)
}

// mes_ano a gravar no banco ao salvar um lançamento.
// Com data de pagamento, deriva dela. SEM data (registros legados e importados
// costumam ter data nula), PRESERVA o mês original — recalcular jogaria um
// lançamento de 2023 no mês corrente só porque alguém corrigiu a descrição.
// Só cai no mês atual quando é registro novo mesmo.
function mesAnoAoSalvar(data, anterior){
  if(data) return mesAnoDeData(data)
  if(anterior && anterior._mesAnoBanco) return anterior._mesAnoBanco
  if(anterior && anterior.mes_ano) return anterior.mes_ano
  return mesAnoDeData(null)
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

// Um lançamento (entrada/saída) pertence a este contrato?
//
// contrato_id é o vínculo canônico e tem precedência. Sem ele, casa por texto
// usando nome_contrato OU a coluna legada `projeto` — que está preenchida em
// ~99% do histórico (236/238 entradas, 370/389 saídas em ago/2026) e nunca é
// gravada pelo app atual. Ignorar `projeto` perderia o vínculo de quase todo
// o histórico; por isso as duas colunas contam dos dois lados.
//
// As guardas de truthy são essenciais: sem elas, null===null e ''==='' fariam
// lançamentos avulsos serem atribuídos a contratos ao acaso.
// Placeholders como '-' aparecem em registros de 2023 na coluna `projeto`;
// são truthy, mas não identificam contrato nenhum — tratá-los como vazio evita
// que todos eles casem entre si.
const nomeUtil = v => {
  const s = String(v==null?'':v).trim()
  return /^[-—–.\s]*$/.test(s) ? '' : s
}
function doContrato(reg, p){
  if(!reg || !p) return false
  if(reg.contrato_id != null) return reg.contrato_id === p.id
  const nomes = [nomeUtil(p.nome_contrato), nomeUtil(p.projeto)].filter(Boolean)
  if(!nomes.length) return false
  const rNome = nomeUtil(reg.nome_contrato), rProj = nomeUtil(reg.projeto)
  return (!!rNome && nomes.includes(rNome)) || (!!rProj && nomes.includes(rProj))
}

// "A receber" de um contrato = soma das parcelas (entradas) pendentes daquele contrato.
// Fonte única da verdade: em vez do campo a_receber digitado à mão, soma as entradas
// não pagas vinculadas ao contrato. Exclui RT (contabilizada em rt_comissoes).
// A coluna contratos.a_receber é LEGADA: os saldos antigos viraram entradas
// '[Backfill saldo legado]' via docs/migracao-2026-08/04-backfill-a-receber.sql.
function contratoAReceber(p){
  if(!p) return 0
  return E.filter(e =>
      doContrato(e, p)
      && e.status!=='Pago'
      && (e.tipo_entrada||'').toLowerCase()!=='rt')
    .reduce((a,e)=>a+(e.valor||0),0)
}

// Calcula saldo acumulado total de todos os registros pagos
function calcSaldoAcumulado(){
  const totalE = E.filter(e=>e.status==='Pago').reduce((a,e)=>a+(e.valor||0),0)
  const totalS = S.filter(s=>s.status==='Pago').reduce((a,s)=>a+(s.valor||0),0)
  return totalE - totalS
}
