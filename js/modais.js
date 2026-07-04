
// ═══════════════════════════════════════════════
// EDIT ITEM — carrega dados e abre modal preenchido
// ═══════════════════════════════════════════════
async function editItem(type, id){
  if(type==='projeto'){
    const p = P.find(x=>x.id===id); if(!p) return
    openModal('projeto', p)
  } else if(type==='entrada'){
    const e = E.find(x=>x.id===id); if(!e) return
    openModal('entrada', e)
  } else if(type==='saida'){
    const s = S.find(x=>x.id===id); if(!s) return
    openModal('saida', s)
  } else if(type==='rt'){
    const r = R.find(x=>x.id===id); if(!r) return
    openModal('rt', r)
  }
}

// ═══════════════════════════════════════════════
// MODALS
// ═══════════════════════════════════════════════
function openModal(type, data=null){
  const map={projeto:mProjeto,entrada:mEntrada,saida:mSaida,rt:mRT,retirada:mRetirada}
  document.getElementById('modal-content').innerHTML = map[type]?.(data)||''
  document.getElementById('modal-overlay').classList.add('open')
  if(data) setTimeout(()=>{ preenchModal(type,data); if(type==='entrada') togglePFNotice(); if(type==='rt') toggleRTNotice() },50)
  else if(type==='entrada') setTimeout(togglePFNotice, 50)
  else if(type==='rt') setTimeout(toggleRTNotice, 50)
}
function closeModal(){document.getElementById('modal-overlay').classList.remove('open')}

function preenchModal(type, data){
  const set = (id,v) => { const el=document.getElementById(id); if(el&&v!=null) el.value=v; }
  if(type==='projeto'){
    set('m-num',data.numero); set('m-nome',data.nome_contrato); set('m-cliente',data.cliente)
    set('m-contato',data.contato); set('m-tipologia',data.tipologia); set('m-servico',data.servico)
    set('m-valor',data.valor_contrato); set('m-parcelas',data.parcelas); set('m-conta',data.conta)
    set('m-areceber',data.a_receber); set('m-status',data.status); set('m-inicio',data.data_inicio)
    set('m-fim',data.data_fim); set('m-cidade',data.cidade); set('m-uf',data.uf)
    set('m-origem',data.origem); set('m-m2',data.metros_quadrados); set('m-obs',data.obs)
    const btn=document.getElementById('modal-save-btn')
    if(btn) btn.onclick=()=>saveProjeto(data.id)
  } else if(type==='entrada'){
    set('m-cont',data.nome_contrato)
    set('m-tipo',data.tipo_entrada)
    set('m-valor',data.valor); set('m-data',data.data_pagamento); set('m-conta',data.conta)
    set('m-forma',data.forma_pagto); set('m-status',data.status); set('m-mes',data.mes_ano); set('m-obs',data.obs)
    const btn=document.getElementById('modal-save-btn')
    if(btn) btn.onclick=()=>saveEntrada(data.id)
  } else if(type==='saida'){
    set('m-tipo',data.tipo_saida); set('m-desc',data.descricao); set('m-valor',data.valor)
    set('m-data',data.data_pagamento); set('m-conta',data.conta); set('m-socia',data.socia)
    set('m-status',data.status); set('m-mes',data.mes_ano)
    // Set vínculo
    if(data.contrato_id){
      const el = document.getElementById('m-vinculo')
      if(el){ const opt = [...el.options].find(o=>o.value.startsWith(data.contrato_id+'|')); if(opt) el.value=opt.value }
    }
    const btn=document.getElementById('modal-save-btn')
    if(btn) btn.onclick=()=>saveSaida(data.id)
  } else if(type==='rt'){
    set('m-proj',data.projeto); set('m-cat',data.categoria); set('m-forn',data.fornecedor)
    set('m-contato',data.contato_fornecedor); set('m-venda',data.valor_venda)
    set('m-pct',data.percentual_rt); set('m-valor',data.valor_rt); set('m-areceber',data.a_receber)
    set('m-data',data.data_fechamento); set('m-conta',data.conta); set('m-status',data.status)
    const btn=document.getElementById('modal-save-btn')
    if(btn) btn.onclick=()=>saveRT(data.id)
  }
}

function fld(label,html,full){return `<div class="field${full?' full':''}""><label>${label}</label>${html}</div>`}
function sel(id,opts,cur=''){return `<select id="${id}">${opts.map(o=>{const v=typeof o==='string'?o:o.v,l=typeof o==='string'?o:o.l;return`<option value="${v}"${v===cur?' selected':''}>${l}</option>`}).join('')}</select>`}
function togglePFNotice(){
  const conta = document.getElementById('m-conta')?.value
  const notice = document.getElementById('pf-notice')
  if(notice) notice.style.display = (conta==='pessoal'||conta==='PF') ? 'block' : 'none'
}
function toggleRTNotice(){
  const conta = document.getElementById('m-conta')?.value
  const status = document.getElementById('m-status')?.value
  const notice = document.getElementById('rt-pf-notice')
  if(notice) notice.style.display = ((conta==='pessoal'||conta==='PF') && status==='Pago') ? 'block' : 'none'
}

function mProjeto(d=null){
  return `<h3>${d?'Editar Projeto':'Novo Projeto'}</h3><div class="modal-divider"></div>
  <div class="mg">
    ${fld('Nº','<input id="m-num" type="number">')}
    ${fld('Nome do Contrato','<input id="m-nome" placeholder="Ex: Ap Maria e Guilherme">')}
    ${fld('Cliente','<input id="m-cliente">')}
    ${fld('Contato','<input id="m-contato">')}
    ${fld('Tipologia',sel('m-tipologia',['Interiores','Arquitetônico','Comercial','Arq + Int']))}
    ${fld('Serviço',sel('m-servico',['Projeto','Consultoria','Detalhamento','Acompanhamento']))}
    ${fld('Valor do Contrato (R$)','<input id="m-valor" type="number" step="0.01">')}
    ${fld('A Receber (R$)','<input id="m-areceber" type="number" step="0.01">')}
    ${fld('Parcelas','<input id="m-parcelas" type="number" value="1">')}
    ${fld('Conta',sel('m-conta',[{v:'pessoal',l:'PF (pessoal)'},{v:'jurídica',l:'PJ (jurídica)'}]))}
    ${fld('Status',sel('m-status',['Ativo','Proposta','Pausado','Finalizado','Descontinuado']))}
    ${fld('Data Início','<input id="m-inicio" type="date">')}
    ${fld('Data Fim','<input id="m-fim" type="date">')}
    ${fld('Cidade','<input id="m-cidade">')}
    ${fld('UF','<input id="m-uf" maxlength="2">')}
    ${fld('Origem',sel('m-origem',['Indicação','Family & friends','Contato comercial']))}
    ${fld('M²','<input id="m-m2">')}
  </div>
  ${fld('Observações','<textarea id="m-obs" rows="2"></textarea>',true)}
  <div class="modal-actions">
    ${d?`<button class="btn-delete" onclick="deleteItem('projeto',${d.id})">🗑 Apagar</button>`:''}
    <button class="btn-cancel" onclick="closeModal()">Cancelar</button>
    <button class="btn-save" id="modal-save-btn" onclick="saveProjeto(null)">Salvar</button>
  </div>`
}

function mEntrada(d=null){
  const opts = P.map(p=>`<option value="${esc(p.nome_contrato)}">${esc(p.nome_contrato)}</option>`).join('')
  return `<h3>${d?'Editar Entrada':'Nova Entrada'}</h3><div class="modal-divider"></div>
  <div class="mg">
    ${fld('Contrato',`<select id="m-cont"><option value="">— Selecione —</option>${opts}</select>`)}
    ${fld('Tipo',sel('m-tipo',[{v:'projeto',l:'Projeto'},{v:'rt',l:'RT/Comissão'}]))}
    ${fld('Valor (R$)','<input id="m-valor" type="number" step="0.01">')}
    ${fld('Data Pagamento','<input id="m-data" type="date">')}
    ${fld('Conta',`<select id="m-conta" onchange="togglePFNotice()"><option value="pessoal">PF (pessoal)</option><option value="jurídica">PJ (jurídica)</option></select>`)}
    ${fld('Forma Pagamento',sel('m-forma',['PIX','TED','Boleto','Cartão']))}
    ${fld('Status',sel('m-status',['Pago','A Receber','Atrasado']))}
    ${fld('Mês/Ano','<input id="m-mes" placeholder="01/03/2026">')}
  </div>
  <div id="pf-notice" style="display:none;margin:8px 0 4px;padding:11px 14px;background:#FEF3E2;border:1px solid #F0C070;border-radius:3px;font-size:11px;color:#7A5000;line-height:1.6">
    ⚠️ <strong>Entrada PF:</strong> uma saída <code>[TD] {nome do contrato}</code> será criada automaticamente como <em>retirada de lucros · Ambas</em>, para manter o espelho contábil.
  </div>
  ${fld('Observações','<textarea id="m-obs" rows="2"></textarea>',true)}
  <div class="modal-actions">
    ${d?`<button class="btn-delete" onclick="deleteItem('entrada',${d.id})">🗑 Apagar</button>`:''}
    <button class="btn-cancel" onclick="closeModal()">Cancelar</button>
    <button class="btn-save" id="modal-save-btn" onclick="saveEntrada(null)">Salvar</button>
  </div>`
}

function mSaida(d=null){
  const opts = P.map(p=>`<option value="${p.id}|${esc(p.nome_contrato)}">${esc(p.nome_contrato)}</option>`).join('')
  const vincAtual = d?.contrato_id ? `${d.contrato_id}|${d.nome_contrato}` : ''
  return `<h3>${d?'Editar Saída':'Nova Saída'}</h3><div class="modal-divider"></div>
  <div class="mg">
    ${fld('Tipo de Saída',sel('m-tipo',['retirada de lucros','pró-labore','projeto despesa','escritório despesa','marketing','honorários','imposto']))}
    ${fld('Descrição','<input id="m-desc">')}
    ${fld('Vínculo',`<select id="m-vinculo"><option value="">Geral (rateado)</option>${opts}</select>`)}
    ${fld('Valor (R$)','<input id="m-valor" type="number" step="0.01">')}
    ${fld('Data Pagamento','<input id="m-data" type="date">')}
    ${fld('Conta',sel('m-conta',[{v:'pessoal',l:'PF (pessoal)'},{v:'jurídica',l:'PJ (jurídica)'}]))}
    ${fld('Sócia',sel('m-socia',[{v:'',l:'— Nenhuma —'},'Fernanda','Laís','Ambas']))}
    ${fld('Status',sel('m-status',['Pago','A Pagar']))}
    ${fld('Mês/Ano','<input id="m-mes" placeholder="01/03/2026">')}
  </div>
  <div class="modal-actions">
    ${d?`<button class="btn-delete" onclick="deleteItem('saida',${d.id})">🗑 Apagar</button>`:''}
    <button class="btn-cancel" onclick="closeModal()">Cancelar</button>
    <button class="btn-save" id="modal-save-btn" onclick="saveSaida(null)">Salvar</button>
  </div>`
}

function mRT(d=null){
  const opts = P.map(p=>`<option value="${esc(p.nome_contrato)}">${esc(p.nome_contrato)}</option>`).join('')
  return `<h3>${d?'Editar RT':'Nova RT / Comissão'}</h3><div class="modal-divider"></div>
  <div class="mg">
    ${fld('Projeto',`<select id="m-proj"><option value="">— Selecione —</option>${opts}</select>`)}
    ${fld('Categoria',sel('m-cat',['Marcenaria','Móveis soltos','Pedras','Cortinas e persianas','Eletros','Iluminação','Tapetes','Obra','Decoração','Enxoval','Tecidos','Vinílico','Serralheria']))}
    ${fld('Fornecedor','<input id="m-forn">')}
    ${fld('Contato','<input id="m-contato">')}
    ${fld('Valor da Venda (R$)','<input id="m-venda" type="number" step="0.01">')}
    ${fld('% RT (ex: 0.10)','<input id="m-pct" type="number" step="0.01" value="0.10">')}
    ${fld('Valor RT (R$)','<input id="m-valor" type="number" step="0.01">')}
    ${fld('A Receber (R$)','<input id="m-areceber" type="number" step="0.01">')}
    ${fld('Data Fechamento','<input id="m-data" type="date">')}
    ${fld('Conta',`<select id="m-conta" onchange="toggleRTNotice()"><option value="pessoal">PF (pessoal)</option><option value="jurídica">PJ (jurídica)</option></select>`)}
    ${fld('Status',`<select id="m-status" onchange="toggleRTNotice()"><option value="A receber">A receber</option><option value="Pago">Pago</option><option value="Inadimplência">Inadimplência</option></select>`)}
  </div>
  <div id="rt-pf-notice" style="display:none;margin:8px 0 4px;padding:11px 14px;background:#FEF3E2;border:1px solid #F0C070;border-radius:3px;font-size:11px;color:#7A5000;line-height:1.6">
    ⚠️ <strong>RT PF + Pago:</strong> uma entrada e uma saída <code>[TD]</code> serão criadas automaticamente para espelhar o recebimento e a retirada.
  </div>
  <div class="modal-actions">
    ${d?`<button class="btn-delete" onclick="deleteItem('rt',${d.id})">🗑 Apagar</button>`:''}
    <button class="btn-cancel" onclick="closeModal()">Cancelar</button>
    <button class="btn-save" id="modal-save-btn" onclick="saveRT(null)">Salvar</button>
  </div>`
}

function mRetirada(d=null){
  return `<h3>Retirada / Pró-labore</h3><div class="modal-divider"></div>
  <div class="mg">
    ${fld('Tipo',sel('m-tipo',['retirada de lucros','pró-labore']))}
    ${fld('Sócia',sel('m-socia',['Fernanda','Laís','Ambas']))}
    ${fld('Valor (R$)','<input id="m-valor" type="number" step="0.01">')}
    ${fld('Data','<input id="m-data" type="date">')}
    ${fld('Conta',sel('m-conta',[{v:'pessoal',l:'PF (pessoal)'},{v:'jurídica',l:'PJ (jurídica)'}]))}
    ${fld('Status',sel('m-status',['Pago','A Pagar']))}
    ${fld('Mês/Ano','<input id="m-mes" placeholder="01/03/2026">')}
  </div>
  <div class="modal-actions"><button class="btn-cancel" onclick="closeModal()">Cancelar</button><button class="btn-save" onclick="saveRetirada()">Salvar</button></div>`
}

// ═══════════════════════════════════════════════
// SAVES / UPDATES
// ═══════════════════════════════════════════════
async function saveProjeto(id){
  const payload = {
    numero:parseInt(g('m-num'))||null, nome_contrato:g('m-nome'), cliente:g('m-cliente'),
    contato:g('m-contato'), tipologia:g('m-tipologia'), servico:g('m-servico'),
    valor_contrato:parseFloat(g('m-valor'))||0, parcelas:parseInt(g('m-parcelas'))||1,
    a_receber:parseFloat(g('m-areceber'))||0, conta:g('m-conta'), status:g('m-status'),
    data_inicio:g('m-inicio')||null, data_fim:g('m-fim')||null,
    cidade:g('m-cidade'), uf:g('m-uf'), origem:g('m-origem'), metros_quadrados:g('m-m2'), obs:g('m-obs')
  }
  const {error} = id
    ? await db.from('contratos').update(payload).eq('id',id)
    : await db.from('contratos').insert(payload)
  if(!error){closeModal();await loadData();renderProjetos()}
  else toast(friendlyError(error), 'error', 6000)
}

async function saveEntrada(id){
  const nomeContrato = g('m-cont') || ''
  const proj = P.find(p=>p.nome_contrato===nomeContrato)
  const conta = g('m-conta')
  const valor = parseFloat(g('m-valor'))||0
  const data = g('m-data')||null
  const mes = g('m-mes')
  const status = g('m-status')
  const isPF = conta==='pessoal' || conta==='PF'

  const payload = {
    contrato_id:proj?.id||null, nome_contrato:nomeContrato, cliente:proj?.cliente||'',
    tipo_entrada:g('m-tipo'), valor, data_pagamento:data, conta,
    forma_pagto:g('m-forma'), status, mes_ano:mes, obs:g('m-obs')
  }

  const {error} = id
    ? await db.from('entradas').update(payload).eq('id',id)
    : await db.from('entradas').insert(payload)

  if(error){ toast(friendlyError(error), 'error', 6000); return }

  // Se PF e é nova entrada, cria saída [TD] automaticamente
  if(isPF && !id){
    const descricaoTD = `[TD] ${nomeContrato}`
    const jaExiste = S.some(s=>s.descricao===descricaoTD && s.valor===valor && s.data_pagamento===data)
    if(!jaExiste){
      await db.from('saidas').insert({
        tipo_saida:'retirada de lucros', descricao:descricaoTD,
        valor, data_pagamento:data, conta:'pessoal', socia:'Ambas',
        status, mes_ano:mes,
        contrato_id:proj?.id||null, nome_contrato:nomeContrato
      })
    }
  }

  closeModal(); await loadData(); renderFinanceiro()
}

async function saveSaida(id){
  const vinculo = g('m-vinculo') || ''
  const [cid, cnome] = vinculo ? vinculo.split('|') : [null, null]
  const payload = {
    tipo_saida:g('m-tipo'), descricao:g('m-desc'), valor:parseFloat(g('m-valor'))||0,
    data_pagamento:g('m-data')||null, conta:g('m-conta'), socia:g('m-socia')||null,
    status:g('m-status'), mes_ano:g('m-mes'),
    contrato_id: cid ? parseInt(cid) : null,
    nome_contrato: cnome || null
  }
  const {error} = id
    ? await db.from('saidas').update(payload).eq('id',id)
    : await db.from('saidas').insert(payload)
  if(!error){closeModal();await loadData();renderFinanceiro()}
  else toast(friendlyError(error), 'error', 6000)
}

async function saveRT(id){
  const vr = parseFloat(g('m-valor'))||0
  const status = g('m-status')
  const conta = g('m-conta')
  const nomeContrato = g('m-proj')
  const data = g('m-data')||null
  const proj = P.find(p=>p.nome_contrato===nomeContrato)

  // Se alterando para Pago, a_receber vai a 0
  const aReceber = status==='Pago' ? 0 : parseFloat(g('m-areceber'))||0

  const payload = {
    projeto:nomeContrato, categoria:g('m-cat'), fornecedor:g('m-forn'),
    contato_fornecedor:g('m-contato'), valor_venda:parseFloat(g('m-venda'))||null,
    percentual_rt:parseFloat(g('m-pct'))||null, valor_rt:vr,
    a_receber:aReceber, data_fechamento:data, conta, status
  }

  // Se edição, checar se status mudou para Pago
  let eraAReceber = false
  if(id){
    const rtAnterior = R.find(r=>r.id===id)
    eraAReceber = rtAnterior && rtAnterior.status !== 'Pago'
  }

  const {error} = id
    ? await db.from('rt_comissoes').update(payload).eq('id',id)
    : await db.from('rt_comissoes').insert(payload)

  if(error){ toast(friendlyError(error), 'error', 6000); return }

  // Automação PF: cria entrada + saída [TD] quando PF e (novo com Pago) ou (edição mudou para Pago)
  const isPF = conta==='pessoal' || conta==='PF'
  const ficouPago = (!id && status==='Pago') || (id && eraAReceber && status==='Pago')

  if(isPF && ficouPago && nomeContrato){
    const mes = data ? `01/${String(new Date(data+'T12:00:00').getMonth()+1).padStart(2,'0')}/${new Date(data+'T12:00:00').getFullYear()}` : mesAtual()
    const descricaoTD = `[TD] ${nomeContrato}`
    const jaExiste = S.some(s=>s.descricao===descricaoTD && Math.abs((s.valor||0)-vr)<0.01 && s.data_pagamento===data)
    if(!jaExiste){
      // Entrada RT
      await db.from('entradas').insert({
        contrato_id:proj?.id||null, nome_contrato:nomeContrato, cliente:proj?.cliente||'',
        tipo_entrada:'rt', valor:vr, data_pagamento:data,
        conta:'pessoal', forma_pagto:'PIX', status:'Pago', mes_ano:mes
      })
      // Saída [TD] espelho
      await db.from('saidas').insert({
        tipo_saida:'retirada de lucros', descricao:descricaoTD,
        valor:vr, data_pagamento:data, conta:'pessoal', socia:'Ambas',
        status:'Pago', mes_ano:mes,
        contrato_id:proj?.id||null, nome_contrato:nomeContrato
      })
    }
  }

  closeModal(); await loadData(); renderRT()
}

async function saveRetirada(){
  const {error} = await db.from('saidas').insert({
    tipo_saida:g('m-tipo'), descricao:`${g('m-tipo')} — ${g('m-socia')}`,
    valor:parseFloat(g('m-valor'))||0, data_pagamento:g('m-data')||null,
    conta:g('m-conta'), socia:g('m-socia'), status:g('m-status'), mes_ano:g('m-mes')
  })
  if(!error){closeModal();await loadData();renderSocias()}
  else toast(friendlyError(error), 'error', 6000)
}

// ═══════════════════════════════════════════════
// DELETE — individual (via modal)
// ═══════════════════════════════════════════════
const tableMap = { projeto:'contratos', entrada:'entradas', saida:'saidas', rt:'rt_comissoes' }
const reRender = { contratos:()=>renderProjetos(), entradas:()=>renderFinanceiro(), saidas:()=>renderFinanceiro(), rt_comissoes:()=>renderRT() }

function deleteItem(type, id){
  const label = {projeto:'este projeto',entrada:'esta entrada',saida:'esta saída',rt:'esta RT'}[type]||'este registro'
  confirmDialog(
    `Apagar ${label}?`,
    'Esta ação remove o registro permanentemente do banco de dados e não pode ser desfeita.',
    async ()=>{
      const tbl = tableMap[type]
      const {error} = await db.from(tbl).delete().eq('id',id)
      if(!error){ closeModal(); await loadData(); reRender[tbl]?.() }
      else toast(friendlyError(error), 'error', 6000)
    }
  )
}

// ═══════════════════════════════════════════════
// CONFIRM DIALOG
// ═══════════════════════════════════════════════
let _confirmCallback = null
function confirmDialog(title, msg, onAccept){
  document.getElementById('confirm-title').textContent = title
  document.getElementById('confirm-msg').textContent = msg
  _confirmCallback = onAccept
  document.getElementById('confirm-overlay').classList.add('open')
}
function confirmAccept(){ document.getElementById('confirm-overlay').classList.remove('open'); _confirmCallback?.() }
function confirmReject(){ document.getElementById('confirm-overlay').classList.remove('open'); _confirmCallback=null }

