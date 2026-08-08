// ═══════════════════════════════════════════════
let csvRows = []  // linhas parseadas aguardando classificação

const tiposSaida = ['escritório despesa','projeto despesa','marketing','honorários','imposto','retirada de lucros','pró-labore','outro']

// Mapeamento automático por palavras-chave na descrição
const autoClassMap = [
  {k:['openai','chatgpt','adobe','notion','google','canva','figma','spotify','netflix','dropbox','icloud'],   t:'escritório despesa'},
  {k:['imposto','das ','irpf','irpj','receita federal','simples'],                                            t:'imposto'},
  {k:['instagram','facebook','meta ads','tráfego','marketing'],                                               t:'marketing'},
  {k:['pro-labore','pró-labore','prolabore'],                                                                  t:'pró-labore'},
  {k:['retirada','dividendo','lucro'],                                                                         t:'retirada de lucros'},
  {k:['contabilidade','contador','escritório contabil','contabil'],                                            t:'honorários'},
]

function autoClassificar(desc){
  const d = (desc||'').toLowerCase()
  for(const {k,t} of autoClassMap) if(k.some(w=>d.includes(w))) return t
  return 'escritório despesa'
}

function openImportCSV(){
  document.getElementById('import-panel').style.display='block'
  document.getElementById('import-panel').scrollIntoView({behavior:'smooth'})
}
function closeImportCSV(){
  document.getElementById('import-panel').style.display='none'
  document.getElementById('import-preview').innerHTML=''
  document.getElementById('csv-file').value=''
  csvRows=[]
}
function resetImport(){
  document.getElementById('import-preview').innerHTML=''
  document.getElementById('csv-file').value=''
  csvRows=[]
}

function parseCSV(){
  const file = document.getElementById('csv-file').files[0]
  const tipo = document.getElementById('csv-tipo').value
  if(!file) return
  const reader = new FileReader()
  reader.onload = e => {
    const text = e.target.result
    const lines = text.split('\n').map(l=>l.trim()).filter(Boolean)
    const header = lines[0].toLowerCase()
    csvRows = []

    if(tipo==='cartao'){
      // Cartão Nubank: date,title,amount
      // Positivos = compras/despesas, Negativos = pagamentos/créditos (ignorar)
      lines.slice(1).forEach(line=>{
        const parts = parseCSVLine(line)
        if(parts.length < 3) return
        const [date, title, amountStr] = parts
        const amount = parseFloat(amountStr)||0
        if(amount <= 0) return  // ignora pagamentos e créditos
        csvRows.push({
          data: date,  // já em YYYY-MM-DD
          desc: title,
          valor: amount,
          tipo: autoClassificar(title),
          vinculo: '',
          ignorar: false
        })
      })
    } else {
      // Extrato conta: Data,Valor,Identificador,Descrição
      lines.slice(1).forEach(line=>{
        const parts = parseCSVLine(line)
        if(parts.length < 4) return
        const [data, valorStr, , desc] = parts
        const valor = parseFloat(valorStr)||0
        // Formata data de DD/MM/YYYY para YYYY-MM-DD
        const [d,m,y] = data.split('/')
        const dataISO = y && m && d ? `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}` : data
        csvRows.push({
          data: dataISO,
          desc: desc,
          valor: valor,
          isEntrada: valor > 0,
          tipo: valor > 0 ? 'entrada' : autoClassificar(desc),
          vinculo: '',
          ignorar: false
        })
      })
    }

    renderImportPreview()
  }
  reader.readAsText(file, 'UTF-8')
}

function parseCSVLine(line){
  // Lida com aspas e vírgulas dentro de campos
  const result = []
  let cur = '', inQ = false
  for(let i=0;i<line.length;i++){
    const ch = line[i]
    if(ch==='"'){ if(inQ && line[i+1]==='"'){cur+='"';i++}else inQ=!inQ }
    else if(ch===','&&!inQ){ result.push(cur.trim()); cur='' }
    else cur+=ch
  }
  result.push(cur.trim())
  return result
}

function renderImportPreview(){
  const tipo = document.getElementById('csv-tipo').value
  const projOpts = P.map(p=>`<option value="${p.id}|${esc(p.nome_contrato)}">${esc(p.nome_contrato)}</option>`).join('')
  const tipoOpts = tiposSaida.map(t=>`<option value="${t}">${t}</option>`).join('')

  const totalImportar = csvRows.filter(r=>!r.ignorar).length
  const totalValor = csvRows.filter(r=>!r.ignorar).reduce((a,r)=>a+Math.abs(r.valor),0)

  document.getElementById('import-preview').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <span style="font-size:11px;color:var(--warm-gray)">${csvRows.length} transações encontradas · <strong>${totalImportar} para importar</strong> · ${fmt(totalValor)}</span>
      <div style="display:flex;gap:8px">
        <button class="btn-secondary" onclick="csvIgnorarTodos()" style="font-size:10px;padding:6px 12px">Desmarcar todos</button>
        <button class="btn-primary" id="csv-import-btn" onclick="importarCSV()" style="font-size:10px;padding:6px 14px">✓ Importar selecionados</button>
      </div>
    </div>
    <div class="tbl-wrap" style="max-height:420px;overflow-y:auto">
    <table>
      <thead><tr>
        <th><input type="checkbox" checked onchange="csvToggleAll(this)"></th>
        <th>Data</th><th>Descrição</th>
        ${tipo==='extrato'?'<th>Tipo</th>':''}
        <th>Classificação</th><th>Vínculo Projeto</th>
        <th style="text-align:right">Valor</th>
      </tr></thead>
      <tbody id="import-tbody">
        ${csvRows.map((r,i)=>{
          const corValor = tipo==='extrato' && r.isEntrada ? 'color:var(--emerald)' : 'color:var(--red)'
          const sinal = tipo==='extrato' && r.isEntrada ? '+' : '-'
          return `<tr id="csv-row-${i}" style="${r.ignorar?'opacity:.35':''}">
            <td><input type="checkbox" ${r.ignorar?'':'checked'} onchange="csvToggleRow(${i},this)"></td>
            <td class="td-muted">${fmtD(r.data)}</td>
            <td style="max-width:260px;font-size:11px">${esc(r.desc)}</td>
            ${tipo==='extrato'?`<td><span class="badge ${r.isEntrada?'bg-green':'bg-red'}">${r.isEntrada?'Entrada':'Saída'}</span></td>`:''}
            <td>
              ${tipo==='extrato'&&r.isEntrada
                ? `<select onchange="csvRows[${i}].vinculo=this.value" style="font-size:11px;padding:4px 6px;border:1px solid var(--border);border-radius:3px;font-family:'Spartan',sans-serif;width:100%">
                    <option value="">— Contrato —</option>${projOpts}
                  </select>`
                : `<select onchange="csvRows[${i}].tipo=this.value" style="font-size:11px;padding:4px 6px;border:1px solid var(--border);border-radius:3px;font-family:'Spartan',sans-serif;width:100%">
                    ${tiposSaida.map(t=>`<option value="${t}" ${t===r.tipo?'selected':''}>${t}</option>`).join('')}
                  </select>`
              }
            </td>
            <td>
              <select onchange="csvRows[${i}].vinculo=this.value" style="font-size:11px;padding:4px 6px;border:1px solid var(--border);border-radius:3px;font-family:'Spartan',sans-serif;width:100%">
                <option value="">Geral</option>${projOpts}
              </select>
            </td>
            <td style="text-align:right;font-family:'Libre Baskerville',serif;font-size:12px;${corValor}">${sinal}${fmt(Math.abs(r.valor))}</td>
          </tr>`}).join('')}
      </tbody>
    </table></div>`
}

function csvToggleAll(cb){
  csvRows.forEach(r=>r.ignorar=!cb.checked)
  renderImportPreview()
}
function csvToggleRow(i, cb){
  csvRows[i].ignorar = !cb.checked
  const row = document.getElementById(`csv-row-${i}`)
  if(row) row.style.opacity = cb.checked ? '1' : '.35'
  // Atualiza contador
  const total = csvRows.filter(r=>!r.ignorar)
  const el = document.getElementById('import-preview').querySelector('span')
  if(el) el.innerHTML = `${csvRows.length} transações encontradas · <strong>${total.length} para importar</strong> · ${fmt(total.reduce((a,r)=>a+Math.abs(r.valor),0))}`
}
function csvIgnorarTodos(){
  csvRows.forEach(r=>r.ignorar=true)
  renderImportPreview()
}

async function importarCSV(){
  const tipo = document.getElementById('csv-tipo').value
  const contaGlobal = document.getElementById('csv-conta').value
  const paraImportar = csvRows.filter(r=>!r.ignorar)
  if(!paraImportar.length){ toast('Nenhuma linha selecionada.', 'error'); return }

  let entradas=[], saidas=[]

  for(const r of paraImportar){
    const mesAno = mesAnoDeData(r.data)
    const vinculo = r.vinculo || ''
    const [cid, cnome] = vinculo ? vinculo.split('|') : [null,null]
    const proj = cnome ? P.find(p=>p.nome_contrato===cnome) : null

    if(tipo==='extrato' && r.isEntrada){
      entradas.push({
        contrato_id: cid?parseInt(cid):null, nome_contrato:cnome||null,
        cliente:proj?.cliente||null, tipo_entrada:'projeto',
        valor:r.valor, data_pagamento:r.data, conta:contaGlobal,
        forma_pagto:'PIX', status:'Pago', mes_ano:mesAno,
        obs:`[Importado CSV] ${r.desc}`
      })
    } else {
      saidas.push({
        tipo_saida: r.tipo, descricao:r.desc,
        // Math.abs: no extrato do Nubank as saídas vêm negativas, e o app
        // trata `saidas.valor` como grandeza positiva (calcSaldoAcumulado faz
        // entradas − saídas). Gravar negativo faria a despesa AUMENTAR o caixa.
        valor: Math.abs(r.valor), data_pagamento:r.data,
        conta: contaGlobal, status:'Pago', mes_ano:mesAno,
        contrato_id: cid?parseInt(cid):null,
        nome_contrato: cnome||null,
        obs:`[Importado CSV]`
      })
    }
  }

  // Inserir em lotes — erro em um lote não pode ser silencioso: a sócia
  // precisa saber O QUE falhou sem abrir o console
  let erros = 0
  if(entradas.length){
    const {error} = await db.from('entradas').insert(entradas)
    if(error){ erros++; toast('Falha ao importar as entradas: '+friendlyError(error), 'error', 8000) }
  }
  if(saidas.length){
    const {error} = await db.from('saidas').insert(saidas)
    if(error){ erros++; toast('Falha ao importar as saídas: '+friendlyError(error), 'error', 8000) }
  }
  if(erros) return

  const msg = `✓ Importados: ${entradas.length} entradas + ${saidas.length} saídas`
  closeImportCSV()
  await loadData()
  renderFinanceiro()
  toast(msg, 'success')
}
importarCSV = travaDuplo(importarCSV, 'csv-import-btn')

