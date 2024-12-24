//----------------------------------------------------
// project_matching.js (통합본, 오류 수정)
//----------------------------------------------------

// -------------------
// Step Functions 매칭 URL
// -------------------
const STEP_FUNCTIONS_API_URL = 'https://1ezekx8bu3.execute-api.ap-northeast-2.amazonaws.com/dev/StepFunctionsTriggerAPI';
const TOP4_MATCHING_API_URL = 'https://1ezekx8bu3.execute-api.ap-northeast-2.amazonaws.com/dev/Top4MatchingAPI';

// -------------------
// 프로젝트 가져오는 API
// -------------------
const API_URL = 'https://d2miwwhvzmngyp.cloudfront.net/prod/getproject';

// -------------------
// 전역 변수
// -------------------
let ws = null;             // WebSocket 객체 (중복 선언 주의)
let userName = null;       // Cognito 토큰에서 가져온 유저 이름
let userId = null;         // Cognito 유저 ID (getUsername)
let currentSelectedProject = null; // 팝업에서 선택된 프로젝트

// -------------------
// 역할 표기
// -------------------
const roleDisplayNames = {
  frontend: "프론트엔드",
  backend: "백엔드",
  design: "디자인",
  pm: "기획"
};

// -------------------
// Cognito 관련 함수 (기존 또는 cognito.js에서 가져옴)
// -------------------
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

// -------------------
// Step Functions 매칭 로직
// -------------------
async function startStepFunctions(userId) {
  const statusMessage = document.getElementById('statusMessage');
  try {
    console.log('Starting Step Functions with userId:', userId);
    const idToken = localStorage.getItem('idToken');
    if (!idToken) console.warn('No idToken found in localStorage.');

    const response = await fetch(STEP_FUNCTIONS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({ userId: userId })
    });

    console.log('Step Functions Start Response Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response text:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const executionDetails = await response.json();
    console.log('Step Functions Execution Details:', executionDetails);

    window.currentExecutionArn = executionDetails.executionArn;

    statusMessage.innerHTML = '<p>매칭이 시작되었습니다. 약 3~4분 후 "결과 가져오기" 버튼을 눌러 결과를 조회하세요.</p>';

  } catch (error) {
    console.error('Error starting Step Functions:', error.message);
    alert(`Error starting Step Functions: ${error.message}`);
    statusMessage.innerHTML = '<p>매칭 시작 중 오류 발생</p>';
  }
}

async function fetchStepFunctionsResult(executionArn) {
  const statusMessage = document.getElementById('statusMessage');
  try {
    const idToken = localStorage.getItem('idToken');
    const userId = getLoggedInUserId();
    if (!userId) {
      alert('로그인이 필요합니다.');
      window.location.href = 'login.html';
      return;
    }

    const resultUrl = `${TOP4_MATCHING_API_URL}?userId=${encodeURIComponent(userId)}`;
    const response = await fetch(resultUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${idToken}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error fetching result:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Step Functions Execution Result:', result);

    if (Array.isArray(result.top_4)) {
      window.allMatches = result.top_4;
      renderMatchingProjects(result.top_4);
      statusMessage.innerHTML = '<p>매칭 결과가 아래에 표시되었습니다.</p>';
    } else {
      statusMessage.innerHTML = '<p>아직 매칭 결과가 준비되지 않았습니다. 잠시 후 다시 시도해주세요.</p>';
    }

  } catch (error) {
    console.error('Error fetching Step Functions result:', error.message);
    alert(`Error fetching Step Functions result: ${error.message}`);
    statusMessage.innerHTML = '<p>결과 조회 중 오류 발생. 다시 시도해주세요.</p>';
  }
}

// -------------------
// 매칭 결과 렌더링
// -------------------
function renderMatchingProjects(matches) {
  const projectListDiv = document.getElementById('project-list');
  projectListDiv.innerHTML = ''; 

  if (Array.isArray(matches) && matches.length > 0) {
    let html = '<div class="row">';
    matches.forEach(m => {
      const projectName = m.projectName || 'Unknown Project';
      const similarityScore = m.SimilarityScore || 0;
      const projectId = m.ProjectID || 'Unknown Project';

      html += `
        <div class="col-md-4" style="margin-bottom:20px;">
          <div class="card">
            <div class="card-body">
              <h5 class="card-title">${projectName}</h5>
              <p class="card-text">유사도 점수: ${similarityScore.toFixed(2)}</p>
              <button class="btn btn-primary" onclick="openProjectPopupByMatching('${projectId}')">
                자세히 보기
              </button>
            </div>
          </div>
        </div>
      `;
    });
    html += '</div>';
    projectListDiv.innerHTML = html;
  } else {
    projectListDiv.innerHTML = '<p>조건에 맞는 매칭 결과가 없습니다.</p>';
  }
}

function openProjectPopupByMatching(projectId) {
  const matchItem = (window.allMatches || []).find(m => m.ProjectID === projectId);
  if (!matchItem) {
    alert('해당 프로젝트 정보를 찾을 수 없습니다.');
    return;
  }

  // 팝업용 데이터
  const projectData = {
    projectName: matchItem.projectName || '프로젝트 이름 없음',
    projectDescription: matchItem.projectDescription || '설명 없음',
    techStack: matchItem.techStack || [],
    projectType: matchItem.projectType || '유형 없음',
    maxTeamSize: matchItem.maxTeamSize || 0,
    projectDuration: matchItem.projectDuration || 0,
    ownerName: matchItem.ownerName || '알 수 없음',
    ownerId: matchItem.ownerId || '',
    projectId: matchItem.ProjectID,
    roles: matchItem.roles || [],
    isParticipated: matchItem.isParticipated || false,
    disabledRoles: matchItem.disabledRoles || []
  };
  openProjectPopup(projectData);
}

// -------------------
// 일반 프로젝트 목록
// -------------------
async function fetchProjects() {
  if (!userId) {
    console.log("로그인 정보가 없어 프로젝트를 가져오지 않습니다.");
    return;
  }
  try {
    const response = await fetch(`${API_URL}?userId=${userId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) throw new Error('API 요청 실패');
    const projects = await response.json();
    console.log('프로젝트 전체 목록:', projects);

    // 내가 만든 프로젝트 제외
    const filteredProjects = projects.filter(p => p.ownerId !== userId);
    renderProjects(filteredProjects);
    renderAllProjects(projects);

  } catch (error) {
    console.error('프로젝트 데이터를 가져오는 중 오류:', error);
  }
}

function renderAllProjects(projects) {
  const allProjectsContainer = document.getElementById('all-projects');
  if (!allProjectsContainer) return;
  allProjectsContainer.innerHTML = '';

  const filtered = projects.filter(
    p => p.ownerId !== userId && p.maxTeamSize > 0
  );

  filtered.forEach((project) => {
    const remainingSlots = Math.max(0, project.maxTeamSize - (project.participants?.length || 0));
    const roles = project.roles.map(role => roleDisplayNames[role] || role).join(', ');

    const projectCard = document.createElement('div');
    projectCard.className = 'project-card';
    projectCard.innerHTML = `
      <h5>${project.projectName}</h5>
      <small>프로젝트 유형: ${project.projectType}</small><br>
      <small>모집 인원: ${remainingSlots}/${project.maxTeamSize}</small><br>
      <small>지원 유형: ${roles}</small>
    `;
    projectCard.addEventListener('click', () => openProjectPopup(project));
    allProjectsContainer.appendChild(projectCard);
  });
}

function renderProjects(projects) {
  const frontendContainer = document.getElementById('frontend-projects');
  const backendContainer = document.getElementById('backend-projects');
  const designContainer = document.getElementById('design-projects');
  const planningContainer = document.getElementById('planning-projects');

  if (!frontendContainer || !backendContainer || !designContainer || !planningContainer) {
    console.log("역할별 DOM 컨테이너가 없습니다.");
    return;
  }
  frontendContainer.innerHTML = '';
  backendContainer.innerHTML = '';
  designContainer.innerHTML = '';
  planningContainer.innerHTML = '';

  projects.forEach((project) => {
    const remainingSlots = Math.max(0, project.maxTeamSize - (project.participants?.length || 0));
    const isParticipated = project.isParticipated;
    const roles = project.roles.map(r => roleDisplayNames[r] || r).join(', ');

    const projectCard = document.createElement('div');
    projectCard.className = 'project-card';
    projectCard.innerHTML = `
      <h5>${project.projectName}</h5>
      <small>프로젝트 유형: ${project.projectType}</small><br>
      <small>모집 인원: ${remainingSlots}/${project.maxTeamSize}</small>
      ${isParticipated ? '<small> (이미 참여)</small>' : ''}
      <br>
      <small>지원 유형: ${roles}</small>
    `;
    projectCard.addEventListener('click', () => openProjectPopup(project));

    if (project.roles.includes('pm') && remainingSlots > 0) {
      const cloned1 = projectCard.cloneNode(true);
      cloned1.addEventListener('click', () => openProjectPopup(project));
      planningContainer.appendChild(cloned1);
    }
    if (project.roles.includes('frontend') && remainingSlots > 0) {
      const cloned2 = projectCard.cloneNode(true);
      cloned2.addEventListener('click', () => openProjectPopup(project));
      frontendContainer.appendChild(cloned2);
    }
    if (project.roles.includes('backend') && remainingSlots > 0) {
      const cloned3 = projectCard.cloneNode(true);
      cloned3.addEventListener('click', () => openProjectPopup(project));
      backendContainer.appendChild(cloned3);
    }
    if (project.roles.includes('design') && remainingSlots > 0) {
      const cloned4 = projectCard.cloneNode(true);
      cloned4.addEventListener('click', () => openProjectPopup(project));
      designContainer.appendChild(cloned4);
    }
  });
}

// -------------------
// WebSocket 연결
// -------------------
function connectWebSocket() {
  const cognitoUser = userPool.getCurrentUser();
  if (!cognitoUser) {
    console.error('사용자가 로그인하지 않았습니다.');
    return;
  }

  cognitoUser.getSession((err, session) => {
    if (err) {
      console.error('세션 가져오는 중 오류:', err);
      return;
    }

    const idToken = session.getIdToken().getJwtToken();
    const payload = JSON.parse(
      decodeURIComponent(
        atob(idToken.split('.')[1])
          .split('')
          .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
          .join('')
      )
    );
    userName = payload.name || '이름 없음';
    userId = cognitoUser.getUsername();

    // 실제 운영 WS URL
    const wsUrl = `wss://fds9jyxgw7.execute-api.ap-northeast-2.amazonaws.com/prod/?userId=${userId}`;
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket 연결 성공');
      // 연결 후 프로젝트 fetch
      fetchProjects();
    };
    ws.onmessage = (event) => {
      alert('새 알림: ' + event.data);
    };
    ws.onclose = () => console.log('WebSocket 연결 종료');
    ws.onerror = (error) => console.error('WebSocket 에러:', error);
  });
}

// -------------------
// 팝업 열고 닫기
// -------------------
const popup = document.getElementById('project-popup');
const closePopupBtn = document.getElementById('close-popup');
const popupTitle = document.getElementById('popup-title');
const popupDescription = document.getElementById('popup-description');
const popupTechStack = document.getElementById('popup-techstack');
const popupType = document.getElementById('popup-type');
const popupRecruitment = document.getElementById('popup-recruitment');
const popupDuration = document.getElementById('popup-duration');
const popupOwnerName = document.getElementById('popup-owner-name');

const applyButton = document.getElementById('apply-button');
const applicationSection = document.getElementById('application-section');
const applicationRoles = document.getElementById('application-roles');
const applicationNote = document.getElementById('application-note');
const submitApplicationButton = document.getElementById('submit-application');

// 팝업 열기
function openProjectPopup(project) {
  if (!getLoggedInUserId()) {
    alert('로그인이 필요합니다.');
    window.location.href = 'login.html';
    return;
  }
  currentSelectedProject = project;

  popupTitle.textContent = project.projectName || '프로젝트 이름 없음';
  popupDescription.textContent = project.projectDescription || '내용이 없습니다.';
  popupTechStack.textContent = Array.isArray(project.techStack)
    ? project.techStack.join(', ')
    : (project.techStack || '정보 없음');
  popupType.textContent = project.projectType || '유형 없음';
  popupRecruitment.textContent = (project.maxTeamSize || 0) + '명';
  popupDuration.textContent = (project.projectDuration || 0) + '일';
  popupOwnerName.textContent = project.ownerName || '알 수 없음';

  // 역할 버튼들
  applicationRoles.innerHTML = '';
  (project.roles || []).forEach(role => {
    const isDisabled = (project.disabledRoles || []).includes(role);
    const btn = document.createElement('button');
    btn.className = 'role-button' + (isDisabled ? ' disabled' : '');
    btn.textContent = roleDisplayNames[role] || role;
    btn.dataset.role = role;

    if (isDisabled) {
      btn.disabled = true;
      btn.title = '이 역할은 지원할 수 없습니다.';
    } else {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.role-button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    }

    applicationRoles.appendChild(btn);
  });

  applyButton.disabled = project.isParticipated === true;

  resetApplicationForm();

  popup.style.display = 'block';
}

function closeProjectPopup() {
  popup.style.display = 'none';
  resetApplicationForm();
}

if (closePopupBtn) {
  closePopupBtn.addEventListener('click', () => {
    closeProjectPopup();
  });
}

if (applyButton) {
  applyButton.addEventListener('click', () => {
    applicationSection.style.display = 'block';
  });
}

if (submitApplicationButton) {
  submitApplicationButton.addEventListener('click', () => {
    const activeRoleBtn = document.querySelector('.role-button.active');
    const selectedRole = activeRoleBtn ? activeRoleBtn.dataset.role : null;
    const noteValue = applicationNote.value.trim();

    if (!currentSelectedProject || !selectedRole || !noteValue) {
      alert('지원할 역할과 지원 내용을 모두 입력하세요.');
      return;
    }

    const message = {
      action: 'submitApplication',
      projectOwnerId: currentSelectedProject.ownerId,
      applicantId: userName,
      userId: userId,
      projectName: currentSelectedProject.projectName,
      role: selectedRole,
      note: noteValue,
      projectId: currentSelectedProject.projectId || 'default-room-id',
    };

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
      alert('지원이 완료되었습니다!(WS 전송)');
    } else {
      alert('지원이 완료되었습니다!(WS 미연결이거나 문제 있음)');
    }
    closeProjectPopup();
  });
}

function resetApplicationForm() {
  applicationSection.style.display = 'none';
  applicationNote.value = '';
  document.querySelectorAll('.role-button').forEach(b => b.classList.remove('active'));
}

// ----------------------------------------------------
// (옵션) DOMContentLoaded 시점에 WebSocket 연결
// 필요하다면 HTML에서 onload 대신 여기서
// document.addEventListener('DOMContentLoaded', () => {
//   connectWebSocket();
// });
// ----------------------------------------------------
