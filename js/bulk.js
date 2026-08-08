// ═══════════════════════════════════════════════
// BULK SELECTION
// ═══════════════════════════════════════════════
function getSelected(){
  return [...document.querySelectorAll('.cb-row[data-table]:checked')].map(cb=>({table:cb.dataset.table, id:parseInt(cb.dataset.id)}))
}

function onCheckChange(){
  const sel = getSelected()
  const bar = document.getElementById('bulk-bar')
  const count = document.getElementById('bulk-count')
  if(sel.length > 0){
    bar.classList.add('visible')
    count.textContent = `${sel.length} selecionado${sel.length>1?'s':''}`
  } else {
    bar.classList.remove('visible')
  }
}

function toggleAll(table, masterCb){
  document.querySelectorAll(`.cb-row[data-table="${table}"]`).forEach(cb=>cb.checked=masterCb.checked)
  onCheckChange()
}

function clearSelection(){
  document.querySelectorAll('.cb-row').forEach(cb=>cb.checked=false)
  document.getElementById('bulk-bar').classList.remove('visible')
}

async function bulkDelete(){
  const sel = getSelected()
  if(!sel.length) return
  const tables = [...new Set(sel.map(s=>s.table))]
  const label = tables.map(t=>({contratos:'projeto',entradas:'entrada',saidas:'saída',rt_comissoes:'RT'}[t]||t)).join('/')
  confirmDialog(
    `Apagar ${sel.length} registro${sel.length>1?'s':''}?`,
    `Isso apagará permanentemente ${sel.length} ${label}${sel.length>1?'s':''} selecionado${sel.length>1?'s':''}. Essa ação não pode ser desfeita.`,
    async ()=>{
      // Group by table and delete in batches
      for(const tbl of tables){
        const ids = sel.filter(s=>s.table===tbl).map(s=>s.id)
        const {error} = await db.from(tbl).delete().in('id',ids)
        if(error){ toast(friendlyError(error), 'error', 6000); return }
      }
      clearSelection()
      await loadData()
      // Re-render all affected pages
      tables.forEach(tbl=>reRender[tbl]?.())
    }
  )
}

async function bulkUpdateStatus(){
  const sel = getSelected()
  const newStatus = document.getElementById('bulk-status-val').value
  if(!sel.length || !newStatus) return
  const tables = [...new Set(sel.map(s=>s.table))]
  // Entradas PF quitadas em massa precisam ganhar a saída-espelho [TD]
  const quitadasPF = newStatus==='Pago'
    ? sel.filter(s=>s.table==='entradas')
        .map(s=>E.find(e=>e.id===s.id))
        .filter(e=>e && e.status!=='Pago' && (e.conta==='pessoal'||e.conta==='PF'))
    : []
  for(const tbl of tables){
    const ids = sel.filter(s=>s.table===tbl).map(s=>s.id)
    const {error} = await db.from(tbl).update({status:newStatus}).in('id',ids)
    if(error){ toast(friendlyError(error), 'error', 6000); return }
  }
  for(const e of quitadasPF) await garanteEspelhoTD(e)
  clearSelection()
  await loadData()
  tables.forEach(tbl=>reRender[tbl]?.())
}

async function bulkDuplicate(){
  const sel = getSelected()
  if(!sel.length) return
  const tables = [...new Set(sel.map(s=>s.table))]

  // Campos que NÃO podem ser copiados numa duplicação:
  // - id e timestamps: gerados pelo banco
  // - entradas.is_retirada_automatica: coluna GENERATED ALWAYS — o Postgres
  //   rejeita o INSERT inteiro se ela vier no payload (era a causa do
  //   "Duplicar" falhar em entradas)
  // - contratos.numero: UNIQUE — a cópia colidiria com o original
  const omitComum = ['id','created_at','updated_at']
  const omitPorTabela = { entradas:['is_retirada_automatica'], contratos:['numero'] }
  const strip = (obj, tbl) => {
    const omit = [...omitComum, ...(omitPorTabela[tbl]||[])]
    return Object.fromEntries(Object.entries(obj).filter(([k])=>!omit.includes(k)))
  }

  let total = 0
  for(const tbl of tables){
    const ids = sel.filter(s=>s.table===tbl).map(s=>s.id)
    // Busca os registros originais localmente (já carregados)
    const fonte = { contratos:P, entradas:E, saidas:S, rt_comissoes:R }[tbl] || []
    const registros = ids.map(id=>fonte.find(r=>r.id===id)).filter(Boolean).map(r=>strip(r,tbl))
    if(!registros.length) continue
    const {error} = await db.from(tbl).insert(registros)
    if(error){
      console.error(`[Duplicar ${tbl}] payload que falhou:`, registros)
      toast(friendlyError(error), 'error', 8000)
      return
    }
    total += registros.length
  }

  clearSelection()
  await loadData()
  tables.forEach(tbl=>reRender[tbl]?.())

  const aviso = tables.includes('contratos') ? ' · preencha o nº do novo contrato' : ''
  toast(`⧉ ${total} registro${total>1?'s':''} duplicado${total>1?'s':''}${aviso}`, 'info', 4500)
}
