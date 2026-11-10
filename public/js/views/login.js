import { icon, wordmark } from '../ui.js';
import { state, setTheme, signIn, go, refreshUser } from '../app.js';

export async function render() {
  return {
    title: 'Sign in',
    html: `<div class="login">
      <section class="login-brand">
        ${wordmark()}
        <div class="illus"><img src="amini-kit/assets/bridge-mark-white.svg" alt="" width="320" style="height:auto"></div>
        <div class="login-hero">
          <div class="hero-light">Your papers.<br>One trusted assistant.</div>
          <p class="login-support">Bridge reads your Cabinet papers, briefings and the Directory so you can decide faster, with your data staying in your government’s own cloud.</p>
        </div>
      </section>
      <section class="login-form-side">
        <div class="row" style="justify-content:flex-end"><button class="icon-btn" id="theme" aria-label="Toggle theme">${icon(document.documentElement.dataset.theme === 'dark' ? 'sunny' : 'moon')}</button></div>
        <form class="login-form" id="form" novalidate>
          <div class="login-heading"><h4>Sign in to continue with Bridge</h4><p class="tiny">With your Amini Auth account.</p></div>
          <div id="error"></div>
          <div class="stack">
            <div class="field"><label for="email">Email</label><input class="input" id="email" type="email" placeholder="you@example.org" autocomplete="username" /></div>
            <div class="field"><label for="pw">Password</label><div class="input-wrap"><input class="input" id="pw" type="password" autocomplete="current-password" /><button type="button" class="icon-btn" id="eye" aria-label="Show password">${icon('eye')}</button></div></div>
          </div>
          <div class="row" style="justify-content:flex-end"><button class="am-btn am-btn--lead login-submit" type="submit"><span class="am-btn__lead">${icon('arrowRight', 's16')}</span>Sign in</button></div>
          <div class="divider-or">or</div>
          <button type="button" class="sso" id="ms"><span class="ms-logo"><i style="background:#f25022"></i><i style="background:#7fba00"></i><i style="background:#00a4ef"></i><i style="background:#ffb900"></i></span>Sign in with Microsoft</button>
          <p class="tiny muted">Your account is managed by Amini Auth. Ask your administrator to reset a password or to give you access.</p>
          <p class="tiny muted proto-note">Prototype: any email and a password of 4+ characters signs you in. Type <b>wrong</b> as the password to see the error.</p>
        </form>
      </section>
    </div>`,
    mount(root) {
      root.querySelector('#theme').onclick = () => { setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'); root.querySelector('#theme').innerHTML = icon(document.documentElement.dataset.theme === 'dark' ? 'sunny' : 'moon'); };
      root.querySelector('#eye').onclick = () => { const p = root.querySelector('#pw'); p.type = p.type === 'password' ? 'text' : 'password'; };
      const done = async () => { signIn(); const u = await refreshUser(); go(u.onboarded ? '#/research' : '#/onboarding/1'); };
      root.querySelector('#ms').onclick = done;
      root.querySelector('#form').onsubmit = (e) => {
        e.preventDefault();
        const email = root.querySelector('#email'), pw = root.querySelector('#pw');
        const bad = !email.value.includes('@') || pw.value.length < 4 || pw.value === 'wrong';
        email.classList.toggle('error', bad); pw.classList.toggle('error', bad);
        root.querySelector('#error').innerHTML = bad ? `<div class="alert danger"><span class="alert-icon">${icon('warning')}</span><div><b>Couldn’t sign you in</b><p class="small">Check your email and password and try again.</p></div></div>` : '';
        if (!bad) done();
      };
    },
  };
}
