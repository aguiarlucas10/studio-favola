// ═══════════════════════════════════════════════
// AJUSTE DE CAIXA — aprovação assíncrona
// ═══════════════════════════════════════════════
let AJ = []  // ajustes pendentes carregados

async function loadAjustes(){
  const { data, error } = await db.from('ajustes_caixa').select('*').order('created_at',{ascending:false}).limit(20)
  if(error) toast(friendlyError(error), 'error', 6000)
  AJ = data || []
}

// Verifica se há ajuste pendente e mostra banner no dashboard
function checkAjustePendente(){
  const pendente = AJ.find(a=>a.status==='pendente')
  const banner = document.getElementById('dash-ajuste-banner')
  if(!banner) return
  if(!pendente){ banner.style.display='none'; return }

  // Identidade SÓ por ID autenticado (nome de exibição é editável — não serve
  // como prova). Pedido antigo sem ID não é aprovável: só rejeitar e refazer.
  const temId = !!pendente.solicitado_por_id
  const jaSolicitou = temId && pendente.solicitado_por_id === currentUserId
  const jaAprovou = !!pendente.aprovado_por_id && pendente.aprovado_por_id === currentUserId
  const podeAprovar = temId && !jaSolicitou && !jaAprovou

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
        : !temId
          ? `<span style="font-size:10px;opacity:.7;padding:6px 0">Pedido antigo sem identificação — rejeite e solicite de novo</span>
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
      <button class="btn-save" id="aj-btn-solicitar" onclick="solicitarAjusteCaixa()" ${pendente?'disabled style="opacity:.4;cursor:not-allowed"':''}>Solicitar Ajuste</button>
    </div>`
  document.getElementById('modal-overlay').classList.add('open')
  if(!pendente) document.getElementById('aj-data').valueAsDate = new Date()
}

async function solicitarAjusteCaixa(){
  const novoSaldo = parseFloat(document.getElementById('aj-valor').value)
  if(isNaN(novoSaldo)){ toast('Digite o novo saldo.', 'error'); return }
  const motivo = document.getElementById('aj-motivo').value || ''
  const data = document.getElementById('aj-data').value
  const saldoAtual = calcSaldoAcumulado()
  const diferenca = novoSaldo - saldoAtual
  if(Math.abs(diferenca) < 0.01){ toast('Saldo já está correto, nenhum ajuste necessário.', 'info'); return }

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
  if(error){ toast(friendlyError(error), 'error', 6000); return }

  closeModal()
  await loadAjustes()
  checkAjustePendente()

  toast('✓ Solicitação enviada · aguardando aprovação da outra sócia', 'info')
}

async function responderAjuste(id, decisao){
  const ajuste = AJ.find(a=>a.id===id)
  if(!ajuste) return
  // Quem solicitou não pode aprovar o próprio ajuste (validado pelo ID autenticado)
  if(ajuste.solicitado_por_id && ajuste.solicitado_por_id === currentUserId){
    toast('Você solicitou este ajuste: apenas a outra sócia pode aprová-lo ou rejeitá-lo.', 'error')
    return
  }

  if(decisao === 'rejeitado'){
    const { error } = await db.from('ajustes_caixa').update({ status:'rejeitado', aprovado_por: currentUserName, aprovado_por_id: currentUserId, updated_at: new Date().toISOString() }).eq('id',id)
    if(error){ toast(friendlyError(error), 'error', 6000); return }
    await loadAjustes(); checkAjustePendente()
    return
  }

  // Pedido legado sem identificação do solicitante não é aprovável pelo app
  if(!ajuste.solicitado_por_id){
    toast('Este pedido é antigo e não identifica quem solicitou. Rejeite-o e crie um novo ajuste.', 'error', 7000)
    return
  }

  // Aprovação ATÔMICA no banco: a RPC valida (pendente, aprovador ≠ solicitante),
  // lança a entrada/saída de conciliação e marca aprovado na mesma transação —
  // nunca aplica duas vezes nem aprova sem lançar (docs/migracao-2026-08.sql, Seção 5).
  const { error } = await db.rpc('aprovar_ajuste', { p_id: id })
  if(error){ toast(friendlyError(error), 'error', 7000); return }

  await loadData(); await loadAjustes()
  renderDashboard(); checkAjustePendente()

  toast(`✓ Ajuste aprovado e aplicado · novo caixa ${fmt(ajuste.valor_novo)}`, 'success', 5000)
}

// Guarda de duplo clique (o banner/modal fica aberto durante o await).
// responderAjuste não tem botão único — aprovar e rejeitar são dois — então a
// trava é só pela flag; o banner é reconstruído por checkAjustePendente ao fim.
solicitarAjusteCaixa = travaDuplo(solicitarAjusteCaixa, 'aj-btn-solicitar')
responderAjuste = travaDuplo(responderAjuste, null)

function verDetalheAjuste(id){
  const a = AJ.find(x=>x.id===id)
  if(!a) return
  const dif = a.diferenca >= 0 ? `+${fmt(a.diferenca)}` : fmt(a.diferenca)
  openDrawer(`Ajuste #${a.id}`, `
    <div class="drawer-row"><span class="drawer-lbl">Solicitado por</span><span class="drawer-val">${esc(a.solicitado_por)}</span></div>
    <div class="drawer-row"><span class="drawer-lbl">Saldo anterior</span><span class="drawer-val">${fmt(a.valor_anterior)}</span></div>
    <div class="drawer-row"><span class="drawer-lbl">Novo saldo</span><span class="drawer-val">${fmt(a.valor_novo)}</span></div>
    <div class="drawer-row"><span class="drawer-lbl">Diferença</span><span class="drawer-val" style="color:${a.diferenca>=0?'var(--emerald)':'var(--red)'}">${dif}</span></div>
    <div class="drawer-row"><span class="drawer-lbl">Motivo</span><span class="drawer-val">${esc(a.motivo||'—')}</span></div>
    <div class="drawer-row"><span class="drawer-lbl">Data ref.</span><span class="drawer-val">${fmtD(a.data_referencia)}</span></div>
    <div class="drawer-row"><span class="drawer-lbl">Status</span><span class="drawer-val">${badge(a.status)}</span></div>
  `)
}

