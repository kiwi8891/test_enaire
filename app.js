let sb, user, allQuestions = [], userProgress = {};
let session = { questions: [], current: 0, correct: 0, wrong: 0 };
let lastMode = 'all';
let pendingEmail = '';

async function init() {
  if (!SUPABASE_URL || SUPABASE_URL.includes('YOUR_PROJECT')) {
    showScreen('screen-setup');
    return;
  }

  sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data: { session: authSession } } = await sb.auth.getSession();
  if (authSession) {
    user = authSession.user;
    await loadData();
    showMenu();
  } else {
    showScreen('screen-login');
  }
}

async function loadData() {
  await Promise.all([loadQuestions(), loadProgress()]);
}

async function loadQuestions() {
  const res = await fetch('questions.json');
  allQuestions = await res.json();
}

async function loadProgress() {
  const { data } = await sb.from('progress').select('*').eq('user_id', user.id);
  userProgress = {};
  (data || []).forEach(p => { userProgress[p.question_id] = p; });
}

// --- Auth ---

async function sendOTP() {
  const email = document.getElementById('email-input').value.trim();
  if (!email) return;

  const btn = document.getElementById('btn-send-otp');
  btn.textContent = 'Enviando...';
  btn.disabled = true;

  const { error } = await sb.auth.signInWithOtp({ email });

  btn.textContent = 'Enviar código';
  btn.disabled = false;

  if (error) { alert('Error: ' + error.message); return; }

  pendingEmail = email;
  document.getElementById('otp-email-hint').textContent = email;
  showScreen('screen-otp');
}

async function verifyOTP() {
  const token = document.getElementById('otp-input').value.trim();
  if (token.length !== 6) return;

  const btn = document.getElementById('btn-verify-otp');
  btn.textContent = 'Verificando...';
  btn.disabled = true;

  const { data, error } = await sb.auth.verifyOtp({ email: pendingEmail, token, type: 'email' });

  btn.textContent = 'Verificar';
  btn.disabled = false;

  if (error) { alert('Código incorrecto o caducado. Solicita uno nuevo.'); return; }

  user = data.user;
  await loadData();
  showMenu();
}

async function logout() {
  await sb.auth.signOut();
  user = null;
  userProgress = {};
  allQuestions = [];
  document.getElementById('email-input').value = '';
  showScreen('screen-login');
}

// --- Navigation ---

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

function showMenu() {
  document.getElementById('user-email').textContent = user?.email || '';

  const total = allQuestions.length;
  const answered = Object.values(userProgress).filter(p => (p.correct_count + p.wrong_count) > 0).length;
  const failed = Object.values(userProgress).filter(p => p.wrong_count > 0).length;

  document.getElementById('menu-answered').textContent = `${answered} de ${total} respondidas`;
  document.getElementById('menu-failed').textContent = `${failed} pregunta${failed !== 1 ? 's' : ''} con fallos`;

  showScreen('screen-menu');
}

function showStats() {
  const total = allQuestions.length;
  const answered = Object.values(userProgress).filter(p => (p.correct_count + p.wrong_count) > 0).length;
  const failed = Object.values(userProgress).filter(p => p.wrong_count > 0).length;

  let totalCorrect = 0, totalWrong = 0;
  Object.values(userProgress).forEach(p => {
    totalCorrect += p.correct_count || 0;
    totalWrong += p.wrong_count || 0;
  });
  const totalAttempts = totalCorrect + totalWrong;
  const pct = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-answered').textContent = answered;
  document.getElementById('stat-failed').textContent = failed;
  document.getElementById('stat-pct').textContent = totalAttempts > 0 ? pct + '%' : '—';
  document.getElementById('stat-pct').style.color = pct >= 70 ? '#34c759' : pct > 0 ? '#ff3b30' : '#8e8e93';

  const failedEntries = Object.entries(userProgress)
    .filter(([, p]) => p.wrong_count > 0)
    .sort(([, a], [, b]) => b.wrong_count - a.wrong_count)
    .slice(0, 5);

  const listEl = document.getElementById('most-failed-list');
  if (failedEntries.length === 0) {
    listEl.innerHTML = '<p style="color:#8e8e93;font-size:0.9rem">Sin fallos registrados aún.</p>';
  } else {
    listEl.innerHTML = failedEntries.map(([id, p]) => {
      const q = allQuestions.find(q => String(q.id) === String(id));
      const text = q ? q.question.substring(0, 65) + (q.question.length > 65 ? '…' : '') : 'ID ' + id;
      return `<div class="stat-row">
        <span class="stat-label">${text}</span>
        <span class="badge badge-red">${p.wrong_count} ✗</span>
      </div>`;
    }).join('');
  }

  showScreen('screen-stats');
}

// --- Test ---

function startTest(mode) {
  lastMode = mode;
  let pool;

  if (mode === 'review') {
    pool = allQuestions
      .filter(q => (userProgress[q.id]?.wrong_count || 0) > 0)
      .sort((a, b) => (userProgress[b.id]?.wrong_count || 0) - (userProgress[a.id]?.wrong_count || 0));

    if (pool.length === 0) {
      alert('¡No tienes preguntas falladas! Practica primero un test.');
      return;
    }
  } else {
    pool = [...allQuestions].sort(() => Math.random() - 0.5);
  }

  session = { questions: pool.slice(0, 20), current: 0, correct: 0, wrong: 0 };
  showScreen('screen-test');
  renderQuestion();
}

function renderQuestion() {
  const q = session.questions[session.current];
  const num = session.current + 1;
  const total = session.questions.length;

  document.getElementById('progress-fill').style.width = `${(num / total) * 100}%`;
  document.getElementById('question-number').textContent = `Pregunta ${num} de ${total}`;

  const topicEl = document.getElementById('question-topic');
  if (q.topic) {
    topicEl.textContent = q.topic;
    topicEl.style.display = 'inline-block';
  } else {
    topicEl.style.display = 'none';
  }

  document.getElementById('question-text').textContent = q.question;
  document.getElementById('explanation').style.display = 'none';
  document.getElementById('btn-next').style.display = 'none';

  const optEl = document.getElementById('options');
  optEl.innerHTML = '';
  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'option';
    btn.textContent = opt;
    btn.onclick = () => selectAnswer(i);
    optEl.appendChild(btn);
  });
}

async function selectAnswer(index) {
  const q = session.questions[session.current];
  const opts = document.querySelectorAll('.option');
  const isCorrect = index === q.correct;

  opts.forEach(o => { o.disabled = true; });
  opts[index].classList.add(isCorrect ? 'correct' : 'wrong');
  if (!isCorrect) opts[q.correct].classList.add('correct');

  if (isCorrect) session.correct++; else session.wrong++;

  if (q.explanation) {
    const expEl = document.getElementById('explanation');
    expEl.textContent = q.explanation;
    expEl.style.display = 'block';
  }

  document.getElementById('btn-next').style.display = 'block';
  await updateProgress(q.id, isCorrect);
}

async function updateProgress(questionId, isCorrect) {
  const p = userProgress[questionId] || { wrong_count: 0, correct_count: 0 };
  const updated = {
    user_id: user.id,
    question_id: questionId,
    wrong_count: p.wrong_count + (isCorrect ? 0 : 1),
    correct_count: p.correct_count + (isCorrect ? 1 : 0),
    last_seen: new Date().toISOString()
  };

  const { data } = await sb.from('progress')
    .upsert(updated, { onConflict: 'user_id,question_id' })
    .select().single();

  if (data) userProgress[questionId] = data;
}

function nextQuestion() {
  session.current++;
  if (session.current >= session.questions.length) {
    showResult();
  } else {
    renderQuestion();
  }
}

function showResult() {
  const total = session.questions.length;
  const pct = Math.round((session.correct / total) * 100);

  document.getElementById('result-pct').textContent = pct + '%';
  document.getElementById('result-pct').style.color = pct >= 70 ? '#34c759' : '#ff3b30';
  document.getElementById('result-correct').textContent = session.correct;
  document.getElementById('result-wrong').textContent = session.wrong;
  document.getElementById('result-total').textContent = total;

  showScreen('screen-result');
}

init();
