//----------------------------------------------------
// project_matching.js (최종)
//----------------------------------------------------

// Step Functions API
const STEP_FUNCTIONS_API_URL = 'https://1ezekx8bu3.execute-api.ap-northeast-2.amazonaws.com/dev/StepFunctionsTriggerAPI';
const TOP4_MATCHING_API_URL = 'https://1ezekx8bu3.execute-api.ap-northeast-2.amazonaws.com/dev/Top4MatchingAPI';

// 프로젝트 목록 API
const API_URL = 'https://d2miwwhvzmngyp.cloudfront.net/prod/getproject';

// Cognito 세션
function getLoggedInUserId() {
  const cognitoUser = userPool.getCurrentUser();
  return cognitoUser ? cognitoUser.getUsername() : null;
}
function updateNavBar() {
  const cognitoUser = userPool.getCurrentUser();
  const loginLogoutLink = document.getElementById('login-logout-link');
  if (cognitoUser) {
    loginLogoutLink.textContent = '로그아웃';
    loginLogoutLink.href = '#';
    loginLogoutLink.onclick = function () {
      cognitoUser.signOut();
      window.location.href = 'login.html';
    };
  } else {
    loginLogoutLink.textContent = '로그인';
    loginLogoutLink.href = 'login.html';
    loginLogoutLink.onclick = null;
  }
}

// WebSocket (선택)
let ws = null;
function connectWebSocket() {
  const cognitoUser = userPool.getCurrentUser();
  if (!cognitoUser) {
    console.error('로그인 안됨. WebSocket 연결 불가');
    return;
  }
  cognitoUser.getSession((err, session) => {
    if (err) {
      console.error('세션 에러:', err);
      return;
    }
    const userId = cognitoUser.getUsername();
    const wsUrl = `wss://fds9jyxgw7.execute-api.ap-northeast-2.amazonaws.com/prod/?userId=${userId}`;
    ws = new WebSocket(wsUrl);

    ws.onopen = () => console.log('WebSocket 연결 성공');
    ws.onmessage = (evt) => alert('새 알림: ' + evt.data);
    ws.onclose = () => console.log('WebSocket 연결 종료');
    ws.onerror = (e) => console.error('WebSocket 에러:', e);
  });
}

// ------------------
// A. 프로젝트 목록
// ------------------
let userName = null;
let userId = null;

const roleDisplayNames = {
  frontend: "프론트엔드",
  backend: "백엔드",
  design: "디자인",
  pm: "기획"
};

async function fetchProjects() {
  console.log('[fetchProjects] 호출');
  userId = getLoggedInUserId(); 
  if (!userId) {
    console.log('로그인 안되어 fetchProjects 중단');
    return;
  }
  try {
    const resp = await fetch(`${API_URL}?userId=${userId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!resp.ok) throw new Error('프로젝트 API 요청 실패');
    const projects = await resp.json();
    console.log('[fetchProjects] 전체 프로젝트:', projects);

    // 내 소유 프로젝트 제외
    const filtered = projects.filter(p => p.ownerId !== userId);
    console.log('[filtered]', filtered);

    // 역할별 + 전체
    renderProjects(filtered);
    renderAllProjects(projects);
  } catch (error) {
    console.error('[fetchProjects] 에러:', error);
  }
}

function renderAllProjects(projects) {
  const container = document.getElementById('all-projects');
  if (!container) return;
  container.innerHTML = '';

  // ownerId != userId & maxTeamSize>0
  const filtered = projects.filter(p => p.ownerId !== userId && p.maxTeamSize > 0);
  filtered.forEach((p) => {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.innerHTML = `
      <h5>${p.projectName || 'Unknown Project'}</h5>
      <button class="btn btn-sm btn-outline-primary">자세히 보기</button>
    `;
    card.addEventListener('click', () => openProjectPopup(p));
    container.appendChild(card);
  });
}

function renderProjects(projects) {
  const fe = document.getElementById('frontend-projects');
  const be = document.getElementById('backend-projects');
  const ds = document.getElementById('design-projects');
  const pm = document.getElementById('planning-projects');
  if (!fe || !be || !ds || !pm) {
    console.warn('역할별 컨테이너 없음');
    return;
  }
  fe.innerHTML = ''; be.innerHTML = '';
  ds.innerHTML = ''; pm.innerHTML = '';

  projects.forEach(proj => {
    const slots = Math.max(0, proj.maxTeamSize - (proj.participants?.length||0));
    const card = document.createElement('div');
    card.className = 'project-card';
    card.innerHTML = `
      <h5>${proj.projectName || 'Unknown Project'}</h5>
      <button class="btn btn-sm btn-outline-primary">자세히 보기</button>
    `;
    card.addEventListener('click', () => openProjectPopup(proj));

    if (proj.roles.includes('pm') && slots>0) {
      const clonePM = card.cloneNode(true);
      clonePM.addEventListener('click', () => openProjectPopup(proj));
      pm.appendChild(clonePM);
    }
    if (proj.roles.includes('frontend') && slots>0) {
      const cloneFE = card.cloneNode(true);
      cloneFE.addEventListener('click', () => openProjectPopup(proj));
      fe.appendChild(cloneFE);
    }
    if (proj.roles.includes('backend') && slots>0) {
      const cloneBE = card.cloneNode(true);
      cloneBE.addEventListener('click', () => openProjectPopup(proj));
      be.appendChild(cloneBE);
    }
    if (proj.roles.includes('design') && slots>0) {
      const cloneDS = card.cloneNode(true);
      cloneDS.addEventListener('click', () => openProjectPopup(proj));
      ds.appendChild(cloneDS);
    }
  });
}

// ------------------
// B. Step Functions 매칭
// ------------------
async function startStepFunctions(userId) {
  const statusMessage = document.getElementById('statusMessage');
  try {
    const idToken = localStorage.getItem('idToken') || '';
    console.log('[startStepFunctions] userId:', userId);

    const resp = await fetch(STEP_FUNCTIONS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({ userId })
    });
    if (!resp.ok) {
      const errText = await resp.text();
      console.error('startStepFunctions Error:', errText);
      throw new Error(`HTTP error! status: ${resp.status}`);
    }
    const data = await resp.json();
    console.log('[startStepFunctions] success:', data);
    window.currentExecutionArn = data.executionArn;

    statusMessage.innerHTML = '매칭이 시작되었습니다. 약 3~4분 후 "결과 가져오기" 버튼을 눌러 결과를 조회하세요.';
  } catch (err) {
    console.error('[startStepFunctions] error:', err);
    alert(`매칭 시작 오류: ${err.message}`);
    statusMessage.innerHTML = '<p>매칭 시작 중 오류</p>';
  }
}

async function fetchStepFunctionsResult(execArn) {
  const statusMessage = document.getElementById('statusMessage');
  try {
    console.log('[fetchStepFunctionsResult] ARN:', execArn);
    const idToken = localStorage.getItem('idToken') || '';
    const userId = getLoggedInUserId();
    if (!userId) {
      alert('로그인이 필요합니다.');
      window.location.href = 'login.html';
      return;
    }

    const url = `${TOP4_MATCHING_API_URL}?userId=${encodeURIComponent(userId)}`;
    const resp = await fetch(url, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${idToken}` }
    });
    if (!resp.ok) {
      const errText = await resp.text();
      console.error('[fetchStepFunctionsResult] error:', errText);
      throw new Error(`HTTP error! status: ${resp.status}`);
    }
    const result = await resp.json();
    console.log('[fetchStepFunctionsResult] result:', result);

    if (Array.isArray(result.top_4)) {
      renderMatchingProjects(result.top_4);
      statusMessage.innerHTML = '매칭 결과가 아래에 표시되었습니다.';
    } else {
      statusMessage.innerHTML = '매칭 결과가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.';
    }
  } catch (err) {
    console.error('[fetchStepFunctionsResult] error:', err);
    alert(`결과 조회 오류: ${err.message}`);
    statusMessage.innerHTML = '<p>결과 조회 중 오류</p>';
  }
}

function renderMatchingProjects(matches) {
  const projectListDiv = document.getElementById('project-list');
  projectListDiv.innerHTML = '';

  if (!Array.isArray(matches) || matches.length===0) {
    projectListDiv.innerHTML = '<p>조건에 맞는 매칭 결과가 없습니다.</p>';
    return;
  }
  window.matchedProjects = matches;

  let html = '<div class="row">';
  matches.forEach(m => {
    const projName = m.projectName || 'Unknown Project';
    const simScore = m.SimilarityScore || 0;
    const pid = m.ProjectID || 'UnknownID';

    html += `
      <div class="col-md-3" style="margin-bottom:20px;">
        <div class="card shadow-sm">
          <div class="card-body">
            <h5>${projName}</h5>
            <p>유사도 점수: ${simScore.toFixed(2)}</p>
            <button class="btn btn-info" onclick="openProjectPopupByMatching('${pid}')">
              자세히 보기
            </button>
          </div>
        </div>
      </div>
    `;
  });
  html += '</div>';
  projectListDiv.innerHTML = html;
}

// “자세히 보기” → matchedProjects → popup
function openProjectPopupByMatching(projectId) {
  if (!window.matchedProjects) {
    alert('매칭된 프로젝트 정보가 없습니다.');
    return;
  }
  const project = window.matchedProjects.find(x => x.ProjectID===projectId);
  if (!project) {
    alert('해당 프로젝트 정보를 찾을 수 없습니다.');
    return;
  }
  openProjectPopup(project);
}

// ------------------
// C. 팝업(모달) 로직
// ------------------
const popup = document.getElementById('project-popup');
const closePopup = document.getElementById('close-popup');
const popupTitle = document.getElementById('popup-title');
const popupDescription = document.getElementById('popup-description');
const popupTechStack = document.getElementById('popup-techstack');
const popupType = document.getElementById('popup-type');
const popupCreated = document.getElementById('popup-created');
const popupRecruitment = document.getElementById('popup-recruitment');
const popupDuration = document.getElementById('popup-duration');
const popupOwnerName = document.getElementById('popup-owner-name');
const applyButton = document.getElementById('apply-button');
const applicationSection = document.getElementById('application-section');
const applicationRoles = document.getElementById('application-roles');
const applicationNote = document.getElementById('application-note');
const submitApplicationButton = document.getElementById('submit-application');

let currentSelectedProject = null;

function openProjectPopup(project) {
  if (!getLoggedInUserId()) {
    alert('로그인이 필요합니다.');
    window.location.href = 'login.html';
    return;
  }
  currentSelectedProject = project;

  // 팝업에 상세정보
  popupTitle.textContent = project.projectName || '프로젝트 이름 없음';
  popupDescription.textContent = project.projectDescription || '설명 없음';
  popupTechStack.textContent = Array.isArray(project.techStack)
    ? project.techStack.join(', ')
    : (project.techStack || '기술 스택 없음');
  popupType.textContent = project.projectType || '유형 없음';
  popupCreated.textContent = project.createdAt || '-';
  popupRecruitment.textContent = (project.maxTeamSize||0)+'명';
  popupDuration.textContent = (project.projectDuration||0)+'일';
  popupOwnerName.textContent = project.ownerName || '알 수 없음';

  // 역할 버튼
  applicationRoles.innerHTML = '';
  if (project.roles && Array.isArray(project.roles)) {
    project.roles.forEach(role => {
      const isDisabled = (project.disabledRoles||[]).includes(role);
      const roleBtn = document.createElement('button');
      roleBtn.className = `role-button ${isDisabled?'disabled':''}`;
      roleBtn.textContent = roleDisplayNames[role]||role;
      roleBtn.dataset.role = role;

      if (isDisabled) {
        roleBtn.disabled = true;
        roleBtn.title = '이 역할은 지원할 수 없습니다.';
      } else {
        roleBtn.addEventListener('click', () => {
          document.querySelectorAll('.role-button').forEach(b=>b.classList.remove('active'));
          roleBtn.classList.add('active');
        });
      }
      applicationRoles.appendChild(roleBtn);
    });
  }

  applyButton.disabled = project.isParticipated;
  resetApplicationForm();
  popup.style.display = 'block';
}

function closeProjectPopup() {
  popup.style.display = 'none';
  resetApplicationForm();
}

// “지원하기” 버튼
if (applyButton) {
  applyButton.addEventListener('click', () => {
    applicationSection.style.display = 'block';
  });
}

// “지원 제출” 버튼
if (submitApplicationButton) {
  submitApplicationButton.addEventListener('click', () => {
    const activeBtn = document.querySelector('.role-button.active');
    const selectedRole = activeBtn ? activeBtn.dataset.role : null;
    const noteValue = applicationNote.value.trim();

    if (!currentSelectedProject || !selectedRole || !noteValue) {
      alert('지원할 역할과 내용 모두 입력해주세요.');
      return;
    }

    // 실제 제출 로직(WebSocket / API)
    alert(`프로젝트(${currentSelectedProject.projectName})에 [${selectedRole}]로 지원!\n내용: ${noteValue}`);
    closeProjectPopup();
  });
}

// 닫기 버튼
if (closePopup) {
  closePopup.addEventListener('click', () => {
    closeProjectPopup();
  });
}

// 폼 초기화
function resetApplicationForm() {
  applicationSection.style.display = 'none';
  applicationNote.value = '';
  document.querySelectorAll('.role-button').forEach(b=>b.classList.remove('active'));
}

// D. 페이지 로드시 실행
document.addEventListener('DOMContentLoaded', () => {
  // 필요 시 WebSocket
  // connectWebSocket();

  // 전체 프로젝트 불러오기
  fetchProjects();
});
