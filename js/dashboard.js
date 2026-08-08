
// ═══════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════
let caixaVisivel = false

function toggleCaixa(){
  caixaVisivel = !caixaVisivel
  const el  = document.getElementById('kpi-caixa-val')
  const eye = document.getElementById('kpi-caixa-eye')
  if(el)  el.textContent  = caixaVisivel ? fmt(calcSaldoAcumulado()) : '••••••'
  if(eye) eye.textContent = caixaVisivel ? '👁' : '👁‍🗨'
}

function renderDashboard(){
  const saldoAtual = calcSaldoAcumulado()
  const {entradas:rec} = calcFluxoMesAtual()
  const rtP = R.filter(r=>r.status==='A receber').reduce((a,r)=>a+(r.a_receber||0),0)
  const ativ = P.filter(p=>p.status==='Ativo').length
  const totalAreceber = P.reduce((a,p)=>a+contratoAReceber(p),0)

  // KPIs
  document.getElementById('dash-kpis').innerHTML = `
    <div class="kpi green" style="cursor:pointer" onclick="openAjusteCaixa()">
      <button class="kpi-eye" id="kpi-caixa-eye" onclick="event.stopPropagation();toggleCaixa()" title="Mostrar/ocultar">👁‍🗨</button>
      <div class="kpi-lbl">Caixa Atual</div>
      <div class="kpi-val" id="kpi-caixa-val">••••••</div>
      <div class="kpi-sub">saldo acumulado · clique p/ ajustar</div>
    </div>
    <div class="kpi amber" onclick="dashDetail('areceber')">
      <div class="kpi-lbl">Projetos a Receber</div><div class="kpi-val">${fmt(totalAreceber)}</div>
      <div class="kpi-sub">todos os contratos</div><div class="kpi-hint">↗ clique p/ ver</div>
    </div>
    <div class="kpi blue" onclick="dashDetail('ativos')">
      <div class="kpi-lbl">Projetos Ativos</div><div class="kpi-val">${ativ}</div>
      <div class="kpi-sub">em andamento</div><div class="kpi-hint">↗ clique p/ ver</div>
    </div>
    <div class="kpi amber" onclick="dashDetail('rt')">
      <div class="kpi-lbl">RT a Receber</div><div class="kpi-val">${fmt(rtP)}</div>
      <div class="kpi-sub">comissões pendentes</div><div class="kpi-hint">↗ clique p/ ver</div>
    </div>`

  // Receita do mês — vive junto do gráfico de fluxo, não como 5º KPI (evita ler R$ 0,00 como anomalia ao lado de números grandes)
  const mesLabel = new Date().toLocaleDateString('pt-BR',{month:'long'})
  document.getElementById('dash-receita-inline').innerHTML = rec > 0
    ? `<div class="kpi-lbl" style="margin-bottom:1px">Receita do mês</div>
       <div style="font-family:'Libre Baskerville',serif;font-size:14px;color:var(--emerald);cursor:pointer" onclick="dashDetail('receita')">${fmt(rec)}</div>`
    : `<div class="kpi-lbl" style="margin-bottom:1px">Receita do mês</div>
       <div style="font-family:'Libre Baskerville',serif;font-size:14px;color:var(--text-muted)">${fmt(rec)}</div>
       <div style="font-size:9px;color:var(--text-muted)">nenhuma entrada paga em ${mesLabel}</div>`

  // Fluxo de Caixa — calculado em tempo real
  const meses6 = calcFluxoMeses(6)
  const maxV = Math.max(...meses6.map(m=>Math.max(m.entradas, m.saidas)), 1)
  const barW=18, padL=36, padB=28, padT=12, h=110
  const totalW = padL + meses6.length*(barW*2+2+16) + 16
  const scaleY = v => padT + (h-padT-padB)*(1-v/maxV)
  const barH   = v => Math.max(0, (h-padT-padB)*(v/maxV))

  let rects='', labels='', gridLines=''
  for(let i=0;i<=4;i++){
    const y = padT+(h-padT-padB)*i/4
    const val = maxV*(1-i/4)
    gridLines += `<line x1="${padL}" y1="${y}" x2="${totalW}" y2="${y}" stroke="#E2DED4" stroke-width="1"/>
      <text x="${padL-4}" y="${y+3}" text-anchor="end" font-size="7" fill="#B6ADA5">${val>=1000?(val/1000).toFixed(1)+'k':val.toFixed(0)}</text>`
  }
  meses6.forEach((m,i)=>{
    const x = padL+8+i*(barW*2+2+16)
    rects  += `<rect x="${x}" y="${scaleY(m.entradas)}" width="${barW}" height="${barH(m.entradas)}" fill="#4A7C59" rx="2"><title>${m.mesAno} Entradas: ${fmt(m.entradas)}</title></rect>`
    rects  += `<rect x="${x+barW+2}" y="${scaleY(m.saidas)}" width="${barW}" height="${barH(m.saidas)}" fill="#D6D2C4" rx="2"><title>${m.mesAno} Saídas: ${fmt(m.saidas)}</title></rect>`
    labels += `<text x="${x+barW}" y="${h-6}" text-anchor="middle" font-size="8" fill="#8C8278">${m.label}</text>`
  })
  document.getElementById('dash-chart-wrap').innerHTML =
    `<svg width="100%" viewBox="0 0 ${totalW} ${h}" style="display:block">${gridLines}<line x1="${padL}" y1="${padT}" x2="${padL}" y2="${h-padB}" stroke="#DDD9D0" stroke-width="1"/>${rects}${labels}</svg>`

  // Projetos a Receber (a_receber = soma das parcelas pendentes)
  const comReceber = P.map(p=>({p, ar:contratoAReceber(p)})).filter(x=>x.ar>0).sort((a,b)=>b.ar-a.ar).slice(0,10)
  document.getElementById('dash-proj-receber').innerHTML = comReceber.length
    ? comReceber.map(({p, ar})=>`<div class="row-item" style="padding:8px 0">
        <div style="min-width:0;flex:1;padding-right:8px">
          <div class="row-name" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(p.nome_contrato)}</div>
          <div class="row-sub">${esc(p.cliente)} · ${badge(p.status)}</div>
        </div>
        <div style="text-align:right;white-space:nowrap">
          <div style="font-family:'Libre Baskerville',serif;font-size:13px;color:var(--amber)">${fmt(ar)}</div>
          ${contaBadge(p.conta)}
        </div>
      </div>`).join('')
    : '<div class="empty" style="padding:24px">Nenhum pendente</div>'

  // RT a Receber
  const rtList = R.filter(r=>r.status==='A receber').slice(0,6)
  const rtTotal = rtList.reduce((a,r)=>a+(r.a_receber||0),0)
  document.getElementById('dash-rt-list').innerHTML = rtList.length
    ? rtList.map(r=>`<div class="row-item" style="padding:7px 0">
        <div style="min-width:0;flex:1;padding-right:6px">
          <div class="row-name" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(r.fornecedor||'—')}</div>
          <div class="row-sub">${esc(r.projeto)}</div>
        </div>
        <div style="text-align:right;white-space:nowrap;font-family:'Libre Baskerville',serif;font-size:12px;color:var(--amber)">${fmt(r.a_receber)}</div>
      </div>`).join('')
      + `<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--cool-gray);display:flex;justify-content:space-between;font-size:11px"><span style="color:var(--warm-gray)">Total</span><strong style="font-family:'Libre Baskerville',serif;color:var(--amber)">${fmt(rtTotal)}</strong></div>`
    : '<div class="empty" style="padding:24px">Nenhuma RT pendente</div>'

  // A Receber por tipo de serviço
  const tiposServico = {}
  P.forEach(p=>{
    const ar = contratoAReceber(p)
    if(ar<=0) return
    const tipo = p.servico || 'Outros'
    if(!tiposServico[tipo]) tiposServico[tipo] = {total:0, projetos:[]}
    tiposServico[tipo].total += ar
    tiposServico[tipo].projetos.push(p)
  })
  // Também agrega RT a receber como categoria
  const rtARec = R.filter(r=>r.status==='A receber').reduce((a,r)=>a+(r.a_receber||0),0)
  if(rtARec>0) tiposServico['RT / Comissões'] = {total:rtARec, projetos:[]}

  const totalGeralRec = Object.values(tiposServico).reduce((a,v)=>a+v.total,0)
  const tiposOrdenados = Object.entries(tiposServico).sort((a,b)=>b[1].total-a[1].total)

  document.getElementById('dash-receber-tipo').innerHTML = tiposOrdenados.length
    ? tiposOrdenados.map(([tipo, {total, projetos}])=>{
        const pct = totalGeralRec > 0 ? (total/totalGeralRec*100) : 0
        return `<div style="padding:10px 0;border-bottom:1px solid var(--cool-gray)">
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px">
            <span style="font-size:11px;font-weight:600;color:var(--preto-soft)">${esc(tipo)}</span>
            <span style="font-family:'Libre Baskerville',serif;font-size:13px;color:var(--amber)">${fmt(total)}</span>
          </div>
          <div style="background:var(--cool-gray);border-radius:2px;height:3px;margin-bottom:4px">
            <div style="background:var(--amber);height:3px;border-radius:2px;width:${pct.toFixed(1)}%"></div>
          </div>
          <div style="font-size:9px;color:var(--warm-gray)">${projetos.length ? projetos.length+' projeto'+(projetos.length>1?'s':'') : 'RT'} · ${pct.toFixed(0)}% do total</div>
        </div>`
      }).join('')
      + `<div style="display:flex;justify-content:space-between;padding:10px 0;font-size:11px">
           <span style="color:var(--warm-gray)">Total geral</span>
           <strong style="font-family:'Libre Baskerville',serif;color:var(--amber)">${fmt(totalGeralRec)}</strong>
         </div>`
    : '<div class="empty" style="padding:20px">Nenhum valor a receber</div>'

  // Custos próximos 30 dias — lista. Janela em dias CHEIOS: sem zerar as horas,
  // depois do meio-dia o vencimento de hoje (parseado como T12:00) saía da lista.
  const hoje = new Date(); hoje.setHours(0,0,0,0)
  const em30 = new Date(); em30.setDate(em30.getDate()+30); em30.setHours(23,59,59,999)
  const custos30 = S.filter(s=>{
    if(!s.data_pagamento) return false
    const d = new Date(s.data_pagamento+'T12:00:00')
    return d>=hoje && d<=em30 && s.status!=='Pago'
  }).sort((a,b)=>a.data_pagamento.localeCompare(b.data_pagamento))
  const totalCustos = custos30.reduce((a,s)=>a+(s.valor||0),0)
  document.getElementById('dash-custos-total').textContent = fmt(totalCustos)
  document.getElementById('dash-custos-30d').innerHTML = custos30.length
    ? custos30.map(s=>`
        <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 18px;border-bottom:1px solid var(--cool-gray)">
          <div style="min-width:0;flex:1;padding-right:12px">
            <div style="font-size:11px;font-weight:600;color:var(--preto-soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(s.descricao||s.tipo_saida)}</div>
            <div style="font-size:9px;color:var(--warm-gray);margin-top:2px">${fmtD(s.data_pagamento)} · ${esc(s.tipo_saida)}${s.socia?' · '+esc(s.socia):''}</div>
          </div>
          <div style="font-family:'Libre Baskerville',serif;font-size:13px;color:var(--red);white-space:nowrap">${fmt(s.valor)}</div>
        </div>`).join('')
    : '<div class="empty" style="padding:20px">Nenhum custo previsto nos próximos 30 dias</div>'

  // A Receber próximos 30 dias — entradas com data_pagamento futura e status A Receber
  const areceber30 = E.filter(e=>{
    if(!e.data_pagamento) return false
    const d = new Date(e.data_pagamento+'T12:00:00')
    return d>=hoje && d<=em30 && e.status!=='Pago'
  }).sort((a,b)=>a.data_pagamento.localeCompare(b.data_pagamento))
  const totalAreceber30 = areceber30.reduce((a,e)=>a+(e.valor||0),0)
  document.getElementById('dash-areceber-total').textContent = fmt(totalAreceber30)
  document.getElementById('dash-areceber-30d').innerHTML = areceber30.length
    ? areceber30.map(e=>`
        <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 18px;border-bottom:1px solid var(--cool-gray)">
          <div style="min-width:0;flex:1;padding-right:12px">
            <div style="font-size:11px;font-weight:600;color:var(--preto-soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(e.nome_contrato||e.cliente||'—')}</div>
            <div style="font-size:9px;color:var(--warm-gray);margin-top:2px">${fmtD(e.data_pagamento)} · ${esc(e.tipo_entrada||'')}${e.conta?' · '+contaBadge(e.conta):''}</div>
          </div>
          <div style="font-family:'Libre Baskerville',serif;font-size:13px;color:var(--emerald);white-space:nowrap">${fmt(e.valor)}</div>
        </div>`).join('')
    : '<div class="empty" style="padding:20px">Nenhum recebimento previsto nos próximos 30 dias</div>'

  checkAjustePendente()
}

// ═══════════════════════════════════════════════
// CONTAS BANCÁRIAS (aba Financeiro)
// ═══════════════════════════════════════════════
function renderContasFinanceiro(){ renderContasPanel() }

function renderContasPanel(){
  const el = document.getElementById('fin-contas-body')
  if(!el) return
  const totalCaixa = C.reduce((a,c)=>a+(c.saldo_atual||0),0)
  el.innerHTML = C.length
    ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;margin-bottom:14px">
        ${C.map(c=>`
          <div style="border:1px solid var(--border);border-radius:3px;padding:14px 16px;position:relative">
            <div style="font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:var(--warm-gray);margin-bottom:4px">${esc(c.tipo||'Conta')}</div>
            <div style="font-size:13px;font-weight:600;color:var(--preto-soft);margin-bottom:6px">${esc(c.nome)}</div>
            <div style="font-family:'Libre Baskerville',serif;font-size:18px;color:var(--emerald)">${fmt(c.saldo_atual||0)}</div>
            ${c.atualizado_em?`<div style="font-size:9px;color:var(--text-muted);margin-top:4px">Atualizado ${fmtD(c.atualizado_em)}</div>`:''}
            <button onclick="editConta(${c.id})" style="position:absolute;top:10px;right:10px;background:none;border:none;font-size:10px;color:var(--warm-gray);cursor:pointer;letter-spacing:.06em">editar</button>
          </div>`).join('')}
        <div style="border:1px dashed var(--border);border-radius:3px;padding:14px 16px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--warm-gray);font-size:11px;letter-spacing:.06em" onclick="openContaModal()">
          + Nova conta
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-top:1px solid var(--cool-gray)">
        <span style="font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--warm-gray)">Total em caixa</span>
        <span style="font-family:'Libre Baskerville',serif;font-size:16px;color:var(--emerald)">${fmt(totalCaixa)}</span>
      </div>`
    : `<div style="text-align:center;padding:32px">
        <div style="font-size:12px;color:var(--warm-gray);margin-bottom:12px">Nenhuma conta cadastrada ainda.</div>
        <button class="btn-primary" onclick="openContaModal()">+ Cadastrar primeira conta</button>
      </div>`
}

function openContaModal(id=null){
  const c = id ? C.find(x=>x.id===id) : null
  const tipos = ['Conta Corrente PJ','Conta Corrente PF','Poupança','Carteira','Outro']
  document.getElementById('modal-content').innerHTML = `
    <h3>${c?'Editar Conta':'Nova Conta Bancária'}</h3><div class="modal-divider"></div>
    <div class="mg">
      ${fld('Nome da Conta','<input id="mc-nome" placeholder="Ex: Nubank PJ, C6 PF…">')}
      ${fld('Tipo',sel('mc-tipo', tipos))}
      ${fld('Saldo Atual (R$)','<input id="mc-saldo" type="number" step="0.01" placeholder="0,00">')}
      ${fld('Data de Referência','<input id="mc-data" type="date">')}
      ${fld('Observação','<input id="mc-obs" placeholder="opcional">')}
    </div>
    <div class="modal-actions">
      ${c?`<button class="btn-delete" onclick="deleteConta(${c.id})">🗑 Apagar</button>`:''}
      <button class="btn-cancel" onclick="closeModal()">Cancelar</button>
      <button class="btn-save" id="modal-save-btn" onclick="saveConta(${c?.id||'null'})">Salvar</button>
    </div>`
  document.getElementById('modal-overlay').classList.add('open')
  if(c) setTimeout(()=>{
    document.getElementById('mc-nome').value = c.nome||''
    document.getElementById('mc-tipo').value = c.tipo||''
    document.getElementById('mc-saldo').value = c.saldo_atual||''
    document.getElementById('mc-data').value = c.atualizado_em||''
    document.getElementById('mc-obs').value = c.obs||''
  },50)
}

function editConta(id){ openContaModal(id) }

async function saveConta(id){
  const payload = {
    nome: document.getElementById('mc-nome').value,
    tipo: document.getElementById('mc-tipo').value,
    saldo_atual: parseFloat(document.getElementById('mc-saldo').value)||0,
    atualizado_em: document.getElementById('mc-data').value||null,
    obs: document.getElementById('mc-obs').value||null,
  }
  const {error} = id
    ? await db.from('contas_bancarias').update(payload).eq('id',id)
    : await db.from('contas_bancarias').insert(payload)
  if(!error){ closeModal(); await loadData(); renderContasPanel(); renderDashboard() }
  else toast(friendlyError(error), 'error', 6000)
}

async function deleteConta(id){
  confirmDialog('Apagar conta?','O saldo e histórico desta conta serão removidos.',async()=>{
    const {error} = await db.from('contas_bancarias').delete().eq('id',id)
    if(!error){ closeModal(); await loadData(); renderContasPanel(); renderDashboard() }
    else toast(friendlyError(error), 'error', 6000)
  })
}
saveConta = travaDuplo(saveConta)

function dashDetail(type){
  const panel = document.getElementById('dash-detail-panel')
  const title = document.getElementById('dash-detail-title')
  const body = document.getElementById('dash-detail-body')
  panel.style.display='block'
  panel.scrollIntoView({behavior:'smooth',block:'start'})

  if(type==='ativos'){
    title.textContent = 'Projetos Ativos'
    const ativos = P.filter(p=>p.status==='Ativo')
    body.innerHTML = `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">${ativos.map(p=>{
      const ar = contratoAReceber(p)
      const pct = p.valor_contrato ? Math.round(((p.valor_contrato-ar)/p.valor_contrato)*100) : 0
      return `<div style="border:1px solid var(--border);border-radius:3px;padding:14px;cursor:pointer" onclick="editItem('projeto',${p.id})">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:12px;font-weight:600">${esc(p.nome_contrato)}</span>${contaBadge(p.conta)}</div>
        <div style="font-size:11px;color:var(--warm-gray);margin-bottom:8px">${esc(p.cliente)}</div>
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px"><span style="color:var(--warm-gray)">A receber</span><span style="font-family:'Libre Baskerville',serif;color:var(--amber)">${fmt(ar)}</span></div>
        <div class="prog"><div class="prog-fill" style="width:${pct}%"></div></div>
        <div style="font-size:9px;color:var(--warm-gray);margin-top:2px">${pct}% recebido · ${esc(p.cidade||'')}</div>
      </div>`}).join('')}</div>`
  } else if(type==='areceber'){
    title.textContent = 'A Receber — Todos os Projetos'
    const com = P.map(p=>({p, ar:contratoAReceber(p)})).filter(x=>x.ar>0).sort((a,b)=>b.ar-a.ar)
    body.innerHTML = `<table style="width:100%;border-collapse:collapse">${com.map(({p, ar})=>`<tr style="border-bottom:1px solid var(--bg)"><td style="padding:9px 0;font-weight:600;font-size:12px">${esc(p.nome_contrato)}</td><td style="color:var(--warm-gray);font-size:11px">${esc(p.cliente)}</td><td>${badge(p.status)}</td><td>${contaBadge(p.conta)}</td><td style="text-align:right;font-family:'Libre Baskerville',serif;color:var(--amber)">${fmt(ar)}</td></tr>`).join('')}</table>`
  } else if(type==='receita'){
    title.textContent = 'Entradas do Mês Atual'
    const mes = mesAtual()
    const entMes = E.filter(e=>e.mes_ano===mes)
    body.innerHTML = entMes.length ? `<table style="width:100%;border-collapse:collapse">${entMes.map(e=>`<tr style="border-bottom:1px solid var(--bg)"><td style="padding:9px 0;font-size:11px;color:var(--warm-gray)">${fmtD(e.data_pagamento)}</td><td style="font-weight:600;font-size:12px">${esc(e.nome_contrato||e.cliente||'—')}</td><td>${badge(e.tipo_entrada||'—')}</td><td>${contaBadge(e.conta)}</td><td style="text-align:right;font-family:'Libre Baskerville',serif;color:var(--emerald)">${fmt(e.valor)}</td></tr>`).join('')}</table>` : '<div class="empty">Sem entradas no mês atual</div>'
  } else if(type==='rt'){
    title.textContent = 'RT a Receber — Detalhado'
    const rtAll = R.filter(r=>r.status==='A receber').sort((a,b)=>(b.a_receber||0)-(a.a_receber||0))
    body.innerHTML = rtAll.length ? `<table style="width:100%;border-collapse:collapse">${rtAll.map(r=>`<tr style="border-bottom:1px solid var(--bg)"><td style="padding:9px 0;font-weight:600;font-size:12px">${esc(r.projeto)}</td><td style="color:var(--warm-gray);font-size:11px">${esc(r.fornecedor||'—')}</td><td>${badge(r.categoria||'—')}</td><td>${contaBadge(r.conta)}</td><td style="text-align:right;font-family:'Libre Baskerville',serif;color:var(--amber)">${fmt(r.a_receber)}</td></tr>`).join('')}</table>` : '<div class="empty">Nenhuma RT pendente</div>'
  } else if(type==='retiradas'){
    title.textContent = 'Retiradas do Mês Atual'
    const mes = mesAtual()
    const ret = S.filter(s=>s.mes_ano===mes&&['retirada de lucros','pró-labore'].includes(s.tipo_saida))
    body.innerHTML = ret.length ? `<table style="width:100%;border-collapse:collapse">${ret.map(s=>`<tr style="border-bottom:1px solid var(--bg)"><td style="padding:9px 0;font-size:11px;color:var(--warm-gray)">${fmtD(s.data_pagamento)}</td><td style="font-weight:600;font-size:12px">${esc(s.descricao)}</td><td>${esc(s.socia||'—')}</td><td style="text-align:right;font-family:'Libre Baskerville',serif;color:var(--red)">${fmt(s.valor)}</td></tr>`).join('')}</table>` : '<div class="empty">Sem retiradas no mês atual</div>'
  }
}
