// ═══════════════════════════════════════════════
// AJUSTE DE CAIXA — aprovação assíncrona
// ═══════════════════════════════════════════════
let AJ = []  // ajustes pendentes carregados

async function loadAjustes(){
  const { data } = await db.from('ajustes_caixa').select('*').order('created_at',{ascending:false}).limit(20)
  AJ = data || []
}

// Verifica se há ajuste pendente e mostra banner no dashboard
function checkAjustePendente(){
  const pendente = AJ.find(a=>a.status==='pendente')
  const banner = document.getElementById('dash-ajuste-banner')
  if(!banner) return
  if(!pendente){ banner.style.display='none'; return }

  // Identidade por ID autenticado; fallback por nome só para registros antigos sem ID
  const jaSolicitou = pendente.solicitado_por_id
    ? pendente.solicitado_por_id === currentUserId
    : !!(pendente.solicitado_por && currentUserName.toLowerCase().includes(pendente.solicitado_por.toLowerCase()))
  const jaAprovou = pendente.aprovado_por_id
    ? pendente.aprovado_por_id === currentUserId
    : !!(pendente.aprovado_por && currentUserName.toLowerCase().includes(pendente.aprovado_por.toLowerCase()))
  const podeAprovar = !jaSolicitou && !jaAprovou

  banner.style.display = 'flex'
  banner.innerHTML = `
    <div style="flex:1;min-width:0">
      <div style="font-size:11px;font-weight:600;margin-bottom:2px">⏳ Ajuste de caixa aguardando aprovação</div>
      <div style="font-size:10px;opacity:.85">
        Solicitado por <strong>${esc(pendente.solicitado_por)}</strong> · Novo saldo: <strong>${fmt(pendente.valor_novo)}</strong>
        ${pendente.motivo ? ` · ${esc(pendente.motivo)}` : ''}
      </div>
    </div>
    <div style="display:flex;gap:8px;flex-shrink:0">
      ${podeAprovar
        ? `<button onclick="responderAjuste(${pendente.id},'aprovado')" style="padding:6px 14px;background:var(--emerald);color:#fff;border:none;border-radius:3px;font-family:'Spartan',sans-serif;font-size:10px;letter-spacing:.08em;cursor:pointer">✓ APROVAR</button>
           <button onclick="responderAjuste(${pendente.id},'rejeitado')" style="padding:6px 14px;background:transparent;color:#fff;border:1px solid rgba(255,255,255,.4);border-radius:3px;font-family:'Spartan',sans-serif;font-size:10px;cursor:pointer">✕ REJEITAR</button>`
        : `<span style="font-size:10px;opacity:.7;padding:6px 0">${jaSolicitou ? 'Você solicitou · aguardando a outra sócia' : 'Você já aprovou · aguardando outra aprovação'}</span>`
      }
      <button onclick="verDetalheAjuste(${pendente.id})" style="padding:6px 10px;background:transparent;color:#fff;border:1px solid rgba(255,255,255,.3);border-radius:3px;font-family:'Spartan',sans-serif;font-size:10px;cursor:pointer">Detalhes</button>
    </div>`
}

function openAjusteCaixa(){
  const saldoAtual = calcSaldoAcumulado()
  const pendente = AJ.find(a=>a.status==='pendente')

  let extraHTML = ''
  if(pendente){
    extraHTML = `<div style="background:#FFF3CD;border:1px solid #FFD700;border-radius:3px;padding:12px 16px;margin-bottom:16px;font-size:11px;color:#7a6000">
      ⚠️ Já existe um ajuste pendente de aprovação. Aguarde a conclusão antes de criar outro.
    </div>`
  }

  document.getElementById('modal-content').innerHTML = `
    <h3>Ajuste de Caixa</h3><div class="modal-divider"></div>
    <div style="background:var(--cool-gray);border-radius:3px;padding:12px 16px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:11px;color:var(--warm-gray);letter-spacing:.06em">SALDO ACUMULADO ATUAL</span>
      <span style="font-family:'Libre Baskerville',serif;font-size:16px;color:${saldoAtual>=0?'var(--emerald)':'var(--red)'}">${fmt(saldoAtual)}</span>
    </div>
    ${extraHTML}
    <div class="mg">
      ${fld('Saldo real conforme extrato (R$)','<input id="aj-valor" type="number" step="0.01" placeholder="Ex: 45000.00"' + (pendente?' disabled':'') + '>')}
      ${fld('Motivo / Referência','<input id="aj-motivo" placeholder="Ex: Conciliação extrato Nubank fev/2026"' + (pendente?' disabled':'') + '>')}
      ${fld('Data de referência','<input id="aj-data" type="date"' + (pendente?' disabled':'') + '>')}
    </div>
    <div style="font-size:10px;color:var(--warm-gray);line-height:1.7;margin-bottom:16px">
      Ao solicitar, a outra sócia receberá um aviso no dashboard para aprovar ou rejeitar.<br>
      O ajuste só é aplicado após a aprovação da segunda sócia.
    </div>
    <div class="modal-actions">
      <button class="btn-cancel" onclick="closeModal()">Cancelar</button>
      <button class="btn-save" onclick="solicitarAjusteCaixa()" ${pendente?'disabled style="opacity:.4;cursor:not-allowed"':''}>Solicitar Ajuste</button>
    </div>`
  document.getElementById('modal-overlay').classList.add('open')
  if(!pendente) document.getElementById('aj-data').valueAsDate = new Date()
}

async function solicitarAjusteCaixa(){
  const novoSaldo = parseFloat(document.getElementById('aj-valor').value)
  if(isNaN(novoSaldo)){ alert('Digite o novo saldo.'); return }
  const motivo = document.getElementById('aj-motivo').value || ''
  const data = document.getElementById('aj-data').value
  const saldoAtual = calcSaldoAcumulado()
  const diferenca = novoSaldo - saldoAtual
  if(Math.abs(diferenca) < 0.01){ alert('Saldo já está correto, nenhum ajuste necessário.'); return }

  const { error } = await db.from('ajustes_caixa').insert({
    valor_novo: novoSaldo,
    valor_anterior: saldoAtual,
    diferenca,
    motivo,
    data_referencia: data || null,
    solicitado_por: currentUserName,
    solicitado_por_id: currentUserId,
    status: 'pendente'
  })
  if(error){ alert('Erro ao solicitar: '+error.message); return }

  closeModal()
  await loadAjustes()
  checkAjustePendente()

  const fb = document.createElement('div')
  fb.style.cssText='position:fixed;top:20px;right:24px;background:var(--preto-soft);color:#fff;padding:12px 20px;border-radius:4px;font-size:12px;font-family:Spartan,sans-serif;letter-spacing:.06em;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,.15)'
  fb.textContent = '✓ Solicitação enviada · aguardando aprovação da outra sócia'
  document.body.appendChild(fb)
  setTimeout(()=>fb.remove(), 4000)
}

async function responderAjuste(id, decisao){
  const ajuste = AJ.find(a=>a.id===id)
  if(!ajuste) return
  // Quem solicitou não pode aprovar o próprio ajuste (validado pelo ID autenticado)
  if(ajuste.solicitado_por_id && ajuste.solicitado_por_id === currentUserId){
    alert('Você solicitou este ajuste — apenas a outra sócia pode aprová-lo ou rejeitá-lo.')
    return
  }

  if(decisao === 'rejeitado'){
    const { error } = await db.from('ajustes_caixa').update({ status:'rejeitado', aprovado_por: currentUserName, aprovado_por_id: currentUserId, updated_at: new Date().toISOString() }).eq('id',id)
    if(error){ alert('Erro: '+error.message); return }
    await loadAjustes(); checkAjustePendente()
    return
  }

  // Aprovado — aplica o ajuste no banco
  const { diferenca, valor_novo, motivo, data_referencia } = ajuste
  const data = data_referencia || new Date().toISOString().slice(0,10)
  const d = new Date(data+'T12:00:00')
  const mes = `01/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`

  let errAjuste
  if(diferenca > 0){
    const r = await db.from('entradas').insert({
      nome_contrato: null, cliente: null, tipo_entrada: 'ajuste de caixa',
      valor: diferenca, data_pagamento: data, conta: 'jurídica',
      forma_pagto: 'Ajuste', status: 'Pago', mes_ano: mes,
      obs: `[Ajuste de Caixa] ${motivo||''} · aprovado por ${ajuste.solicitado_por} e ${currentUserName}`
    })
    errAjuste = r.error
  } else {
    const r = await db.from('saidas').insert({
      tipo_saida: 'ajuste de caixa', descricao: `[Ajuste de Caixa] ${motivo||'Conciliação'}`,
      valor: Math.abs(diferenca), data_pagamento: data, conta: 'jurídica',
      socia: 'Ambas', status: 'Pago', mes_ano: mes,
      obs: `Aprovado por ${ajuste.solicitado_por} e ${currentUserName}`
    })
    errAjuste = r.error
  }
  if(errAjuste){ alert('Erro ao aplicar ajuste: '+errAjuste.message); return }

  // Marca como aprovado
  await db.from('ajustes_caixa').update({ status:'aprovado', aprovado_por: currentUserName, aprovado_por_id: currentUserId, updated_at: new Date().toISOString() }).eq('id',id)

  await loadData(); await loadAjustes()
  renderDashboard(); checkAjustePendente()

  const fb = document.createElement('div')
  fb.style.cssText='position:fixed;top:20px;right:24px;background:var(--emerald);color:#fff;padding:12px 20px;border-radius:4px;font-size:12px;font-family:Spartan,sans-serif;letter-spacing:.06em;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,.15)'
  fb.textContent = `✓ Ajuste aprovado e aplicado · novo caixa ${fmt(valor_novo)}`
  document.body.appendChild(fb)
  setTimeout(()=>fb.remove(), 5000)
}

function verDetalheAjuste(id){
  const a = AJ.find(x=>x.id===id)
  if(!a) return
  const dif = a.diferenca >= 0 ? `+${fmt(a.diferenca)}` : fmt(a.diferenca)
  alert(`Ajuste #${a.id}\nSolicitado por: ${a.solicitado_por}\nSaldo anterior: ${fmt(a.valor_anterior)}\nNovo saldo: ${fmt(a.valor_novo)}\nDiferença: ${dif}\nMotivo: ${a.motivo||'—'}\nData ref.: ${a.data_referencia||'—'}\nStatus: ${a.status}`)
}

