
// ═══════════════════════════════════════════════
// FINANCEIRO
// ═══════════════════════════════════════════════
let finFilter='entradas'
const finExpandido = new Set()   // grupos de contrato expandidos (A receber)
let finEspelhosVisiveis = false  // bloco de espelhos [TD] recolhido por padrão

// Espelho automático = saída [TD] gerada quando um pagamento cai na conta PF.
// Reconhece também os legados sem colchetes: "TD Contrato X", "TD RT X".
// Usada só para EXIBIR (mover para o bloco recolhível de espelhos); as
// automações que alteram/apagam usam encontraEspelhos(), bem mais restrita.
const isEspelho = s => /^(\[TD\]|TD\s)/i.test((s.descricao||'').trim())
const isPago = r => r.status==='Pago'

function filterFin(f,btn){
  finFilter=f
  document.querySelectorAll('#fin-filter-bar .filter-btn').forEach(b=>b.classList.remove('active'))
  btn.classList.add('active')
  document.getElementById('fin-entradas-wrap').style.display = f==='entradas'?'block':'none'
  document.getElementById('fin-saidas-wrap').style.display   = f==='saidas'?'block':'none'
  document.getElementById('fin-fluxo-wrap').style.display    = f==='fluxo'?'block':'none'
  document.getElementById('fin-contas-wrap').style.display   = f==='contas'?'block':'none'
  if(f==='contas') renderContasFinanceiro()
  else renderFinanceiro()
}

// Expansão dos grupos de parcelas por event delegation com data-attribute.
// (Antes era onclick inline com o nome do contrato interpolado em contexto JS
// — encodeURIComponent não escapa aspas simples, um nome malicioso executava
// código. Como atributo HTML escapado por esc(), o dado é inerte.)
document.getElementById('fin-entradas-wrap')?.addEventListener('click', ev => {
  const tr = ev.target.closest('tr[data-grupo]')
  if(!tr || ev.target.closest('input,button')) return
  const key = tr.dataset.grupo
  if(finExpandido.has(key)) finExpandido.delete(key); else finExpandido.add(key)
  renderFinanceiro()
})
function toggleFinEspelhos(){
  finEspelhosVisiveis = !finEspelhosVisiveis
  renderFinanceiro()
}

// Ordena por data desc (mais recente primeiro)
const porDataDesc = (a,b) => (b.data_pagamento||'').localeCompare(a.data_pagamento||'')
// Ordena por data asc (próximo vencimento primeiro)
const porDataAsc  = (a,b) => (a.data_pagamento||'').localeCompare(b.data_pagamento||'')

// Linha de entrada padrão
function rowEntrada(e, indent){
  return `<tr>
    <td${indent?' style="padding-left:26px"':''}><input type="checkbox" class="cb-row" data-table="entradas" data-id="${e.id}" onchange="onCheckChange()"></td>
    <td class="td-muted">${fmtD(e.data_pagamento)}</td>
    <td class="td-bold">${esc(e.nome_contrato||'—')}</td>
    <td class="td-muted">${esc(e.cliente||'—')}</td>
    <td>${badge(e.tipo_entrada||'—')}</td>
    <td>${contaBadge(e.conta)}</td>
    <td class="td-muted">${esc(e.forma_pagto||'—')}</td>
    <td class="td-money td-green">${fmt(e.valor)}</td>
    <td>${badge(e.status)}</td>
    <td><button class="btn-edit" onclick="editItem('entrada',${e.id})">Editar</button></td>
  </tr>`
}

const thEntradas = `<thead><tr><th></th><th>Data</th><th>Contrato</th><th>Cliente</th><th>Tipo</th><th>Conta</th><th>Forma</th><th>Valor</th><th>Status</th><th></th></tr></thead>`

function tabelaRecebido(rows){
  if(!rows.length) return ''
  const total = rows.reduce((a,e)=>a+(e.valor||0),0)
  const body = rows.sort(porDataDesc).map(e=>rowEntrada(e,false)).join('')
  return painelFin('Recebido', rows.length, total, 'var(--emerald)',
    `<div class="tbl-wrap"><table>${thEntradas}<tbody>${body}</tbody></table></div>`)
}

function tabelaAReceber(rows){
  if(!rows.length) return ''
  const total = rows.reduce((a,e)=>a+(e.valor||0),0)
  // Agrupa por contrato (parcelas do mesmo contrato viram uma linha mestre expansível)
  const grupos = {}
  rows.forEach(e=>{ const k = e.nome_contrato||`__sem__${e.id}`; (grupos[k] ||= []).push(e) })
  // Data mais próxima de cada grupo (menor string ISO), para ordenar por vencimento
  const proxDe = itens => itens.map(x=>x.data_pagamento||'9999').sort()[0]
  let body = ''
  Object.entries(grupos)
    .sort((a,b)=>proxDe(a[1]).localeCompare(proxDe(b[1])))
    .forEach(([key, itens])=>{
      if(itens.length === 1){ body += rowEntrada(itens[0], false); return }
      // Linha mestre do grupo
      const somaG = itens.reduce((a,e)=>a+(e.valor||0),0)
      const prox = itens.map(e=>e.data_pagamento).filter(Boolean).sort()[0]
      const aberto = finExpandido.has(key)
      body += `<tr style="background:var(--bg);cursor:pointer" data-grupo="${esc(key)}">
        <td style="text-align:center;color:var(--warm-gray)">${aberto?'▾':'▸'}</td>
        <td class="td-muted">próx: ${fmtD(prox)}</td>
        <td class="td-bold">${esc(itens[0].nome_contrato)}</td>
        <td class="td-muted">${esc(itens[0].cliente||'—')}</td>
        <td><span class="badge bg-amber">${itens.length} parcelas</span></td>
        <td>${contaBadge(itens[0].conta)}</td>
        <td class="td-muted">—</td>
        <td class="td-money td-amber">${fmt(somaG)}</td>
        <td>${badge('A Receber')}</td>
        <td></td>
      </tr>`
      if(aberto) body += itens.sort(porDataAsc).map(e=>rowEntrada(e,true)).join('')
    })
  return painelFin('A receber', rows.length, total, 'var(--amber)',
    `<div class="tbl-wrap"><table>${thEntradas}<tbody>${body}</tbody></table></div>`)
}

// Linha de saída padrão
function rowSaida(s){
  return `<tr>
    <td><input type="checkbox" class="cb-row" data-table="saidas" data-id="${s.id}" onchange="onCheckChange()"></td>
    <td class="td-muted">${fmtD(s.data_pagamento)}</td>
    <td class="td-bold">${esc(s.descricao||'—')}</td>
    <td>${badge(s.tipo_saida||'—')}</td>
    <td>${s.nome_contrato?`<span style="font-size:10px;color:var(--blue);font-weight:600">${esc(s.nome_contrato)}</span>`:`<span class="td-muted">Geral</span>`}</td>
    <td>${contaBadge(s.conta)}</td>
    <td class="td-muted">${esc(s.socia||'—')}</td>
    <td class="td-money td-red">${fmt(s.valor)}</td>
    <td>${badge(s.status)}</td>
    <td><button class="btn-edit" onclick="editItem('saida',${s.id})">Editar</button></td>
  </tr>`
}
const thSaidas = `<thead><tr><th></th><th>Data</th><th>Descrição</th><th>Tipo</th><th>Vínculo</th><th>Conta</th><th>Sócia</th><th>Valor</th><th>Status</th><th></th></tr></thead>`

function tabelaSaidas(titulo, rows, cor){
  if(!rows.length) return ''
  const total = rows.reduce((a,s)=>a+(s.valor||0),0)
  const body = rows.sort(porDataDesc).map(rowSaida).join('')
  return painelFin(titulo, rows.length, total, cor,
    `<div class="tbl-wrap"><table>${thSaidas}<tbody>${body}</tbody></table></div>`)
}

// Wrapper de painel com título + contagem + total no cabeçalho
function painelFin(titulo, n, total, cor, inner){
  return `<div class="panel" style="margin-bottom:14px">
    <div class="panel-hd">
      <span class="panel-title">${titulo}</span>
      <span style="font-size:11px;color:var(--warm-gray)">${n} ${n===1?'lançamento':'lançamentos'} · <strong style="font-family:'Libre Baskerville',serif;color:${cor}">${fmt(total)}</strong></span>
    </div>
    ${inner}
  </div>`
}

function renderFinanceiro(){
  // Popula o seletor de meses com todos os meses disponíveis
  const sel = document.getElementById('fin-mes-filtro')
  const mesSelecionado = sel ? sel.value : ''
  if(sel && sel.options.length <= 1){
    const todosMesesDisp = [...new Set([...E, ...S].map(r=>r.mes_ano).filter(Boolean))]
      .sort((a,b)=>{ const [ma,ya]=a.split('/').map(Number); const [mb,yb]=b.split('/').map(Number); return (yb-ya)||(mb-ma) })
    todosMesesDisp.forEach(m=>{
      const [mm,yy] = m.split('/')
      const label = new Date(yy, mm-1, 1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'})
      const opt = document.createElement('option')
      opt.value = m; opt.textContent = label
      sel.appendChild(opt)
    })
  }

  const Ef = mesSelecionado ? E.filter(e=>e.mes_ano===mesSelecionado) : E
  const Sf = mesSelecionado ? S.filter(s=>s.mes_ano===mesSelecionado) : S

  // ENTRADAS — A receber (previsto) primeiro, Recebido (realizado) depois
  const recebido  = Ef.filter(isPago)
  const aReceber  = Ef.filter(e=>!isPago(e))
  const entradasHTML = (tabelaAReceber(aReceber) + tabelaRecebido(recebido))
    || '<div class="empty">Nenhuma entrada</div>'
  document.getElementById('fin-entradas-wrap').innerHTML = entradasHTML

  // SAÍDAS — separa espelhos automáticos [TD] das saídas de verdade
  const saidasReais = Sf.filter(s=>!isEspelho(s))
  const espelhos    = Sf.filter(isEspelho)
  const pagas    = saidasReais.filter(isPago)
  const aPagar   = saidasReais.filter(s=>!isPago(s))
  let saidasHTML = (tabelaSaidas('A pagar', aPagar, 'var(--amber)') + tabelaSaidas('Pago', pagas, 'var(--red)'))
    || '<div class="empty">Nenhuma saída</div>'
  if(espelhos.length){
    const totalEsp = espelhos.reduce((a,s)=>a+(s.valor||0),0)
    saidasHTML += `<div class="panel" style="margin-bottom:14px">
      <div class="panel-hd" style="cursor:pointer" onclick="toggleFinEspelhos()">
        <span class="panel-title">${finEspelhosVisiveis?'▾':'▸'} Espelhos automáticos <span style="font-weight:400;color:var(--warm-gray);font-size:11px">(retiradas [TD] geradas por pagamentos na conta PF)</span></span>
        <span style="font-size:11px;color:var(--warm-gray)">${espelhos.length} · <strong style="font-family:'Libre Baskerville',serif">${fmt(totalEsp)}</strong></span>
      </div>
      ${finEspelhosVisiveis ? `<div class="tbl-wrap"><table>${thSaidas}<tbody>${espelhos.sort(porDataDesc).map(rowSaida).join('')}</tbody></table></div>` : ''}
    </div>`
  }
  document.getElementById('fin-saidas-wrap').innerHTML = saidasHTML

  renderFluxoMensal()
}

function renderFluxoMensal(){
  const hoje = new Date()
  const mesAtualNum = hoje.getFullYear() * 100 + (hoje.getMonth() + 1)
  const todosMeses = [...new Set([...E, ...S].map(r=>r.mes_ano).filter(Boolean))]
    .filter(m => {
      const parts = m.split('/')
      if(parts.length !== 2) return false
      const mm = parseInt(parts[0]), yy = parseInt(parts[1])
      if(isNaN(mm)||isNaN(yy)||mm<1||mm>12||yy<2000||yy>2100) return false
      return yy * 100 + mm <= mesAtualNum
    })
    .sort((a,b)=>{ const [ma,ya]=a.split('/').map(Number); const [mb,yb]=b.split('/').map(Number); return (yb-ya)||(mb-ma) })

  const mesAtualVal = mesAtual()
  if(!todosMeses.includes(mesAtualVal)) todosMeses.unshift(mesAtualVal)

  const mesesCronologicos = [...todosMeses].reverse()
  let saldoAcum = 0
  const fluxoPorMes = {}
  mesesCronologicos.forEach(mesAno => {
    const entradas = E.filter(e=>e.mes_ano===mesAno && e.status==='Pago').reduce((a,e)=>a+(e.valor||0),0)
    const saidas   = S.filter(s=>s.mes_ano===mesAno && s.status==='Pago').reduce((a,s)=>a+(s.valor||0),0)
    const fl = entradas - saidas
    saldoAcum += fl
    fluxoPorMes[mesAno] = { entradas, saidas, fl, saldoAcum }
  })

  document.getElementById('fin-fluxo-tbody').innerHTML = todosMeses.map(mesAno=>{
    const parts = mesAno.split('/')
    const mm = parseInt(parts[0]) - 1
    const yyyy = parseInt(parts[1])
    const label = new Date(yyyy, mm, 1).toLocaleDateString('pt-BR',{month:'short',year:'numeric'})
    const { entradas, saidas, fl, saldoAcum: sa } = fluxoPorMes[mesAno] || {entradas:0,saidas:0,fl:0,saldoAcum:0}
    const porSocia = fl / 2
    return `<tr>
      <td class="td-bold">${label}</td>
      <td class="td-money td-green">${fmt(entradas)}</td>
      <td class="td-money td-red">${fmt(saidas)}</td>
      <td class="td-money ${fl>=0?'td-green':'td-red'}">${fl>=0?'+':''}${fmt(fl)}</td>
      <td class="td-money ${sa>=0?'td-green':'td-red'}" style="font-weight:600">${fmt(sa)}</td>
      <td class="td-money ${porSocia>=0?'':'td-red'}" style="color:var(--warm-gray)">${porSocia>=0?'+':''}${fmt(porSocia)}</td>
    </tr>`
  }).join('') || '<tr><td colspan="6" class="empty">Nenhum dado</td></tr>'
}
