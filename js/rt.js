
// ═══════════════════════════════════════════════
// RT
// ═══════════════════════════════════════════════
let rtFilter='Todos'
function filterRT(f,btn){
  rtFilter=f
  document.querySelectorAll('#page-rt .filter-btn').forEach(b=>b.classList.remove('active'))
  btn.classList.add('active')
  renderRTTable()
}

// Concilia RT com o Financeiro: procura a entrada correspondente a uma comissão paga.
// Uma RT PF paga pelo fluxo novo gera automaticamente uma entrada tipo 'rt' de mesmo
// contrato e valor. A maioria das comissões (PJ, ou pagas antes dessa automação) não
// tem entrada separada — a própria RT paga já é o registro do recebimento. Por isso
// marcamos SÓ o caso positivo (✓ no caixa) e deixamos o resto em branco, sem alarmar.
function rtEntradaNoCaixa(r){
  if(r.status!=='Pago' || !r.projeto) return null
  return E.find(e => (e.tipo_entrada||'').toLowerCase()==='rt'
    && e.nome_contrato===r.projeto
    && aprox(e.valor, r.valor_rt))
}

function renderRT(){
  const total = R.reduce((a,r)=>a+(r.valor_rt||0),0)
  const pend  = R.filter(r=>r.status==='A receber').reduce((a,r)=>a+(r.a_receber||0),0)
  const inad  = R.filter(r=>r.status==='Inadimplência').reduce((a,r)=>a+(r.valor_rt||0),0)
  document.getElementById('rt-count').textContent = `${R.length} registros`
  document.getElementById('rt-stats').innerHTML = `
    <div class="stat-card green"><div class="stat-lbl">Total RT histórico</div><div class="stat-val">${fmt(total)}</div></div>
    <div class="stat-card amber"><div class="stat-lbl">A Receber</div><div class="stat-val">${fmt(pend)}</div></div>
    <div class="stat-card red"><div class="stat-lbl">Inadimplência</div><div class="stat-val">${fmt(inad)}</div></div>`
  renderRTTable()
}

function renderRTTable(){
  const data = rtFilter==='Todos' ? R : R.filter(r=>r.status===rtFilter)
  if(!data.length){document.getElementById('rt-table').innerHTML='<div class="empty">Nenhuma RT</div>';return}
  document.getElementById('rt-table').innerHTML=`<div class="tbl-wrap"><table>
    <thead><tr><th><input type="checkbox" class="cb-row" onchange="toggleAll('rt_comissoes',this)"></th><th>Projeto</th><th>Fornecedor</th><th>Categoria</th><th>Data</th><th>V. Venda</th><th>%RT</th><th>V. RT</th><th>A Receber</th><th>No caixa?</th><th>Conta</th><th>Status</th><th></th></tr></thead>
    <tbody>${data.map(r=>{
      const parc = (r.parcelas||1) > 1 ? `<div style="font-size:9px;color:var(--warm-gray)">${r.parcelas} parcelas</div>` : ''
      const ent = rtEntradaNoCaixa(r)
      // Positivo apenas: marca quando a comissão paga tem entrada vinculada no caixa;
      // caso contrário fica em branco (a RT paga já é o registro do recebimento).
      const caixa = ent
        ? `<span class="badge bg-green" title="Entrada de ${fmtD(ent.data_pagamento)} no Financeiro">✓ no caixa</span>`
        : '<span class="td-muted">—</span>'
      return `<tr>
      <td><input type="checkbox" class="cb-row" data-table="rt_comissoes" data-id="${r.id}" onchange="onCheckChange()"></td>
      <td class="td-bold">${esc(r.projeto)}</td>
      <td>${esc(r.fornecedor||'—')}</td>
      <td>${badge(r.categoria||'—')}</td>
      <td class="td-muted">${fmtD(r.data_fechamento)}</td>
      <td class="td-money">${r.valor_venda?fmt(r.valor_venda):'—'}</td>
      <td class="td-muted">${r.percentual_rt?(r.percentual_rt*100).toFixed(0)+'%':'—'}</td>
      <td class="td-money">${fmt(r.valor_rt)}</td>
      <td class="td-money td-amber">${fmt(r.a_receber||0)}${parc}</td>
      <td>${caixa}</td>
      <td>${contaBadge(r.conta)}</td>
      <td>${badge(r.status)}</td>
      <td><button class="btn-edit" onclick="editItem('rt',${r.id})">Editar</button></td>
    </tr>`}).join('')}</tbody>
  </table></div>`
}
