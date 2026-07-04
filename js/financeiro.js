
// ═══════════════════════════════════════════════
// FINANCEIRO
// ═══════════════════════════════════════════════
let finFilter='Todos'
function filterFin(f,btn){
  finFilter=f
  document.querySelectorAll('#fin-filter-bar .filter-btn').forEach(b=>b.classList.remove('active'))
  btn.classList.add('active')
  const showE = f==='Todos'||f==='entradas'
  const showS = f==='Todos'||f==='saidas'
  const showF = f==='fluxo'
  const showC = f==='contas'
  document.getElementById('fin-entradas-wrap').style.display=showE?'block':'none'
  document.getElementById('fin-saidas-wrap').style.display=showS?'block':'none'
  document.getElementById('fin-fluxo-wrap').style.display=showF?'block':'none'
  document.getElementById('fin-contas-wrap').style.display=showC?'block':'none'
  if(showC) renderContasFinanceiro()
}

function renderFinanceiro(){
  // Popula o seletor de meses com todos os meses disponíveis
  const sel = document.getElementById('fin-mes-filtro')
  const mesSelecionado = sel ? sel.value : ''
  const todosMesesDisp = [...new Set([...E, ...S].map(r=>r.mes_ano).filter(Boolean))]
    .sort((a,b)=>{ const [ma,ya]=a.split('/').map(Number); const [mb,yb]=b.split('/').map(Number); return (yb-ya)||(mb-ma) })
  if(sel && sel.options.length <= 1){
    todosMesesDisp.forEach(m=>{
      const [mm,yy] = m.split('/')
      const label = new Date(yy, mm-1, 1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'})
      const opt = document.createElement('option')
      opt.value = m; opt.textContent = label
      sel.appendChild(opt)
    })
  }

  // Filtra E e S pelo mês selecionado (se houver)
  const Ef = mesSelecionado ? E.filter(e=>e.mes_ano===mesSelecionado) : E
  const Sf = mesSelecionado ? S.filter(s=>s.mes_ano===mesSelecionado) : S

  document.getElementById('fin-entradas-tbody').innerHTML = Ef.map(e=>`<tr>
    <td><input type="checkbox" class="cb-row" data-table="entradas" data-id="${e.id}" onchange="onCheckChange()"></td>
    <td class="td-muted">${fmtD(e.data_pagamento)}</td>
    <td class="td-bold">${esc(e.nome_contrato||'—')}</td>
    <td class="td-muted">${esc(e.cliente||'—')}</td>
    <td>${badge(e.tipo_entrada||'—')}</td>
    <td>${contaBadge(e.conta)}</td>
    <td class="td-muted">${esc(e.forma_pagto||'—')}</td>
    <td class="td-money td-green">${fmt(e.valor)}</td>
    <td>${badge(e.status)}</td>
    <td><button class="btn-edit" onclick="editItem('entrada',${e.id})">Editar</button></td>
  </tr>`).join('') || '<tr><td colspan="10" class="empty">Nenhuma entrada</td></tr>'

  document.getElementById('fin-saidas-tbody').innerHTML = Sf.map(s=>`<tr>
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
  </tr>`).join('') || '<tr><td colspan="10" class="empty">Nenhuma saída</td></tr>'

  // Fluxo mensal — apenas meses válidos até o mês atual
  const hoje = new Date()
  const mesAtualNum = hoje.getFullYear() * 100 + (hoje.getMonth() + 1)  // ex: 202603

  const todosMeses = [...new Set([...E, ...S].map(r=>r.mes_ano).filter(Boolean))]
    .filter(m => {
      const parts = m.split('/')
      if(parts.length !== 2) return false
      const mm = parseInt(parts[0]), yy = parseInt(parts[1])
      if(isNaN(mm)||isNaN(yy)||mm<1||mm>12||yy<2000||yy>2100) return false
      return yy * 100 + mm <= mesAtualNum  // remove meses futuros
    })
    .sort((a,b)=>{
      const [ma,ya] = a.split('/').map(Number)
      const [mb,yb] = b.split('/').map(Number)
      return (yb-ya)||(mb-ma)
    })

  // Garante mês atual mesmo sem dados
  const mesAtualVal = mesAtual()
  if(!todosMeses.includes(mesAtualVal)) todosMeses.unshift(mesAtualVal)

  // Calcula fluxo de cada mês (ordem cronológica para acumular)
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
