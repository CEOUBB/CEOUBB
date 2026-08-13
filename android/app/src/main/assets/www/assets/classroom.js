const classroomState = {
  auth: { configured: false, signedIn: false, role: 'offline', canTeach: false, isOwner: false },
  posts: [],
  monitoring: [],
  users: [],
  activeTab: 'feed',
  offline: false,
  receivedAuth: false
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

const classroomElements = typeof document !== 'undefined' ? {
  overlay: document.querySelector('#authOverlay'),
  googleSignIn: document.querySelector('#googleSignInButton'),
  offlineAccess: document.querySelector('#offlineAccessButton'),
  configuration: document.querySelector('#authConfiguration'),
  shortcut: document.querySelector('#classroomButton'),
  section: document.querySelector('#classroomSection'),
  status: document.querySelector('#classroomStatus'),
  accountChip: document.querySelector('#accountChip'),
  accountAvatar: document.querySelector('#accountAvatar'),
  accountName: document.querySelector('#accountName'),
  accountRole: document.querySelector('#accountRole'),
  deleteAccount: document.querySelector('#deleteAccountButton'),
  teacherRequest: document.querySelector('#teacherRequestPanel'),
  requestTeacher: document.querySelector('#requestTeacherButton'),
  composer: document.querySelector('#teacherComposer'),
  postTitle: document.querySelector('#postTitle'),
  postBody: document.querySelector('#postBody'),
  postKind: document.querySelector('#postKind'),
  postUrl: document.querySelector('#postUrl'),
  publishLink: document.querySelector('#publishLinkButton'),
  uploadFile: document.querySelector('#uploadFileButton'),
  uploadProgress: document.querySelector('#uploadProgress'),
  feed: document.querySelector('#classFeed'),
  postCount: document.querySelector('#classPostCount'),
  studentCount: document.querySelector('#classStudentCount'),
  monitoringTab: document.querySelector('#monitoringTabButton'),
  permissionsTab: document.querySelector('#permissionsTabButton'),
  monitoringList: document.querySelector('#monitoringList'),
  monitorAverage: document.querySelector('#monitorAverage'),
  monitorActive: document.querySelector('#monitorActive'),
  permissionsList: document.querySelector('#permissionsList')
} : {};

const previewPosts = [
  {
    id: 'preview-1',
    title: 'Bienvenida al aula beta de Estática',
    body: 'Aquí el profesor podrá publicar avisos, guías, presentaciones, certámenes y enlaces de Google Drive para todo el curso.',
    kind: 'aviso',
    fileUrl: '',
    fileName: '',
    authorName: 'Profesor de Estática',
    authorEmail: 'profesor@ubiobio.cl',
    createdAt: 1770000000000
  },
  {
    id: 'preview-2',
    title: 'Módulo RA1 · Sistemas de fuerzas',
    body: 'Material de ejemplo: ejercicios de vectores, resultantes y equilibrio de partículas.',
    kind: 'material',
    fileUrl: '',
    fileName: 'Guía_RA1.pdf',
    authorName: 'Profesor de Estática',
    authorEmail: 'profesor@ubiobio.cl',
    createdAt: 1769996400000
  }
];

const classDateFormat = typeof Intl !== 'undefined' ? new Intl.DateTimeFormat('es-CL', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Santiago'
}) : null;

function classroomBridge(method, ...args) {
  if (typeof window === 'undefined' || !window.StudyBridge || typeof window.StudyBridge[method] !== 'function') return false;
  window.StudyBridge[method](...args);
  return true;
}

function roleLabel(role) {
  return ({
    owner: 'Propietario',
    teacher: 'Profesor',
    pending_teacher: 'Profesor pendiente',
    student: 'Estudiante',
    guest: 'Cuenta no autorizada',
    suspended: 'Acceso suspendido',
    signed_out: 'Sin sesión',
    offline: 'Modo local'
  })[role] || role;
}

function roleInitial(auth) {
  const name = auth.displayName || auth.email || '?';
  return name.trim().charAt(0).toLocaleUpperCase('es') || '?';
}

function isInstitutionalMember() {
  return ['owner', 'teacher', 'pending_teacher', 'student'].includes(classroomState.auth.role);
}

function renderAuth() {
  if (!classroomElements.overlay) return;
  const auth = classroomState.auth;
  if (typeof document !== 'undefined' && document.body) {
    document.body.classList.toggle('auth-locked', !auth.signedIn && !classroomState.offline);
  }
  classroomElements.overlay.classList.toggle('hidden', auth.signedIn || classroomState.offline);
  if (classroomElements.configuration) {
    classroomElements.configuration.classList.toggle('ready', auth.configured);
    classroomElements.configuration.classList.toggle('pending', !auth.configured);
    classroomElements.configuration.textContent = auth.configured
      ? 'Servicio de cuentas conectado. Usa tu cuenta institucional UBB.'
      : 'Vista previa lista. Falta activar el proyecto Firebase para iniciar sesiones reales.';
  }
  if (classroomElements.googleSignIn) classroomElements.googleSignIn.disabled = !auth.configured;
  if (classroomElements.accountName) classroomElements.accountName.textContent = auth.signedIn ? (auth.displayName || auth.email || 'Cuenta Google') : 'Biblioteca local';
  if (classroomElements.accountRole) classroomElements.accountRole.textContent = roleLabel(auth.role);
  if (classroomElements.deleteAccount) classroomElements.deleteAccount.hidden = !auth.signedIn;
  if (classroomElements.accountAvatar) classroomElements.accountAvatar.textContent = roleInitial(auth);
  if (classroomElements.composer) classroomElements.composer.hidden = !auth.canTeach;
  if (classroomElements.teacherRequest) classroomElements.teacherRequest.hidden = auth.role !== 'pending_teacher';
  if (classroomElements.monitoringTab) classroomElements.monitoringTab.hidden = !auth.canTeach;
  if (classroomElements.permissionsTab) classroomElements.permissionsTab.hidden = !auth.isOwner;
  if (classroomElements.status) {
    if (auth.signedIn && isInstitutionalMember()) {
      classroomElements.status.textContent = `${roleLabel(auth.role)} · ${auth.email || ''} · Sincronización activa`;
      classroomElements.status.classList.add('connected');
    } else if (auth.role === 'guest') {
      classroomElements.status.textContent = 'Esta beta requiere correo @alumnos.ubiobio.cl o @ubiobio.cl.';
      classroomElements.status.classList.remove('connected');
    } else if (classroomState.offline) {
      classroomElements.status.textContent = 'Modo local: biblioteca disponible; aula y monitoreo requieren iniciar sesión.';
      classroomElements.status.classList.remove('connected');
    } else {
      classroomElements.status.textContent = 'Conecta tu cuenta institucional para sincronizar el aula.';
      classroomElements.status.classList.remove('connected');
    }
  }
  if (!auth.canTeach && classroomState.activeTab === 'monitoring') activateClassTab('feed');
  if (!auth.isOwner && classroomState.activeTab === 'permissions') activateClassTab('feed');
  renderFeed();
}

function formatClassDate(value) {
  if (!value) return 'Recién publicado';
  try {
    const date = new Date(value);
    return classDateFormat ? classDateFormat.format(date) : date.toLocaleDateString('es-CL');
  } catch {
    return 'Fecha no disponible';
  }
}

function postTemplate(post) {
  const canDelete = classroomState.auth.canTeach && !post.id.startsWith('preview-');
  const fileButton = post.fileUrl ? `<button class="small-button" data-open-post="${escapeHtml(post.fileUrl)}" type="button">${escapeHtml(post.fileName || 'Abrir material')}</button>` : '';
  const deleteButton = canDelete ? `<button class="small-button" data-delete-post="${escapeHtml(post.id)}" type="button">Eliminar</button>` : '';
  return `<article class="class-post"><span class="post-kind">${escapeHtml((post.kind || 'aviso').slice(0, 4))}</span><div><h3>${escapeHtml(post.title || 'Publicación')}</h3><p>${escapeHtml(post.body || '')}</p><div class="post-meta"><span>${escapeHtml(post.authorName || post.authorEmail || 'Equipo docente')}</span><span>${formatClassDate(post.createdAt)}</span>${post.fileName ? `<span>${escapeHtml(post.fileName)}</span>` : ''}</div></div><div class="post-actions">${fileButton}${deleteButton}</div></article>`;
}

function renderFeed() {
  if (!classroomElements.feed) return;
  const posts = classroomState.posts.length ? classroomState.posts : (!classroomState.auth.configured || classroomState.offline ? previewPosts : []);
  if (classroomElements.postCount) classroomElements.postCount.textContent = posts.length;
  classroomElements.feed.innerHTML = posts.length ? posts.map(postTemplate).join('') : '<div class="post-empty">Todavía no hay publicaciones en Estática.</div>';
  classroomElements.feed.querySelectorAll('[data-open-post]').forEach(button => button.addEventListener('click', () => {
    if (!classroomBridge('openExternal', button.dataset.openPost) && typeof window !== 'undefined') window.open(button.dataset.openPost, '_blank', 'noopener');
  }));
  classroomElements.feed.querySelectorAll('[data-delete-post]').forEach(button => button.addEventListener('click', () => {
    if (!confirm('¿Eliminar esta publicación para todo el curso?')) return;
    classroomBridge('deleteClassPost', button.dataset.deletePost);
  }));
}

function renderMonitoring() {
  if (!classroomElements.monitoringList) return;
  const items = classroomState.monitoring.filter(item => item.role === 'student');
  const average = items.length ? Math.round(items.reduce((sum, item) => sum + Number(item.percent || 0), 0) / items.length) : 0;
  if (classroomElements.studentCount) classroomElements.studentCount.textContent = items.length;
  if (classroomElements.monitorActive) classroomElements.monitorActive.textContent = items.length;
  if (classroomElements.monitorAverage) classroomElements.monitorAverage.textContent = `${average}%`;
  classroomElements.monitoringList.innerHTML = items.length ? items.map(item => `<article class="monitor-row"><div><strong>${escapeHtml(item.displayName || 'Estudiante')}</strong><small>${escapeHtml(item.email || '')} · Última actividad ${formatClassDate(item.lastSeen)}</small></div><div class="student-progress"><span>${Number(item.completed || 0)}/${Number(item.total || 0)} certámenes · ${Number(item.percent || 0)}%</span><i style="--student-progress:${Math.max(0, Math.min(100, Number(item.percent || 0)))}%"></i></div></article>`).join('') : '<div class="post-empty">El seguimiento aparecerá cuando los estudiantes abran la beta de Estática.</div>';
}

function renderPermissions() {
  if (!classroomElements.permissionsList) return;
  const ownerUid = classroomState.auth.uid;
  classroomElements.permissionsList.innerHTML = classroomState.users.length ? classroomState.users.map(user => {
    const fixedOwner = user.uid === ownerUid || user.role === 'owner';
    const request = user.teacherRequested ? ' · Solicitud docente pendiente' : '';
    return `<article class="permission-row"><div><strong>${escapeHtml(user.displayName || 'Usuario')}</strong><small>${escapeHtml(user.email || '')} · ${escapeHtml(roleLabel(user.role))}${escapeHtml(request)}</small></div><div class="permission-actions">${fixedOwner ? '<span class="badge">Propietario protegido</span>' : `<select data-role-user="${escapeHtml(user.uid)}"><option value="student" ${user.role === 'student' ? 'selected' : ''}>Estudiante</option><option value="teacher" ${user.role === 'teacher' ? 'selected' : ''}>Profesor</option><option value="pending_teacher" ${user.role === 'pending_teacher' ? 'selected' : ''}>Profesor pendiente</option><option value="suspended" ${user.role === 'suspended' ? 'selected' : ''}>Suspendido</option></select><button class="small-button" data-save-role="${escapeHtml(user.uid)}" type="button">Guardar</button>`}</div></article>`;
  }).join('') : '<div class="post-empty">Las cuentas aparecerán después de su primer inicio de sesión.</div>';
  classroomElements.permissionsList.querySelectorAll('[data-save-role]').forEach(button => button.addEventListener('click', () => {
    const escapeFn = typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape : String;
    const selector = classroomElements.permissionsList.querySelector(`[data-role-user="${escapeFn(button.dataset.saveRole)}"]`);
    if (selector) classroomBridge('setUserRole', button.dataset.saveRole, selector.value);
  }));
}

function activateClassTab(tab) {
  classroomState.activeTab = tab;
  if (typeof document !== 'undefined') {
    document.querySelectorAll('[data-class-tab]').forEach(button => button.classList.toggle('active', button.dataset.classTab === tab));
    document.querySelectorAll('.class-tab-panel').forEach(panel => panel.classList.remove('active'));
    const target = ({
      feed: '#classFeedPanel',
      modules: '#classModulesPanel',
      monitoring: '#classMonitoringPanel',
      permissions: '#classPermissionsPanel'
    })[tab];
    const panel = document.querySelector(target || '#classFeedPanel');
    if (panel) panel.classList.add('active');
  }
}

function clearComposer() {
  if (classroomElements.postTitle) classroomElements.postTitle.value = '';
  if (classroomElements.postBody) classroomElements.postBody.value = '';
  if (classroomElements.postUrl) classroomElements.postUrl.value = '';
  if (classroomElements.uploadProgress) classroomElements.uploadProgress.textContent = '';
}

function publishLinkPost() {
  const title = classroomElements.postTitle ? classroomElements.postTitle.value.trim() : '';
  if (!title) return showToast('Escribe un título para la publicación');
  classroomBridge('publishDrivePost', title, classroomElements.postBody.value.trim(), classroomElements.postUrl.value.trim(), classroomElements.postKind.value);
}

function beginFilePost() {
  const title = classroomElements.postTitle ? classroomElements.postTitle.value.trim() : '';
  if (!title) return showToast('Escribe un título antes de elegir el archivo');
  classroomBridge('beginFilePost', title, classroomElements.postBody.value.trim(), classroomElements.postKind.value);
}

function showToast(message) {
  if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
    window.showToast(message);
    return;
  }
  alert(message);
}

if (typeof window !== 'undefined') {
  window.reportEstaticaProgress = function reportEstaticaProgress() {
    if (!classroomState.auth.signedIn || !window.StudyBridge || typeof window.StudyBridge.updateEstaticaProgress !== 'function') return;
    const courseList = (typeof courses !== 'undefined' ? courses : window.COURSES) || [];
    const course = courseList.find(item => item && item.id === 'estatica');
    if (course && course.exercises) {
      const count = typeof completedCount === 'function' ? completedCount('estatica') : 0;
      window.StudyBridge.updateEstaticaProgress(count, course.exercises.length);
    }
  };

  window.__classroomNative = function classroomNative(event, payload = {}) {
    if (event === 'auth') {
      classroomState.receivedAuth = true;
      classroomState.auth = { ...classroomState.auth, ...payload };
      if (payload.signedIn) classroomState.offline = false;
      renderAuth();
      window.reportEstaticaProgress();
    }
    if (event === 'posts') {
      classroomState.posts = Array.isArray(payload.items) ? payload.items : [];
      renderFeed();
    }
    if (event === 'monitoring') {
      classroomState.monitoring = Array.isArray(payload.items) ? payload.items : [];
      renderMonitoring();
    }
    if (event === 'users') {
      classroomState.users = Array.isArray(payload.items) ? payload.items : [];
      renderPermissions();
    }
    if (event === 'uploadProgress') {
      if (classroomElements.uploadProgress) {
        classroomElements.uploadProgress.textContent = `Subiendo ${payload.fileName || 'archivo'} · ${Number(payload.percent || 0)}%`;
      }
    }
    if (event === 'message') {
      showToast(payload.message || 'Acción completada');
      if ((payload.message || '').includes('Publicación')) clearComposer();
    }
    if (event === 'error') showToast(payload.message || 'Ocurrió un problema');
  };
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (classroomElements.googleSignIn) classroomElements.googleSignIn.addEventListener('click', () => classroomBridge('signInWithGoogle'));
  if (classroomElements.offlineAccess) classroomElements.offlineAccess.addEventListener('click', () => {
    classroomState.offline = true;
    classroomState.auth = { ...classroomState.auth, signedIn: false, role: 'offline' };
    renderAuth();
  });
  if (classroomElements.accountChip) classroomElements.accountChip.addEventListener('click', () => {
    if (classroomState.auth.signedIn) {
      if (confirm('¿Cerrar la sesión de esta cuenta?')) classroomBridge('signOut');
    } else {
      classroomState.offline = false;
      renderAuth();
    }
  });
  if (classroomElements.deleteAccount) classroomElements.deleteAccount.addEventListener('click', () => {
    if (!classroomState.auth.signedIn) return;
    if (!confirm('Se eliminarán tu cuenta, progreso y publicaciones. Esta acción no se puede deshacer.')) return;
    if (prompt('Escribe ELIMINAR para confirmar.') !== 'ELIMINAR') return;
    classroomBridge('deleteAccount');
  });
  if (classroomElements.shortcut && classroomElements.section) {
    classroomElements.shortcut.addEventListener('click', () => classroomElements.section.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }
  if (classroomElements.requestTeacher) classroomElements.requestTeacher.addEventListener('click', () => classroomBridge('requestTeacherAccess'));
  if (classroomElements.publishLink) classroomElements.publishLink.addEventListener('click', publishLinkPost);
  if (classroomElements.uploadFile) classroomElements.uploadFile.addEventListener('click', beginFilePost);
  document.querySelectorAll('[data-class-tab]').forEach(button => button.addEventListener('click', () => activateClassTab(button.dataset.classTab)));

  renderAuth();
  renderMonitoring();
  renderPermissions();
  if (new URLSearchParams(window.location.search).get('course') === 'estatica') {
    window.setTimeout(() => {
      if (classroomElements.section && typeof classroomElements.section.scrollIntoView === 'function') {
        classroomElements.section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 350);
  }
  if (!classroomBridge('classroomReady')) {
    window.setTimeout(() => {
      if (!classroomState.receivedAuth && typeof window.__classroomNative === 'function') {
        window.__classroomNative('auth', { configured: false, signedIn: false, role: 'offline', canTeach: false, isOwner: false });
      }
    }, 50);
  }
}
