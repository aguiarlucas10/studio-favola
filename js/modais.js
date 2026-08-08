
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
    set('m-status',data.status); set('m-inicio',data.data_inicio)
    set('m-fim',data.data_fim); set('m-cidade',data.cidade); set('m-uf',data.uf)
    set('m-origem',data.origem); set('m-m2',data.metros_quadrados); set('m-obs',data.obs)
    const btn=document.getElementById('modal-save-btn')
    if(btn) btn.onclick=()=>saveProjeto(data.id)
  } else if(type==='entrada'){
    set('m-cont',data.nome_contrato)
    set('m-tipo',data.tipo_entrada)
    set('m-valor',data.valor); set('m-data',data.data_pagamento); set('m-conta',data.conta)
    set('m-forma',data.forma_pagto); set('m-status',data.status); set('m-obs',data.obs)
    const btn=document.getElementById('modal-save-btn')
    if(btn) btn.onclick=()=>saveEntrada(data.id)
  } else if(type==='saida'){
    set('m-tipo',data.tipo_saida); set('m-desc',data.descricao); set('m-valor',data.valor)
    set('m-data',data.data_pagamento); set('m-conta',data.conta); set('m-socia',data.socia)
    set('m-status',data.status)
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

function fld(label,html,full){return `<div class="field${full?' full':''}"><label>${label}</label>${html}</div>`}
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
// Valor RT = venda × % — preenchido automaticamente, mas editável
// (só recalcula quando venda/% mudam; não sobrescreve edição manual à toa)
function rtRecalc(){
  const venda = parseFloat(g('m-venda'))||0
  const pct = parseFloat(g('m-pct'))||0
  const el = document.getElementById('m-valor')
  if(el && venda && pct) el.value = Math.round(venda*pct*100)/100
  rtRecalcAReceber()
}
// A Receber acompanha o status: Pago → 0; senão → Valor RT atual.
// Continua editável para registrar recebimento parcial.
function rtRecalcAReceber(){
  const el = document.getElementById('m-areceber')
  if(el) el.value = g('m-status')==='Pago' ? 0 : (parseFloat(g('m-valor'))||0)
}

function mProjeto(d=null){
  const genOnChange = d ? '' : ' onchange="gerarParcelasPreview()"'
  return `<h3>${d?'Editar Projeto':'Novo Projeto'}</h3><div class="modal-divider"></div>
  <div class="mg">
    ${fld('Nº','<input id="m-num" type="number">')}
    ${fld('Nome do Contrato','<input id="m-nome" placeholder="Ex: Ap Maria e Guilherme">')}
    ${fld('Cliente','<input id="m-cliente">')}
    ${fld('Contato','<input id="m-contato">')}
    ${fld('Tipologia',sel('m-tipologia',['Interiores','Arquitetônico','Comercial','Arq + Int']))}
    ${fld('Serviço',sel('m-servico',['Projeto','Consultoria','Detalhamento','Acompanhamento']))}
    ${fld('Valor do Contrato (R$)',`<input id="m-valor" type="number" step="0.01"${genOnChange}>`)}
    ${fld('Parcelas',`<input id="m-parcelas" type="number" value="1" min="1"${genOnChange}>`)}
    ${fld('Conta',sel('m-conta',[{v:'pessoal',l:'PF (pessoal)'},{v:'jurídica',l:'PJ (jurídica)'}]))}
    ${fld('Status',sel('m-status',['Ativo','Proposta','Pausado','Finalizado','Descontinuado']))}
    ${fld('Data Início',`<input id="m-inicio" type="date"${genOnChange}>`)}
    ${fld('Data Fim','<input id="m-fim" type="date">')}
    ${fld('Cidade','<input id="m-cidade">')}
    ${fld('UF','<input id="m-uf" maxlength="2">')}
    ${fld('Origem',sel('m-origem',['Indicação','Family & friends','Contato comercial']))}
    ${fld('M²','<input id="m-m2">')}
  </div>
  ${fld('Observações','<textarea id="m-obs" rows="2"></textarea>',true)}
  ${d ? `
  <div style="margin-top:14px;padding:10px 14px;background:var(--cool-gray);border-radius:3px;font-size:10px;color:var(--warm-gray);line-height:1.6">
    Alterar valor ou nº de parcelas aqui <strong>não altera as parcelas já geradas</strong> — edite as entradas do contrato na aba Financeiro.
  </div>` : `
  <div class="modal-divider" style="margin-top:18px"></div>
  <label style="display:flex;align-items:center;gap:8px;font-size:11px;color:var(--preto-soft);margin-bottom:8px;cursor:pointer">
    <input type="checkbox" id="m-gerar-parc" checked onchange="toggleParcelasPreview()"> Gerar parcelas previstas (uma entrada "A Receber" por mês)
  </label>
  <div id="parcelas-preview" style="font-size:11px;color:var(--warm-gray)">Preencha valor, parcelas e data de início para ver as parcelas.</div>`}
  <div class="modal-actions">
    ${d?`<button class="btn-delete" onclick="deleteItem('projeto',${d.id})">🗑 Apagar</button>`:''}
    <button class="btn-cancel" onclick="closeModal()">Cancelar</button>
    <button class="btn-save" id="modal-save-btn" onclick="saveProjeto(null)">Salvar</button>
  </div>`
}

// Gera a prévia editável de parcelas a partir de valor + nº parcelas + data de início.
// Mensais e iguais; a última parcela absorve o arredondamento. Cada linha é editável.
function gerarParcelasPreview(){
  const chk = document.getElementById('m-gerar-parc')
  const box = document.getElementById('parcelas-preview')
  if(!box) return
  if(chk && !chk.checked){ box.innerHTML=''; return }
  const valor = parseFloat(g('m-valor'))||0
  const n = Math.max(1, parseInt(g('m-parcelas'))||1)
  const inicio = g('m-inicio')
  if(!valor || !inicio){ box.innerHTML = '<span>Preencha valor, parcelas e data de início para ver as parcelas.</span>'; return }
  const base = Math.floor((valor/n)*100)/100
  const linhas = []
  const [y,m,dia] = inicio.split('-').map(Number)
  for(let i=0;i<n;i++){
    // Avança i meses e depois aplica o dia com clamp no último dia do mês:
    // sem isso, início dia 29-31 estoura o mês (31/01 + 1 mês viraria 03/03),
    // pulando meses e duplicando parcelas no mesmo mês.
    const alvo = new Date(y, (m-1)+i, 1)
    const ult = new Date(alvo.getFullYear(), alvo.getMonth()+1, 0).getDate()
    const dt = new Date(alvo.getFullYear(), alvo.getMonth(), Math.min(dia||1, ult))
    const iso = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`
    const v = i===n-1 ? +(valor-base*(n-1)).toFixed(2) : base
    linhas.push({iso, v})
  }
  box.innerHTML = `
    <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>${n} parcela${n>1?'s':''} de ~${fmt(base)}</span><span>Total: <strong>${fmt(valor)}</strong></span></div>
    <div class="tbl-wrap" style="max-height:200px;overflow-y:auto">
      <table><thead><tr><th>#</th><th>Vencimento</th><th>Valor</th></tr></thead>
      <tbody>${linhas.map((l,i)=>`<tr>
        <td class="td-muted">${i+1}</td>
        <td><input id="parc-data-${i}" type="date" value="${l.iso}" style="padding:5px 8px;border:1px solid var(--border);border-radius:3px;font-family:'Spartan',sans-serif;font-size:11px"></td>
        <td><input id="parc-valor-${i}" type="number" step="0.01" value="${l.v}" style="width:110px;padding:5px 8px;border:1px solid var(--border);border-radius:3px;font-family:'Spartan',sans-serif;font-size:11px"></td>
      </tr>`).join('')}</tbody></table>
    </div>`
  box.dataset.n = n
}

function toggleParcelasPreview(){
  const chk = document.getElementById('m-gerar-parc')
  const box = document.getElementById('parcelas-preview')
  if(!box) return
  if(chk && chk.checked) gerarParcelasPreview()
  else box.innerHTML = '<span style="color:var(--warm-gray)">As parcelas serão lançadas manualmente depois.</span>'
}

// Lê as parcelas da prévia (se ativa) para inserir como entradas.
function coletarParcelas(){
  const chk = document.getElementById('m-gerar-parc')
  const box = document.getElementById('parcelas-preview')
  if(!chk || !chk.checked || !box || !box.dataset.n) return []
  const n = parseInt(box.dataset.n)||0
  const out = []
  for(let i=0;i<n;i++){
    const data = document.getElementById(`parc-data-${i}`)?.value || null
    const valor = parseFloat(document.getElementById(`parc-valor-${i}`)?.value)||0
    if(valor>0) out.push({ data, valor })
  }
  return out
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
    ${fld('Valor da Venda (R$)','<input id="m-venda" type="number" step="0.01" oninput="rtRecalc()">')}
    ${fld('% RT (ex: 0.10)','<input id="m-pct" type="number" step="0.01" value="0.10" oninput="rtRecalc()">')}
    ${fld('Valor RT (R$)','<input id="m-valor" type="number" step="0.01" oninput="rtRecalcAReceber()">')}
    ${fld('A Receber (R$)','<input id="m-areceber" type="number" step="0.01">')}
    ${fld('Data Fechamento','<input id="m-data" type="date">')}
    ${fld('Conta',`<select id="m-conta" onchange="toggleRTNotice()"><option value="pessoal">PF (pessoal)</option><option value="jurídica">PJ (jurídica)</option></select>`)}
    ${fld('Status',`<select id="m-status" onchange="toggleRTNotice();rtRecalcAReceber()"><option value="A receber">A receber</option><option value="Pago">Pago</option><option value="Inadimplência">Inadimplência</option></select>`)}
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
  </div>
  <div class="modal-actions"><button class="btn-cancel" onclick="closeModal()">Cancelar</button><button class="btn-save" id="modal-save-btn" onclick="saveRetirada()">Salvar</button></div>`
}

// ═══════════════════════════════════════════════
// SAVES / UPDATES
// ═══════════════════════════════════════════════
async function saveProjeto(id){
  const nome = g('m-nome'), cliente = g('m-cliente')
  const payload = {
    numero:parseInt(g('m-num'))||null, nome_contrato:nome, cliente,
    contato:g('m-contato'), tipologia:g('m-tipologia'), servico:g('m-servico'),
    valor_contrato:parseFloat(g('m-valor'))||0, parcelas:parseInt(g('m-parcelas'))||1,
    conta:g('m-conta'), status:g('m-status'),
    data_inicio:g('m-inicio')||null, data_fim:g('m-fim')||null,
    cidade:g('m-cidade'), uf:g('m-uf'), origem:g('m-origem'), metros_quadrados:g('m-m2'), obs:g('m-obs')
  }
  // Coleta parcelas ANTES de fechar o modal (só em contrato novo)
  const parcelas = id ? [] : coletarParcelas()
  const conta = g('m-conta')

  const executa = async ()=>{
    let novoContrato = null, error
    if(id){
      ({error} = await db.from('contratos').update(payload).eq('id',id))
    } else {
      const r = await db.from('contratos').insert(payload).select().single()
      error = r.error; novoContrato = r.data
    }
    if(error){ toast(friendlyError(error), 'error', 6000); return }

    // Gera as parcelas previstas como entradas "A Receber" do contrato recém-criado
    if(novoContrato && parcelas.length){
      const rows = parcelas.map(p=>({
        contrato_id: novoContrato.id, nome_contrato: nome, cliente,
        tipo_entrada: 'projeto', valor: p.valor, data_pagamento: p.data,
        conta, status: 'A Receber', mes_ano: mesAnoDeData(p.data)
      }))
      const {error:eParc} = await db.from('entradas').insert(rows)
      if(eParc){ toast('Contrato salvo, mas falhou ao gerar as parcelas: '+friendlyError(eParc), 'error', 7000) }
    }

    closeModal(); await loadData(); renderProjetos()
  }

  // Parcelas editadas à mão podem divergir do valor do contrato — confirmar antes
  const somaParcelas = parcelas.reduce((a,p)=>a+(p.valor||0),0)
  if(parcelas.length && Math.abs(somaParcelas - (payload.valor_contrato||0)) > 0.01){
    confirmDialog(
      'Soma das parcelas difere do contrato',
      `As parcelas somam ${fmt(somaParcelas)}, mas o contrato vale ${fmt(payload.valor_contrato)}. Salvar assim mesmo?`,
      executa
    )
    return
  }
  await executa()
}

// ═══════════════════════════════════════════════
// ESPELHOS [TD] — contrapeso contábil de pagamento na conta PF
// ═══════════════════════════════════════════════
// Localiza as saídas-espelho de uma entrada PF.
//
// Esta função alimenta automações que ALTERAM e APAGAM saídas, então é
// deliberadamente mais restrita que isEspelho() (usado só para exibir):
//  - exige tipo_saida 'retirada de lucros' — todo espelho é uma retirada, e
//    isso exclui uma despesa real cuja descrição por acaso comece com "TD "
//    (ex.: "TD Cortinas", fornecedor), que de outra forma poderia ser apagada
//    junto com a entrada;
//  - exige nome de contrato e data preenchidos: sem eles, valores nulos
//    casariam qualquer espelho órfão (null===null, aprox(null,null));
//  - casa nome inteiro no vínculo, ou a descrição no formato conhecido do
//    espelho — nunca substring solta, que confundiria "Casa Ana" com
//    "Casa Ana II" na mesma data e valor.
function encontraEspelhos(e){
  const nome = e?.nome_contrato || ''
  if(!nome || !e.data_pagamento) return []
  const alvo = nome.trim().toLowerCase()
  const casaDescricao = s => {
    const d = (s.descricao||'').trim().toLowerCase()
    return d === `[td] ${alvo}` || d === `td ${alvo}` || d === `td contrato ${alvo}` || d === `td rt ${alvo}`
  }
  return S.filter(s => isEspelho(s)
    && s.tipo_saida === 'retirada de lucros'
    && ((s.nome_contrato && s.nome_contrato.trim().toLowerCase()===alvo) || casaDescricao(s))
    && aprox(s.valor, e.valor)
    && s.data_pagamento === e.data_pagamento)
}

// Garante o espelho [TD] de uma entrada PF PAGA: se já existe um pendente,
// marca como Pago; se não existe, cria já como Pago (o dinheiro entrou).
async function garanteEspelhoTD(e){
  const [espelho] = encontraEspelhos(e)
  if(espelho){
    if(espelho.status !== 'Pago'){
      const {error} = await db.from('saidas').update({status:'Pago'}).eq('id', espelho.id)
      if(error) toast('O espelho [TD] não foi atualizado: '+friendlyError(error), 'error', 6000)
    }
    return
  }
  const {error} = await db.from('saidas').insert({
    tipo_saida:'retirada de lucros', descricao:`[TD] ${e.nome_contrato||''}`.trim(),
    valor:e.valor, data_pagamento:e.data_pagamento, conta:'pessoal', socia:'Ambas',
    status:'Pago',
    // Deriva de data_pagamento em vez de copiar e.mes_ano: quando a entrada vem
    // das arrays em memória (quitação em massa), normalizaArrays() já converteu
    // o campo para a chave MM/YYYY — gravá-lo assim poluiria o banco com um
    // formato que não é o legado 01/MM/YYYY usado em todas as outras escritas.
    mes_ano: mesAnoDeData(e.data_pagamento),
    contrato_id:e.contrato_id||null, nome_contrato:e.nome_contrato||null
  })
  if(error) toast('O espelho [TD] não foi criado: '+friendlyError(error), 'error', 6000)
}

async function saveEntrada(id){
  const nomeContrato = g('m-cont') || ''
  const proj = P.find(p=>p.nome_contrato===nomeContrato)
  const conta = g('m-conta')
  const valor = parseFloat(g('m-valor'))||0
  const data = g('m-data')||null
  const status = g('m-status')
  const isPF = conta==='pessoal' || conta==='PF'
  // Estado anterior ANTES de gravar: detecta a quitação e preserva o mês
  // original quando o registro não tem data de pagamento
  const anterior = id ? E.find(x=>x.id===id) : null
  const mes = mesAnoAoSalvar(data, anterior)

  const payload = {
    contrato_id:proj?.id||null, nome_contrato:nomeContrato, cliente:proj?.cliente||'',
    tipo_entrada:g('m-tipo'), valor, data_pagamento:data, conta,
    forma_pagto:g('m-forma'), status, mes_ano:mes, obs:g('m-obs')
  }

  const {error} = id
    ? await db.from('entradas').update(payload).eq('id',id)
    : await db.from('entradas').insert(payload)

  if(error){ toast(friendlyError(error), 'error', 6000); return }

  // O espelho [TD] nasce quando o dinheiro ENTRA na conta PF: entrada nova já
  // Paga, ou edição que quita (A Receber/Atrasado → Pago). Parcela PF apenas
  // prevista não gera espelho antecipado.
  const ficouPago = status==='Pago' && (!id || (anterior && anterior.status!=='Pago'))
  if(isPF && ficouPago){
    await garanteEspelhoTD({nome_contrato:nomeContrato, valor, data_pagamento:data,
                            contrato_id:proj?.id||null})
  }
  // Edição de entrada PF que JÁ era paga: acompanha o espelho se casar 1:1
  else if(isPF && id && anterior && anterior.status==='Pago' && status==='Pago'
          && (!aprox(anterior.valor, valor) || anterior.data_pagamento!==data)){
    const cands = encontraEspelhos(anterior)
    if(cands.length===1){
      const {error:e2} = await db.from('saidas')
        .update({valor, data_pagamento:data, mes_ano:mes}).eq('id',cands[0].id)
      if(e2) toast('O espelho [TD] não acompanhou a edição: '+friendlyError(e2), 'error', 6000)
      else toast('O espelho [TD] foi atualizado junto.', 'info')
    } else {
      toast('Entrada alterada — confira o espelho [TD] correspondente na aba Saídas.', 'info', 6000)
    }
  }

  closeModal(); await loadData(); renderFinanceiro()
}

async function saveSaida(id){
  const vinculo = g('m-vinculo') || ''
  const [cid, cnome] = vinculo ? vinculo.split('|') : [null, null]
  const anterior = id ? S.find(x=>x.id===id) : null
  const payload = {
    tipo_saida:g('m-tipo'), descricao:g('m-desc'), valor:parseFloat(g('m-valor'))||0,
    data_pagamento:g('m-data')||null, conta:g('m-conta'), socia:g('m-socia')||null,
    status:g('m-status'), mes_ano:mesAnoAoSalvar(g('m-data')||null, anterior),
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
    const mes = mesAnoDeData(data)
    const descricaoTD = `[TD] ${nomeContrato}`
    const jaExiste = encontraEspelhos({nome_contrato:nomeContrato, valor:vr, data_pagamento:data}).length > 0
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
    conta:g('m-conta'), socia:g('m-socia'), status:g('m-status'), mes_ano:mesAnoDeData(g('m-data'))
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
  let msg = 'Esta ação remove o registro permanentemente do banco de dados e não pode ser desfeita.'
  // Projeto: a FK do banco bloqueia a exclusão enquanto houver lançamentos
  // vinculados. Se só houver parcelas "A Receber", oferecemos apagar junto.
  let apagarParcelas = false
  if(type==='projeto'){
    const entVinc = E.filter(e=>e.contrato_id===id)
    const saiVinc = S.filter(s=>s.contrato_id===id)
    const pendentes = entVinc.filter(e=>e.status!=='Pago')
    if(saiVinc.length===0 && entVinc.length>0 && entVinc.length===pendentes.length){
      apagarParcelas = true
      msg = `Este projeto tem ${pendentes.length} parcela${pendentes.length>1?'s':''} "A Receber" que ${pendentes.length>1?'serão apagadas':'será apagada'} junto. ` + msg
    } else if(entVinc.length || saiVinc.length){
      msg = `Este projeto tem ${entVinc.length} entrada(s) e ${saiVinc.length} saída(s) vinculadas — o banco bloqueará a exclusão até você apagar ou desvincular esses lançamentos no Financeiro. ` + msg
    }
  }
  // Entrada PF: o espelho [TD] correspondente sai junto quando casa 1:1
  let espelhoJunto = null
  if(type==='entrada'){
    const e = E.find(x=>x.id===id)
    if(e && (e.conta==='pessoal'||e.conta==='PF')){
      const esps = encontraEspelhos(e)
      if(esps.length===1){ espelhoJunto = esps[0]; msg += ' A saída-espelho [TD] correspondente será apagada junto.' }
      else if(esps.length>1){ msg += ' Há mais de uma saída [TD] parecida — confira os espelhos na aba Saídas depois.' }
    }
  }
  confirmDialog(
    `Apagar ${label}?`,
    msg,
    async ()=>{
      const tbl = tableMap[type]
      if(apagarParcelas){
        const {error:eParc} = await db.from('entradas').delete().eq('contrato_id',id).neq('status','Pago')
        if(eParc){ toast(friendlyError(eParc), 'error', 6000); return }
      }
      const {error} = await db.from(tbl).delete().eq('id',id)
      if(error){ toast(friendlyError(error), 'error', 6000); return }
      if(espelhoJunto){
        const {error:e2} = await db.from('saidas').delete().eq('id',espelhoJunto.id)
        if(e2) toast('Entrada apagada, mas o espelho [TD] não: '+friendlyError(e2), 'error', 6000)
      }
      closeModal(); await loadData(); reRender[tbl]?.()
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

// ═══════════════════════════════════════════════
// GUARDA DE DUPLO CLIQUE (travaDuplo em config.js)
// Clique duplo em Salvar criava registro duplicado — cada save roda uma vez
// por vez, com o botão desabilitado durante o await.
// ═══════════════════════════════════════════════
saveProjeto  = travaDuplo(saveProjeto)
saveEntrada  = travaDuplo(saveEntrada)
saveSaida    = travaDuplo(saveSaida)
saveRT       = travaDuplo(saveRT)
saveRetirada = travaDuplo(saveRetirada)

