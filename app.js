import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ======= CONFIG: fill these with your Supabase project settings =======
const SUPABASE_URL = 'https://afdgcszxttuqnqxesvjb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmZGdjc3p4dHR1cW5xeGVzdmpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NDU2MTAsImV4cCI6MjA3MDIyMTYxMH0.rI-q8BsEywmF7iw30pO77qINtPT07X4VvCqIUaZ7ASs';
const REQUIRED_CORRECT = 5; // all 5 must be correct

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// UI elements
const btnShowLogin = document.getElementById('btn-show-login');
const btnShowSignup = document.getElementById('btn-show-signup');
const btnLogout = document.getElementById('btn-logout');

const sectionAuth = document.getElementById('auth-forms');
const sectionApp = document.getElementById('app');

const signupCard = document.getElementById('signup');
const loginCard = document.getElementById('login');
const linkShowLogin = document.getElementById('link-show-login');
const linkShowSignup = document.getElementById('link-show-signup');

const signupEmail = document.getElementById('signup-email');
const signupPassword = document.getElementById('signup-password');
const signupName = document.getElementById('signup-name');
const btnSignup = document.getElementById('btn-signup');

const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const btnLogin = document.getElementById('btn-login');

const quizDiv = document.getElementById('quiz');
const btnSubmitQuiz = document.getElementById('btn-submit-quiz');
const resultDiv = document.getElementById('result');
const attemptsInfo = document.getElementById('attempts-info');

// Simple UI state helpers
function showLogin() {
  signupCard.classList.add('hidden');
  loginCard.classList.remove('hidden');
}
function showSignup() {
  loginCard.classList.add('hidden');
  signupCard.classList.remove('hidden');
}
function showApp() {
  sectionAuth.classList.add('hidden');
  sectionApp.classList.remove('hidden');
  btnLogout.classList.remove('hidden');
}
function showAuth() {
  sectionApp.classList.add('hidden');
  sectionAuth.classList.remove('hidden');
  btnLogout.classList.add('hidden');
}

// Wire up header buttons
btnShowLogin.addEventListener('click', (e) => { e.preventDefault(); showLogin(); });
btnShowSignup.addEventListener('click', (e) => { e.preventDefault(); showSignup(); });
linkShowLogin.addEventListener('click', (e) => { e.preventDefault(); showLogin(); });
linkShowSignup.addEventListener('click', (e) => { e.preventDefault(); showSignup(); });

// Auth actions
btnSignup.addEventListener('click', async () => {
  btnSignup.disabled = true;
  const email = signupEmail.value.trim();
  const password = signupPassword.value.trim();
  const name = signupName.value.trim();

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    alert('Sign up error: ' + error.message);
    btnSignup.disabled = false;
    return;
  }
  // Create profile row
  const user = data.user;
  if (user) {
    await supabase.from('profiles').insert({ user_id: user.id, full_name: name }).catch(()=>{});
  }
  alert('Check your email to confirm account (if confirmation is enabled).');
  btnSignup.disabled = false;
  showLogin();
});

btnLogin.addEventListener('click', async () => {
  btnLogin.disabled = true;
  const email = loginEmail.value.trim();
  const password = loginPassword.value.trim();

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) alert('Login error: ' + error.message);
  btnLogin.disabled = false;
});

btnLogout.addEventListener('click', async () => {
  await supabase.auth.signOut();
});

// Listen to auth state
supabase.auth.onAuthStateChange(async (event, session) => {
  if (session?.user) {
    showApp();
    loadQuiz();
    // try to fetch attempts row for info (optional)
    await refreshAttemptsInfo();
  } else {
    showAuth();
  }
});

async function refreshAttemptsInfo() {
  // Optional: query attempts for today to show attempts used
  // We'll compute date in user's local timezone; server uses TZ Asia/Karachi for enforcement.
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return;
  const { data, error } = await supabase
    .from('attempts')
    .select('attempts, passed')
    .eq('user_id', user.id)
    .eq('date', todayStr)
    .maybeSingle();

  if (error) {
    attemptsInfo.textContent = 'You have 2 attempts per day.';
    return;
  }
  if (!data) {
    attemptsInfo.textContent = 'You have 2 attempts today.';
    return;
  }
  const left = Math.max(0, 2 - (data.attempts || 0));
  if (data.passed) attemptsInfo.textContent = `Already marked present today. Attempts used: ${data.attempts}.`;
  else attemptsInfo.textContent = `Attempts used today: ${data.attempts}. Attempts left: ${left}.`;
}

async function loadQuiz() {
  quizDiv.innerHTML = '<p class="muted">Loading quiz…</p>';
  const { data, error } = await supabase.rpc('get_quiz', { n: 5 });
  if (error) {
    quizDiv.innerHTML = '<p>Failed to load quiz.</p>';
    console.error(error);
    return;
  }
  renderQuiz(data || []);
}

function renderQuiz(questions) {
  quizDiv.innerHTML = '';
  questions.forEach((q, idx) => {
    const qEl = document.createElement('div');
    qEl.className = 'question';
    qEl.innerHTML = `<h4>Q${idx + 1}. ${escapeHtml(q.text)}</h4>`;

    (q.options || []).forEach((opt, oi) => {
      const id = `q${idx}_opt${oi}`;
      const label = document.createElement('label');
      label.className = 'option';
      label.innerHTML = `
        <input type="radio" name="q${idx}" value="${oi}" data-qid="${q.id}" id="${id}">
        ${escapeHtml(opt)}
      `;
      qEl.appendChild(label);
    });
    quizDiv.appendChild(qEl);
  });
}

btnSubmitQuiz.addEventListener('click', async () => {
  resultDiv.className = 'result';
  resultDiv.textContent = '';

  const answers = [];
  const questionBlocks = quizDiv.querySelectorAll('.question');
  if (questionBlocks.length === 0) {
    resultDiv.classList.add('fail');
    resultDiv.textContent = 'Quiz not loaded.';
    return;
  }
  // Collect answers
  questionBlocks.forEach((qEl, qi) => {
    const chosen = qEl.querySelector(`input[name="q${qi}"]:checked`);
    if (!chosen) return;
    const question_id = chosen.getAttribute('data-qid');
    const selected = parseInt(chosen.value, 10);
    answers.push({ question_id, selected });
  });

  if (answers.length !== questionBlocks.length) {
    resultDiv.classList.add('fail');
    resultDiv.textContent = 'Please answer all questions.';
    return;
  }

  btnSubmitQuiz.disabled = true;
  try {
    const { data, error } = await supabase.rpc('mark_attendance', {
      submissions: answers,
      required_correct: REQUIRED_CORRECT
    });
    if (error) throw error;

    await refreshAttemptsInfo();

    switch (data.status) {
      case 'passed':
        resultDiv.classList.add('success');
        resultDiv.textContent = `✅ Attendance marked. Correct: ${data.correct}/${REQUIRED_CORRECT}. Attempts used: ${data.attempts}.`;
        break;
      case 'failed_try_again':
        resultDiv.classList.add('fail');
        resultDiv.textContent = `❌ Not enough correct (${data.correct}/${REQUIRED_CORRECT}). Attempts used: ${data.attempts} (max 2). Try again.`;
        break;
      case 'failed_locked':
        resultDiv.classList.add('fail');
        resultDiv.textContent = `❌ Wrong (${data.correct}/${REQUIRED_CORRECT}). Attempts used: ${data.attempts}. You are locked for today.`;
        break;
      case 'locked':
        resultDiv.classList.add('fail');
        resultDiv.textContent = '⛔ You are already out of attempts for today.';
        break;
      case 'already_passed':
        resultDiv.classList.add('success');
        resultDiv.textContent = '✅ Already marked present today.';
        break;
      default:
        resultDiv.classList.add('fail');
        resultDiv.textContent = 'Something went wrong.';
        break;
    }
  } catch (err) {
    console.error(err);
    resultDiv.classList.add('fail');
    resultDiv.textContent = 'Error submitting. Check console.';
  } finally {
    btnSubmitQuiz.disabled = false;
  }
});

function escapeHtml(str) {
  return (str || '').toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
