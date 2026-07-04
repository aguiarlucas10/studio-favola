
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
// Uma RT PF paga gera automaticamente uma entrada tipo 'rt' com o mesmo contrato e valor.
// Retorna a entrada encontrada, ou null (não paga), ou undefined (paga sem entrada localizada).
function rtEntradaNoCaixa(r){
  if(r.status!=='Pago') return null
  return E.find(e => e.tipo_entrada==='rt'
    && (e.nome_contrato===r.projeto || e.projeto===r.projeto)
    && Math.abs((e.valor||0)-(r.valor_rt||0)) < 0.01)
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
      let caixa
      if(ent === null) caixa = '<span class="td-muted">—</span>'                       // não paga
      else if(ent)     caixa = `<span class="badge bg-green" title="Entrada de ${fmtD(ent.data_pagamento)}">✓ no caixa</span>`
      else             caixa = '<span class="badge bg-gray" title="Paga, mas sem entrada correspondente lançada">não localizado</span>'
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
