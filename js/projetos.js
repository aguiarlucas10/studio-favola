
// ═══════════════════════════════════════════════
// PROJETOS
// ═══════════════════════════════════════════════
let pFilter='Todos'
function filterProjetos(f,btn){
  pFilter=f
  document.querySelectorAll('#page-projetos .filter-btn').forEach(b=>b.classList.remove('active'))
  btn.classList.add('active')
  if(f==='Resultado'){
    document.getElementById('proj-table').style.display='none'
    document.getElementById('proj-resultado').style.display='block'
    renderResultado()
  } else {
    document.getElementById('proj-table').style.display='block'
    document.getElementById('proj-resultado').style.display='none'
    renderProjetos()
  }
}
function renderProjetos(){
  const data = pFilter==='Todos'||pFilter==='Resultado' ? P : P.filter(p=>p.status===pFilter)
  document.getElementById('proj-count').textContent = `${data.length} contratos`
  if(!data.length){document.getElementById('proj-table').innerHTML='<div class="empty">Nenhum projeto encontrado</div>';return}
  document.getElementById('proj-table').innerHTML = `<div class="tbl-wrap"><table>
    <thead><tr><th><input type="checkbox" class="cb-row" onchange="toggleAll('contratos',this)"></th><th>Nº</th><th>Contrato</th><th>Cliente</th><th>Serviço</th><th>Valor</th><th>A Receber</th><th>Conta</th><th>Status</th><th>Cidade</th><th>Origem</th><th></th></tr></thead>
    <tbody>${data.map(p=>`<tr>
      <td><input type="checkbox" class="cb-row" data-table="contratos" data-id="${p.id}" onchange="onCheckChange()"></td>
      <td class="td-muted">${esc(p.numero||'—')}</td>
      <td class="td-bold" style="cursor:pointer;max-width:200px" onclick="showProjetoDrawer(${p.id})">${esc(p.nome_contrato)}</td>
      <td style="color:var(--preto-soft)">${esc(p.cliente)}</td>
      <td>${badge(p.servico||'—')}</td>
      <td class="td-money">${fmt(p.valor_contrato)}</td>
      <td class="td-money td-amber">${fmt(p.a_receber||0)}</td>
      <td>${contaBadge(p.conta)}</td>
      <td>${badge(p.status)}</td>
      <td class="td-muted">${esc(p.cidade||'')}${p.uf?'/'+esc(p.uf):''}</td>
      <td class="td-muted">${esc(p.origem||'—')}</td>
      <td style="white-space:nowrap"><button class="btn-edit" onclick="editItem('projeto',${p.id})">Editar</button></td>
    </tr>`).join('')}</tbody>
  </table></div>`
}

function renderResultado(){
  // Projetos ativos para rateio
  const ativos = P.filter(p=>p.status==='Ativo')
  const nAtivos = ativos.length || 1

  // Saídas gerais (sem contrato) — apenas tipos de custo operacional, excluindo retiradas/pro-labore
  const tiposOperacionais = ['projeto despesa','escritório despesa','marketing','honorários','imposto']
  const saidasGerais = S.filter(s => !s.contrato_id && tiposOperacionais.includes(s.tipo_saida) && s.status==='Pago')
  const totalGeral = saidasGerais.reduce((a,s)=>a+(s.valor||0),0)
  const rateioUnitario = totalGeral / nAtivos

  // Por projeto: entradas + RT recebidas - saídas diretas - rateio geral
  const resultado = P.map(p => {
    const entradas = E.filter(e=>e.contrato_id===p.id||e.nome_contrato===p.nome_contrato).reduce((a,e)=>a+(e.valor||0),0)
    const rtRecebida = R.filter(r=>(r.projeto===p.nome_contrato||r.projeto===p.projeto)&&r.status==='Pago').reduce((a,r)=>a+(r.valor_rt||0),0)
    const saidasDiretas = S.filter(s=>s.contrato_id===p.id && tiposOperacionais.includes(s.tipo_saida) && s.status==='Pago').reduce((a,s)=>a+(s.valor||0),0)
    const rateio = p.status==='Ativo' ? rateioUnitario : 0
    const receita = entradas + rtRecebida
    const custos = saidasDiretas + rateio
    const resultado = receita - custos
    const margem = receita > 0 ? (resultado/receita*100) : 0
    return {...p, entradas, rtRecebida, saidasDiretas, rateio, receita, custos, resultado, margem}
  }).filter(p=>p.receita>0||p.valor_contrato>0).sort((a,b)=>b.resultado-a.resultado)

  document.getElementById('proj-resultado').innerHTML = `
    <div class="panel" style="margin-bottom:14px">
      <div class="panel-hd">
        <span class="panel-title">Rateio de custos gerais</span>
        <span style="font-size:11px;color:var(--warm-gray)">${fmt(totalGeral)} ÷ ${nAtivos} projetos ativos = <strong style="color:var(--preto-soft)">${fmt(rateioUnitario)} / projeto</strong></span>
      </div>
      <div class="panel-bd" style="font-size:11px;color:var(--warm-gray);line-height:1.8">
        Saídas gerais consideradas: escritório, marketing, honorários, impostos e despesas gerais marcadas como <em>Geral</em> e pagas.
        Saídas vinculadas a contratos específicos são atribuídas diretamente ao projeto.
      </div>
    </div>
    <div class="tbl-wrap"><table>
      <thead><tr>
        <th>Projeto</th><th>Status</th>
        <th style="text-align:right">Entradas</th>
        <th style="text-align:right">RT Recebida</th>
        <th style="text-align:right">Receita Total</th>
        <th style="text-align:right">Custos Diretos</th>
        <th style="text-align:right">Rateio Geral</th>
        <th style="text-align:right">Custos Total</th>
        <th style="text-align:right">Resultado</th>
        <th style="text-align:right">Margem</th>
      </tr></thead>
      <tbody>
        ${resultado.map(p=>{
          const cor = p.resultado>=0 ? 'var(--emerald)' : 'var(--red)'
          return `<tr onclick="showProjetoDrawer(${p.id})" style="cursor:pointer">
            <td class="td-bold">${esc(p.nome_contrato)}</td>
            <td>${badge(p.status)}</td>
            <td class="td-money" style="text-align:right">${fmt(p.entradas)}</td>
            <td class="td-money" style="text-align:right;color:var(--amber)">${fmt(p.rtRecebida)}</td>
            <td class="td-money td-bold" style="text-align:right">${fmt(p.receita)}</td>
            <td class="td-money" style="text-align:right;color:var(--red)">${fmt(p.saidasDiretas)}</td>
            <td class="td-money" style="text-align:right;color:var(--warm-gray)">${p.rateio>0?fmt(p.rateio):'—'}</td>
            <td class="td-money" style="text-align:right;color:var(--red)">${fmt(p.custos)}</td>
            <td class="td-money td-bold" style="text-align:right;color:${cor}">${p.resultado>=0?'+':''}${fmt(p.resultado)}</td>
            <td style="text-align:right">
              <span style="font-family:'Libre Baskerville',serif;font-size:13px;color:${cor}">${p.margem.toFixed(1)}%</span>
              <div class="prog" style="margin-top:3px;width:60px;display:inline-block"><div class="prog-fill" style="width:${Math.min(Math.abs(p.margem),100)}%;background:${cor}"></div></div>
            </td>
          </tr>`}).join('')}
        <tr style="background:var(--bg);font-weight:700">
          <td colspan="2" style="padding:11px 14px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--warm-gray)">Total</td>
          <td class="td-money td-bold" style="text-align:right">${fmt(resultado.reduce((a,p)=>a+p.entradas,0))}</td>
          <td class="td-money" style="text-align:right;color:var(--amber)">${fmt(resultado.reduce((a,p)=>a+p.rtRecebida,0))}</td>
          <td class="td-money td-bold" style="text-align:right">${fmt(resultado.reduce((a,p)=>a+p.receita,0))}</td>
          <td class="td-money" style="text-align:right;color:var(--red)">${fmt(resultado.reduce((a,p)=>a+p.saidasDiretas,0))}</td>
          <td class="td-money" style="text-align:right;color:var(--warm-gray)">${fmt(totalGeral)}</td>
          <td class="td-money" style="text-align:right;color:var(--red)">${fmt(resultado.reduce((a,p)=>a+p.custos,0))}</td>
          <td class="td-money td-bold" style="text-align:right;color:var(--emerald)">${fmt(resultado.reduce((a,p)=>a+p.resultado,0))}</td>
          <td></td>
        </tr>
      </tbody>
    </table></div>`
}

function showProjetoDrawer(id){
  const p = P.find(x=>x.id===id); if(!p) return
  openDrawer(p.nome_contrato, `
    <div class="drawer-row"><span class="drawer-lbl">Cliente</span><span class="drawer-val">${esc(p.cliente)}</span></div>
    <div class="drawer-row"><span class="drawer-lbl">Contato</span><span class="drawer-val">${esc(p.contato||'—')}</span></div>
    <div class="drawer-row"><span class="drawer-lbl">Tipologia</span><span class="drawer-val">${esc(p.tipologia||'—')}</span></div>
    <div class="drawer-row"><span class="drawer-lbl">Serviço</span><span class="drawer-val">${esc(p.servico||'—')}</span></div>
    <div class="drawer-row"><span class="drawer-lbl">Valor do Contrato</span><span class="drawer-val">${fmt(p.valor_contrato)}</span></div>
    <div class="drawer-row"><span class="drawer-lbl">Parcelas</span><span class="drawer-val">${p.parcelas||1}x</span></div>
    <div class="drawer-row"><span class="drawer-lbl">A Receber</span><span class="drawer-val" style="color:var(--amber)">${fmt(p.a_receber||0)}</span></div>
    <div class="drawer-row"><span class="drawer-lbl">Conta</span><span class="drawer-val">${contaBadge(p.conta)}</span></div>
    <div class="drawer-row"><span class="drawer-lbl">Status</span><span class="drawer-val">${badge(p.status)}</span></div>
    <div class="drawer-row"><span class="drawer-lbl">Início</span><span class="drawer-val">${fmtD(p.data_inicio)}</span></div>
    <div class="drawer-row"><span class="drawer-lbl">Fim prev.</span><span class="drawer-val">${fmtD(p.data_fim)}</span></div>
    <div class="drawer-row"><span class="drawer-lbl">Localidade</span><span class="drawer-val">${esc(p.cidade||'')}${p.uf?'/'+esc(p.uf):''}</span></div>
    <div class="drawer-row"><span class="drawer-lbl">Origem</span><span class="drawer-val">${esc(p.origem||'—')}</span></div>
    <div class="drawer-row"><span class="drawer-lbl">M²</span><span class="drawer-val">${esc(p.metros_quadrados||'—')}</span></div>
    ${p.obs?`<div class="drawer-row"><span class="drawer-lbl">Obs</span><span class="drawer-val">${esc(p.obs)}</span></div>`:''}
    <div style="margin-top:16px"><button class="btn-primary" style="width:100%" onclick="closeDrawer();editItem('projeto',${p.id})">Editar este projeto</button></div>
  `)
}
