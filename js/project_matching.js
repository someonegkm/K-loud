//----------------------------------------------------
// project_matching.js (최종 통합본)
//----------------------------------------------------

// =====================================
// A. Step Functions 매칭 관련 URL
// =====================================
const STEP_FUNCTIONS_API_URL = 'https://1ezekx8bu3.execute-api.ap-northeast-2.amazonaws.com/dev/StepFunctionsTriggerAPI';
const TOP4_MATCHING_API_URL = 'https://1ezekx8bu3.execute-api.ap-northeast-2.amazonaws.com/dev/Top4MatchingAPI';

// =====================================
// B. Cognito 로그인/세션
// =====================================
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

// =====================================
// C. WebSocket (원하면 사용)
// =====================================
let ws = null;
function connectWebSocket() {
  const cognitoUser = userPool.getCurrentUser();
  if (!cognitoUser) {
    console.error('로그인 안 됨 → WebSocket 연결 불가');
    return;
  }
  cognitoUser.getSession((err, session) => {
    if (err) {
      console.error('세션 획득 에러:', err);
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

// =====================================
// D. 프로젝트 목록 API (왼쪽 코드)
// =====================================
const API_URL = 'https://d2miwwhvzmngyp.cloudfront.net/prod/getproject';
let userName = null;
let userId = null;

// 역할 표기
const roleDisplayNames = {
  frontend: "프론트엔드",
  backend: "백엔드",
  design: "디자인",
  pm: "기획"
};

// 1) fetchProjects
async function fetchProjects() {
  console.log('[fetchProjects] 호출');
  userId = getLoggedInUserId(); // 로그인 사용자ID
  if (!userId) {
    console.log('로그인 정보가 없어 프로젝트 요청 못 함');
    return;
  }
  try {
    const response = await fetch(`${API_URL}?userId=${userId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('프로젝트 API 요청 실패');

    const projects = await response.json();
    console.log('전체 프로젝트:', projects);

    // 내가 만든 프로젝트 제외
    const filtered = projects.filter(p => p.ownerId !== userId);
    console.log('[filtered projects]', filtered);

    renderProjects(filtered);      // 프론트엔드/백엔드/디자인/기획
    renderAllProjects(projects);   // 전체 탭
  } catch (err) {
    console.error('[fetchProjects] 에러:', err);
  }
}

// 2) renderAllProjects
function renderAllProjects(projects) {
  const allProjectsContainer = document.getElementById('all-projects');
  if (!allProjectsContainer) return;

  allProjectsContainer.innerHTML = '';
  const filtered = projects.filter(
    p => p.ownerId !== userId && p.maxTeamSize > 0
  );
  filtered.forEach((project) => {
    const remainingSlots = Math.max(0, project.maxTeamSize - (project.participants?.length || 0));
    const rolesStr = project.roles.map(r => roleDisplayNames[r] || r).join(', ');

    const card = document.createElement('div');
    card.className = 'project-card';
    card.innerHTML = `
      <h5>${project.projectName}</h5>
      <small>프로젝트 유형: ${project.projectType}</small><br/>
      <small>모집 인원: ${remainingSlots}/${project.maxTeamSize}</small><br/>
      <small>지원 유형: ${rolesStr}</small>
    `;
    card.addEventListener('click', () => openProjectPopup(project));
    allProjectsContainer.appendChild(card);
  });
}

// 3) renderProjects (역할별 탭)
function renderProjects(projects) {
  console.log('[renderProjects]', projects);
  const frontendContainer = document.getElementById('frontend-projects');
  const backendContainer = document.getElementById('backend-projects');
  const designContainer = document.getElementById('design-projects');
  const planningContainer = document.getElementById('planning-projects');
  if (!frontendContainer || !backendContainer || !designContainer || !planningContainer) {
    console.warn('역할별 컨테이너가 없습니다.');
    return;
  }
  // 초기화
  frontendContainer.innerHTML = '';
  backendContainer.innerHTML = '';
  designContainer.innerHTML = '';
  planningContainer.innerHTML = '';

  projects.forEach((proj) => {
    const remainingSlots = Math.max(0, proj.maxTeamSize - (proj.participants?.length || 0));
    const isParticipated = proj.isParticipated;
    const rolesStr = proj.roles.map(r => roleDisplayNames[r] || r).join(', ');

    const card = document.createElement('div');
    card.className = 'project-card';
    card.innerHTML = `
      <h5>${proj.projectName}</h5>
      <small>프로젝트 유형: ${proj.projectType}</small><br/>
      <small>모집 인원: ${remainingSlots}/${proj.maxTeamSize}</small>
      ${isParticipated ? '<small> (이미 참여)</small>' : ''}
      <br/>
      <small>지원 유형: ${rolesStr}</small>
    `;
    card.addEventListener('click', () => openProjectPopup(proj));

    // 기획(PM)
    if (proj.roles.includes('pm') && remainingSlots > 0) {
      const clonePM = card.cloneNode(true);
      clonePM.addEventListener('click', () => openProjectPopup(proj));
      planningContainer.appendChild(clonePM);
    }
    // 프론트
    if (proj.roles.includes('frontend') && remainingSlots > 0) {
      const cloneFE = card.cloneNode(true);
      cloneFE.addEventListener('click', () => openProjectPopup(proj));
      frontendContainer.appendChild(cloneFE);
    }
    // 백엔드
    if (proj.roles.includes('backend') && remainingSlots > 0) {
      const cloneBE = card.cloneNode(true);
      cloneBE.addEventListener('click', () => openProjectPopup(proj));
      backendContainer.appendChild(cloneBE);
    }
    // 디자인
    if (proj.roles.includes('design') && remainingSlots > 0) {
      const cloneDS = card.cloneNode(true);
      cloneDS.addEventListener('click', () => openProjectPopup(proj));
      designContainer.appendChild(cloneDS);
    }
  });
}

// =====================================
// E. Step Functions 매칭 로직
// =====================================
async function startStepFunctions(userId) {
  const statusMessage = document.getElementById('statusMessage');
  try {
    console.log('[startStepFunctions] userId:', userId);
    const idToken = localStorage.getItem('idToken');
    if (!idToken) console.warn('No idToken in localStorage!');

    const response = await fetch(STEP_FUNCTIONS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({ userId })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[startStepFunctions] errText:', errText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('[startStepFunctions] success:', data);
    window.currentExecutionArn = data.executionArn;

    statusMessage.innerHTML = '매칭이 시작되었습니다. 약 3~4분 후 "결과 가져오기" 버튼을 눌러 주세요.';
  } catch (error) {
    console.error('[startStepFunctions] error:', error);
    alert(`매칭 시작 오류: ${error.message}`);
    statusMessage.innerHTML = '<p>매칭 시작 중 오류</p>';
  }
}

async function fetchStepFunctionsResult(executionArn) {
  const statusMessage = document.getElementById('statusMessage');
  try {
    console.log('[fetchStepFunctionsResult] ARN:', executionArn);
    const idToken = localStorage.getItem('idToken');
    const userId = getLoggedInUserId();
    if (!userId) {
      alert('로그인이 필요합니다.');
      window.location.href = 'login.html';
      return;
    }

    const url = `${TOP4_MATCHING_API_URL}?userId=${encodeURIComponent(userId)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${idToken}`
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[fetchStepFunctionsResult] errText:', errText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('[fetchStepFunctionsResult] result:', result);

    if (Array.isArray(result.top_4)) {
      renderMatchingProjects(result.top_4);
      statusMessage.innerHTML = '매칭 결과가 아래에 표시되었습니다.';
    } else {
      statusMessage.innerHTML = '매칭 결과가 아직 준비 안됨. 잠시 후 다시 시도.';
    }
  } catch (error) {
    console.error('[fetchStepFunctionsResult] error:', error);
    alert(`결과 조회 오류: ${error.message}`);
    statusMessage.innerHTML = '<p>결과 조회 중 오류</p>';
  }
}

function renderMatchingProjects(matches) {
  const projectListDiv = document.getElementById('project-list');
  projectListDiv.innerHTML = '';

  if (!Array.isArray(matches) || matches.length === 0) {
    projectListDiv.innerHTML = '<p>조건에 맞는 매칭 결과가 없습니다.</p>';
    return;
  }

  window.matchedProjects = matches; // 팝업에서 사용
  let html = '<div class="row">';
  matches.forEach(m => {
    const projectName = m.projectName || 'Unknown Project';
    const similarityScore = m.SimilarityScore || 0;
    const projectId = m.ProjectID || 'UnknownID';

    html += `
      <div class="col-md-3" style="margin-bottom:20px;">
        <div class="card">
          <div class="card-body">
            <h5>${projectName}</h5>
            <p>유사도 점수: ${similarityScore.toFixed(2)}</p>
            <button class="btn btn-info" onclick="openProjectPopupByMatching('${projectId}')">
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

// “자세히 보기” → 팝업
function openProjectPopupByMatching(projectId) {
  if (!window.matchedProjects) {
    alert('매칭된 프로젝트 정보가 없습니다.');
    return;
  }
  const project = window.matchedProjects.find(p => p.ProjectID === projectId);
  if (!project) {
    alert('해당 프로젝트 정보를 찾을 수 없습니다.');
    return;
  }
  openProjectPopup(project);
}

// =====================================
// F. 팝업(모달) 로직 (공용)
// =====================================

// DOM
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

// 공용 팝업 열기
function openProjectPopup(project) {
  if (!getLoggedInUserId()) {
    alert('로그인이 필요합니다.');
    window.location.href = 'login.html';
    return;
  }
  currentSelectedProject = project;

  popupTitle.textContent = project.projectName || '프로젝트 이름 없음';
  popupDescription.textContent = project.projectDescription || '설명 없음';
  popupTechStack.textContent = Array.isArray(project.techStack)
    ? project.techStack.join(', ')
    : (project.techStack || '기술 스택 없음');
  popupType.textContent = project.projectType || '유형 없음';
  popupCreated.textContent = project.createdAt || '-';
  popupRecruitment.textContent = (project.maxTeamSize || 0) + '명';
  popupDuration.textContent = (project.projectDuration || 0) + '일';
  popupOwnerName.textContent = project.ownerName || '알 수 없음';

  // 역할 버튼
  applicationRoles.innerHTML = '';
  if (project.roles && Array.isArray(project.roles)) {
    project.roles.forEach(role => {
      const isDisabled = (project.disabledRoles || []).includes(role);
      const roleBtn = document.createElement('button');
      roleBtn.className = `role-button ${isDisabled ? 'disabled' : ''}`;
      roleBtn.textContent = roleDisplayNames[role] || role;
      roleBtn.dataset.role = role;

      if (isDisabled) {
        roleBtn.disabled = true;
        roleBtn.title = '이 역할은 지원할 수 없습니다.';
      } else {
        roleBtn.addEventListener('click', () => {
          document.querySelectorAll('.role-button').forEach(b => b.classList.remove('active'));
          roleBtn.classList.add('active');
        });
      }
      applicationRoles.appendChild(roleBtn);
    });
  }
  // 참여 여부
  applyButton.disabled = project.isParticipated;

  resetApplicationForm();
  popup.style.display = 'block';
}

// 팝업 닫기
function closeProjectPopup() {
  popup.style.display = 'none';
  resetApplicationForm();
}

// 지원하기 버튼
if (applyButton) {
  applyButton.addEventListener('click', () => {
    applicationSection.style.display = 'block';
  });
}

// 지원 제출
if (submitApplicationButton) {
  submitApplicationButton.addEventListener('click', () => {
    const activeBtn = document.querySelector('.role-button.active');
    const selectedRole = activeBtn ? activeBtn.dataset.role : null;
    const note = applicationNote.value.trim();

    if (!currentSelectedProject || !selectedRole || !note) {
      alert('지원 역할과 내용을 모두 작성하세요.');
      return;
    }

    // (예) WebSocket 전송 or alert
    alert(`프로젝트(${currentSelectedProject.projectName})에 [${selectedRole}]로 지원!\n내용: ${note}`);
    closeProjectPopup();
  });
}

// 팝업 X 버튼
if (closePopup) {
  closePopup.addEventListener('click', () => {
    closeProjectPopup();
  });
}

// 폼 초기화
function resetApplicationForm() {
  applicationSection.style.display = 'none';
  applicationNote.value = '';
  document.querySelectorAll('.role-button').forEach(b => b.classList.remove('active'));
}

// =====================================
// G. DOMContentLoaded 초기화
// =====================================
document.addEventListener('DOMContentLoaded', () => {
  // WebSocket 연결 원하면
  // connectWebSocket();

  // 프로젝트 목록 fetch (왼쪽 코드)
  fetchProjects();
});
