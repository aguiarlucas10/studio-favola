
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
  // Recarrega para limpar TUDO: arrays globais (P,E,S,R,C,AJ), usuário e o DOM
  // renderizado — sem isso os dados financeiros ficavam recuperáveis no DevTools
  location.reload()
}
async function checkSession(){
  const {data:{session}} = await db.auth.getSession()
  if(session) initApp()
}
// Sessão encerrada/expirada em qualquer momento → volta à tela de login.
// Guarda em currentUserId evita loop de reload na própria tela de login.
// typeof: currentUserId é declarado em data.js, carregado DEPOIS deste arquivo
db.auth.onAuthStateChange(event => {
  if(event === 'SIGNED_OUT' && typeof currentUserId !== 'undefined' && currentUserId) location.reload()
})
