
// ═══════════════════════════════════════════════
// SÓCIAS — lógica corrigida de divisão
// ═══════════════════════════════════════════════
function renderSocias(){
  const mes = mesAtual()

  // Para "Ambas", divide por 2 (sócias 50/50)
  const calcSocia = nome => {
    const retMes = S.filter(s => s.mes_ano===mes && ['retirada de lucros','pró-labore'].includes(s.tipo_saida))
    let pl=0, ret=0
    for(const s of retMes){
      const v = s.valor||0
      const parte = s.socia==='Ambas' ? v/2 : s.socia===nome ? v : 0
      if(s.tipo_saida==='pró-labore') pl += parte
      else ret += parte
    }
    // Total histórico
    let hist = 0
    for(const s of S.filter(s=>['retirada de lucros','pró-labore'].includes(s.tipo_saida))){
      const v = s.valor||0
      hist += s.socia==='Ambas' ? v/2 : s.socia===nome ? v : 0
    }
    // Entradas PF do mês (conta pessoal → retirada automática → divide por 2)
    const pfMes = E.filter(e=>e.mes_ano===mes&&(e.conta==='pessoal'||e.conta==='PF'))
    const pfVal = pfMes.reduce((a,e)=>a+(e.valor||0),0) / 2
    return {pl, ret, pfVal, hist}
  }

  document.getElementById('socias-cards').innerHTML = ['Fernanda','Laís'].map(nome=>{
    const d = calcSocia(nome)
    const total = d.pl + d.ret + d.pfVal
    return `<div class="socia-card">
      <div style="display:flex;align-items:center;gap:13px;margin-bottom:18px">
        <div class="socia-avatar"><span class="socia-initial">${nome[0]}</span></div>
        <div>
          <div style="font-family:'Libre Baskerville',serif;font-size:17px;color:var(--preto)">${nome}</div>
          <div style="font-size:10px;letter-spacing:.1em;color:var(--warm-gray);text-transform:uppercase;margin-top:2px">Sócia · 50%</div>
        </div>
      </div>
      <div class="socia-row"><span style="color:var(--warm-gray)">Pró-labore</span><strong style="font-family:'Libre Baskerville',serif">${fmt(d.pl)}</strong></div>
      <div class="socia-row"><span style="color:var(--warm-gray)">Retirada de lucros</span><strong style="font-family:'Libre Baskerville',serif">${fmt(d.ret)}</strong></div>
      <div class="socia-row"><span style="color:var(--warm-gray)">Pgtos PF (auto)</span><strong style="font-family:'Libre Baskerville',serif;color:var(--amber)">${fmt(d.pfVal)}</strong></div>
      <div class="socia-total"><span class="lbl">Total mês</span><span class="val">${fmt(total)}</span></div>
      <div class="socia-row" style="margin-top:6px"><span style="color:var(--warm-gray)">Total histórico (parte)</span><span style="font-family:'Libre Baskerville',serif;color:var(--text-muted)">${fmt(d.hist)}</span></div>
    </div>`}).join('')

  const hist = S.filter(s=>['retirada de lucros','pró-labore'].includes(s.tipo_saida))
  document.getElementById('socias-table').innerHTML = hist.length ? `<div class="tbl-wrap"><table>
    <thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Sócia</th><th>Conta</th><th>Valor Total</th><th>Por Sócia</th><th>Status</th><th></th></tr></thead>
    <tbody>${hist.map(s=>{
      const porSocia = s.socia==='Ambas' ? fmt((s.valor||0)/2)+' cada' : fmt(s.valor||0)
      return `<tr>
        <td class="td-muted">${fmtD(s.data_pagamento)}</td>
        <td>${esc(s.tipo_saida)}</td>
        <td class="td-bold">${esc(s.descricao)}</td>
        <td>${esc(s.socia||'—')}</td>
        <td>${contaBadge(s.conta)}</td>
        <td class="td-money td-red">${fmt(s.valor)}</td>
        <td class="td-money" style="color:var(--amber)">${porSocia}</td>
        <td>${badge(s.status)}</td>
        <td><button class="btn-edit" onclick="editItem('saida',${s.id})">Editar</button></td>
      </tr>`}).join('')}</tbody>
  </table></div>` : '<div class="empty">Nenhum registro</div>'
}
