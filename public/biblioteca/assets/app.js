const courses = window.COURSES;
const storeKey = 'centro-estudio-2026-certamenes-v2';
let state = { activeCourse: 'all', difficulty: 'all', topic: 'all', search: '', progress: { completed: {}, notes: {} } };

try {
  const saved = JSON.parse(localStorage.getItem(storeKey));
  if (saved && saved.completed && saved.notes) state.progress = saved;
} catch (error) {
  state.progress = { completed: {}, notes: {} };
}

const elements = {
  nav: document.querySelector('#courseNav'),
  grid: document.querySelector('#courseGrid'),
  list: document.querySelector('#exerciseList'),
  material: document.querySelector('#materialPanel'),
  search: document.querySelector('#searchInput'),
  difficulty: document.querySelector('#difficultySelect'),
  topic: document.querySelector('#topicSelect'),
  resultCount: document.querySelector('#resultCount'),
  courseSummary: document.querySelector('#courseSummary'),
  progressBar: document.querySelector('#progressBar'),
  progressText: document.querySelector('#progressText'),
  heroCompleted: document.querySelector('#heroCompleted'),
  heroTitle: document.querySelector('#heroTitle'),
  heroDescription: document.querySelector('#heroDescription'),
  tutorQuestion: document.querySelector('#tutorQuestion'),
  askTutorButton: document.querySelector('#askTutorButton'),
  onlineStatus: document.querySelector('#onlineStatus'),
  toast: document.querySelector('#toast')
};

const allExercises = courses.flatMap(course => course.exercises.map(exercise => ({ ...exercise, courseId: course.id, courseName: course.short })));
const totalProblems = allExercises.reduce((sum, exercise) => sum + (exercise.problemCount || 3), 0);

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

function renderMath(root) {
  if (typeof renderMathInElement !== 'function' || !root) return;
  renderMathInElement(root, {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '\[', right: '\]', display: true },
      { left: '$', right: '$', display: false },
      { left: '\(', right: '\)', display: false }
    ],
    throwOnError: false,
    ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code']
  });
}

function updateOnlineStatus() {
  if (!elements.onlineStatus) return;
  const online = typeof navigator === 'undefined' || navigator.onLine !== false;
  elements.onlineStatus.textContent = online ? '● Tutor online disponible' : '● Sin internet: estudio offline activo';
  elements.onlineStatus.classList.toggle('online', online);
  elements.onlineStatus.classList.toggle('offline', !online);
}

function tutorPrompt(exercise, question = '') {
  const course = exercise ? exercise.courseName : (courses.find(item => item.id === state.activeCourse)?.name || 'Ingeniería Mecánica');
  const statement = exercise ? `

EJERCICIO:
${exercise.title}
${exercise.prompt}` : '';
  return `Actúa como tutor universitario de Ingeniería Mecánica de la Universidad del Bío-Bío. Ramo: ${course}. Analiza con rigor de certamen. Explica el razonamiento paso a paso, define símbolos, conserva unidades SI, comprueba signos y resultados, y presenta toda expresión con notación matemática LaTeX legible, usando fracciones, potencias, raíces, integrales, derivadas, vectores y matrices cuando corresponda. Si falta un dato, indícalo antes de asumir. No uses sintaxis de programación salvo que el ramo sea MATLAB. Duda del estudiante: ${question || 'Guíame en la resolución y verifica el resultado.'}${statement}`;
}

function sendToTutor(prompt) {
  if (window.StudyBridge && typeof window.StudyBridge.askTutor === 'function') {
    window.StudyBridge.askTutor(prompt);
    return;
  }
  if (typeof navigator !== 'undefined' && navigator.clipboard) navigator.clipboard.writeText(prompt);
  if (typeof window.open === 'function') window.open('https://chatgpt.com', '_blank', 'noopener');
  showToast('Duda copiada. Pégala en ChatGPT.');
}

function saveProgress() {
  localStorage.setItem(storeKey, JSON.stringify(state.progress));
}

function completedCount(courseId = null) {
  return allExercises.filter(exercise => (!courseId || exercise.courseId === courseId) && state.progress.completed[exercise.id]).length;
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('visible');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => elements.toast.classList.remove('visible'), 1800);
}

function selectCourse(courseId) {
  state.activeCourse = courseId;
  state.topic = 'all';
  elements.topic.value = 'all';
  render();
  document.querySelector('#exercisesTitle').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderNav() {
  const items = [{ id: 'all', short: 'Todos los ramos', icon: '◆', exercises: allExercises }, ...courses];
  elements.nav.innerHTML = items.map(course => {
    const total = course.id === 'all' ? allExercises.length : course.exercises.length;
    return `<button class="nav-item ${state.activeCourse === course.id ? 'active' : ''}" data-course="${course.id}" type="button"><span class="nav-icon">${escapeHtml(course.icon)}</span><span>${escapeHtml(course.short)}</span><span class="nav-count">${completedCount(course.id === 'all' ? null : course.id)}/${total}</span></button>`;
  }).join('');
  elements.nav.querySelectorAll('[data-course]').forEach(button => button.addEventListener('click', () => selectCourse(button.dataset.course)));
}

function renderCourseGrid() {
  elements.grid.innerHTML = courses.map(course => `<button class="course-card ${state.activeCourse === course.id ? 'active' : ''}" data-course="${course.id}" data-icon="${escapeHtml(course.icon)}" type="button"><div class="course-meta"><span class="course-dot"></span><span>${completedCount(course.id)}/${course.exercises.length} certámenes</span></div><h3>${escapeHtml(course.name)}</h3><p>${escapeHtml(course.description)}</p></button>`).join('');
  elements.grid.querySelectorAll('[data-course]').forEach(button => button.addEventListener('click', () => selectCourse(button.dataset.course)));
  elements.courseSummary.textContent = `${allExercises.length} evaluaciones · ${totalProblems} problemas largos`;
}

function updateTopicOptions() {
  const relevant = state.activeCourse === 'all' ? courses : courses.filter(course => course.id === state.activeCourse);
  const topics = [...new Set(relevant.flatMap(course => course.topics))].sort((a, b) => a.localeCompare(b, 'es'));
  const current = state.topic;
  elements.topic.innerHTML = '<option value="all">Todos</option>' + topics.map(topic => `<option value="${escapeHtml(topic)}">${escapeHtml(topic)}</option>`).join('');
  elements.topic.value = topics.includes(current) ? current : 'all';
  if (!topics.includes(current)) state.topic = 'all';
}

function filteredExercises() {
  const query = state.search.trim().toLocaleLowerCase('es');
  return allExercises.filter(exercise => {
    const courseMatch = state.activeCourse === 'all' || exercise.courseId === state.activeCourse;
    const difficultyMatch = state.difficulty === 'all' || exercise.difficulty === state.difficulty;
    const topicMatch = state.topic === 'all' || exercise.topic === state.topic;
    const haystack = `${exercise.title} ${exercise.prompt} ${exercise.topic} ${exercise.courseName}`.toLocaleLowerCase('es');
    return courseMatch && difficultyMatch && topicMatch && (!query || haystack.includes(query));
  });
}

function exerciseTemplate(exercise) {
  const done = Boolean(state.progress.completed[exercise.id]);
  const codeClass = exercise.courseId === 'matlab' ? 'code-like' : '';
  return `<article id="${exercise.id}" class="exercise-card ${done ? 'completed' : ''}">
    <div class="exercise-head">
      <button class="complete-check ${done ? 'checked' : ''}" data-complete="${exercise.id}" type="button" aria-label="Marcar ejercicio completado">✓</button>
      <div class="exercise-title"><h3>${escapeHtml(exercise.title)}</h3><div class="badges"><span class="badge level-advanced">${escapeHtml(exercise.difficulty)}</span><span class="badge">${escapeHtml(exercise.topic)}</span>${exercise.time ? `<span class="badge">${escapeHtml(exercise.time)}</span>` : ''}${exercise.points ? `<span class="badge">${escapeHtml(exercise.points)}</span>` : ''}</div></div>
      <span class="exercise-course">${escapeHtml(exercise.courseName)}</span>
    </div>
    <div class="exercise-body">
      <p class="prompt">${escapeHtml(exercise.prompt)}</p>
      <div class="exercise-actions"><button class="small-button" data-hint="${exercise.id}" type="button">Ver pista</button><button class="small-button" data-solution="${exercise.id}" type="button">Ver solución</button><button class="small-button" data-note="${exercise.id}" type="button">Mis notas</button><button class="small-button ai-button" data-ai="${exercise.id}" type="button">Preguntar a ChatGPT</button></div>
      <div id="hint-${exercise.id}" class="reveal hint">${escapeHtml(exercise.hint)}</div>
      <div id="solution-${exercise.id}" class="reveal ${codeClass}">${escapeHtml(exercise.solution)}</div>
      <textarea id="note-${exercise.id}" class="notes-area" data-note-input="${exercise.id}" placeholder="Escribe tu desarrollo, dudas o resultado..." hidden>${escapeHtml(state.progress.notes[exercise.id] || '')}</textarea>
    </div>
  </article>`;
}

function bindExerciseActions() {
  elements.list.querySelectorAll('[data-complete]').forEach(button => button.addEventListener('click', () => {
    const id = button.dataset.complete;
    state.progress.completed[id] = !state.progress.completed[id];
    saveProgress();
    render();
    showToast(state.progress.completed[id] ? 'Evaluación marcada como completada' : 'Evaluación reabierta');
  }));
  elements.list.querySelectorAll('[data-hint]').forEach(button => button.addEventListener('click', () => document.querySelector(`#hint-${button.dataset.hint}`).classList.toggle('visible')));
  elements.list.querySelectorAll('[data-solution]').forEach(button => button.addEventListener('click', () => document.querySelector(`#solution-${button.dataset.solution}`).classList.toggle('visible')));
  elements.list.querySelectorAll('[data-note]').forEach(button => button.addEventListener('click', () => {
    const area = document.querySelector(`#note-${button.dataset.note}`);
    area.hidden = !area.hidden;
    if (!area.hidden) area.focus();
  }));
  elements.list.querySelectorAll('[data-note-input]').forEach(area => area.addEventListener('input', () => {
    state.progress.notes[area.dataset.noteInput] = area.value;
    saveProgress();
  }));
  elements.list.querySelectorAll('[data-ai]').forEach(button => button.addEventListener('click', () => {
    const exercise = allExercises.find(item => item.id === button.dataset.ai);
    sendToTutor(tutorPrompt(exercise));
  }));
}

function renderExercises() {
  const visible = filteredExercises();
  elements.resultCount.textContent = `${visible.length} evaluación${visible.length === 1 ? '' : 'es'}`;
  elements.list.innerHTML = visible.length ? visible.map(exerciseTemplate).join('') : '<div class="empty-state">No hay ejercicios que coincidan con los filtros actuales.</div>';
  bindExerciseActions();
  renderMath(elements.list);
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function renderMaterials() {
  if (state.activeCourse === 'all') {
    elements.material.innerHTML = '<p class="material-intro">Selecciona un ramo para ver sus guías, certámenes, presentaciones, formularios y plantillas. Todo está incluido dentro de esta carpeta y abre sin conexión.</p>';
    return;
  }
  const course = courses.find(item => item.id === state.activeCourse);
  const links = course.materials.map(file => `<a class="material-link" href="${encodeURI(file.path)}" target="_blank" data-material="${escapeHtml(file.path)}"><span class="file-type">${escapeHtml(file.type)}</span><span class="file-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span><span class="file-size">${formatBytes(file.size)}</span></a>`).join('');
  elements.material.innerHTML = `<p class="material-intro">${escapeHtml(course.sourceNote)} Los originales del Escritorio fueron copiados sin cambios.</p><div class="material-grid">${links || '<span>No hay archivos adicionales.</span>'}</div>`;
  elements.material.querySelectorAll('[data-material]').forEach(link => link.addEventListener('click', event => {
    if (window.StudyBridge && typeof window.StudyBridge.openAsset === 'function') {
      event.preventDefault();
      window.StudyBridge.openAsset(link.dataset.material);
    }
  }));
}

function renderProgress() {
  const count = completedCount();
  const percent = Math.round(100 * count / allExercises.length);
  elements.progressBar.style.width = `${percent}%`;
  elements.progressText.textContent = `${count} de ${allExercises.length} · ${percent}%`;
  elements.heroCompleted.textContent = count;
  const course = courses.find(item => item.id === state.activeCourse);
  elements.heroTitle.textContent = course ? course.name : 'Certámenes completos para tus seis ramos.';
  elements.heroDescription.textContent = course ? course.description + ' ' + course.sourceNote : 'Evaluaciones largas, puntaje, tiempo, pauta desarrollada, apuntes y material original.';
}

function render() {
  renderNav();
  renderCourseGrid();
  updateTopicOptions();
  renderExercises();
  renderMaterials();
  renderProgress();
}

elements.search.addEventListener('input', event => { state.search = event.target.value; renderExercises(); });
elements.difficulty.addEventListener('change', event => { state.difficulty = event.target.value; renderExercises(); });
elements.topic.addEventListener('change', event => { state.topic = event.target.value; renderExercises(); });
elements.askTutorButton.addEventListener('click', () => {
  const question = elements.tutorQuestion.value.trim();
  if (!question) return showToast('Escribe una duda para el tutor');
  sendToTutor(tutorPrompt(null, question));
});

if (typeof window.addEventListener === 'function') {
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
}

document.querySelector('#randomButton').addEventListener('click', () => {
  const candidates = filteredExercises().filter(exercise => !state.progress.completed[exercise.id]);
  const pool = candidates.length ? candidates : filteredExercises();
  if (!pool.length) return showToast('No hay ejercicios con estos filtros');
  const exercise = pool[Math.floor(Math.random() * pool.length)];
  state.activeCourse = exercise.courseId;
  state.topic = 'all';
  state.search = '';
  elements.search.value = '';
  render();
  const card = document.querySelector(`#${exercise.id}`);
  card.classList.add('random-focus');
  card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  showToast(`Reto: ${exercise.title}`);
});

document.querySelector('#resetButton').addEventListener('click', () => {
  if (!confirm('¿Seguro que quieres borrar el progreso y todas tus notas guardadas?')) return;
  state.progress = { completed: {}, notes: {} };
  saveProgress();
  render();
  showToast('Progreso reiniciado');
});

updateOnlineStatus();
render();
