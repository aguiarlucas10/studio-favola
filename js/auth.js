
// ═══════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════
async function doLogin() {
  const email=g('inp-email'), pass=g('inp-pass')
  const btn=document.getElementById('btn-login'), err=document.getElementById('login-error')
  err.style.display='none'; btn.disabled=true; btn.textContent='Entrando...'
  const {error} = await db.auth.signInWithPassword({email,password:pass})
  if(error){err.textContent='Email ou senha incorretos.';err.style.display='block';btn.disabled=false;btn.textContent='Entrar'}
  else initApp()
}
async function doLogout(){
  await db.auth.signOut()
  document.getElementById('app').style.display='none'
  document.getElementById('login-screen').style.display='flex'
}
async function checkSession(){
  const {data:{session}} = await db.auth.getSession()
  if(session) initApp()
}
