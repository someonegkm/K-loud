//----------------------------------------------------
// project_matching.js
//----------------------------------------------------

// Step Functions API URL
const STEP_FUNCTIONS_API_URL = 'https://1ezekx8bu3.execute-api.ap-northeast-2.amazonaws.com/dev/StepFunctionsTriggerAPI-v3';
const TOP4_MATCHING_API_URL = 'https://1ezekx8bu3.execute-api.ap-northeast-2.amazonaws.com/dev/Top4MatchingAPI';

// Cognito 세션 함수
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

// 매칭 시작
async function startStepFunctions(userId) {
  const statusMessage = document.getElementById('statusMessage');
  try {
    console.log('[startStepFunctions] userId:', userId);
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[startStepFunctions] error text:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('[startStepFunctions] success:', data);
    window.currentExecutionArn = data.executionArn;

    statusMessage.innerHTML = '<p>매칭이 시작되었습니다. 약 3~4분 후 "결과 가져오기" 버튼을 눌러 결과를 조회하세요.</p>';
  } catch (error) {
    console.error('[startStepFunctions] error:', error);
    alert(`매칭 시작 오류: ${error.message}`);
    statusMessage.innerHTML = '<p>매칭 시작 중 오류 발생</p>';
  }
}

// 매칭 결과 가져오기
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

    const resultUrl = `${TOP4_MATCHING_API_URL}?userId=${encodeURIComponent(userId)}`;
    const response = await fetch(resultUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${idToken}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[fetchStepFunctionsResult] error text:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('[fetchStepFunctionsResult] result:', result);

    if (Array.isArray(result.top_4)) {
      renderMatchingProjects(result.top_4);
      statusMessage.innerHTML = '<p>매칭 결과가 아래에 표시되었습니다.</p>';
    } else {
      statusMessage.innerHTML = '<p>아직 매칭 결과가 준비되지 않았습니다. 잠시 후 다시 시도해주세요.</p>';
    }
  } catch (error) {
    console.error('[fetchStepFunctionsResult] error:', error);
    alert(`결과 조회 오류: ${error.message}`);
    statusMessage.innerHTML = '<p>결과 조회 중 오류 발생</p>';
  }
}

// 매칭 결과 렌더링 (오직 top4)
function renderMatchingProjects(matches) {
  const projectListDiv = document.getElementById('matched-project-list');
  projectListDiv.innerHTML = '';

  if (!Array.isArray(matches) || matches.length === 0) {
    projectListDiv.innerHTML = '<p>조건에 맞는 매칭 결과가 없습니다.</p>';
    return;
  }

  // 전역으로 저장해서 팝업에서 사용
  window.matchedProjects = matches;

  let html = '<div class="row">';
  matches.forEach(m => {
    const similarityScore = m.SimilarityScore || 0;
    const projectName = m.projectName || 'Unknown Project';
    const projectId = m.ProjectID || 'UnknownProjectID';

    html += `
      <div class="col-md-3" style="margin-bottom:20px;">
        <div class="card h-100 shadow-sm">
          <div class="card-body">
            <h5 class="card-title">${projectName}</h5>
            <p class="card-text">유사도 점수: ${similarityScore.toFixed(2)}</p>
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

// “자세히 보기” 버튼 → matchedProjects에서 찾아 팝업 열기
function openProjectPopupByMatching(projectId) {
  if (!window.matchedProjects) {
    alert('매칭된 프로젝트 정보가 없습니다.');
    return;
  }
  const project = window.matchedProjects.find(p => p.ProjectID === projectId);
  if (!project) {
    alert('해당 프로젝트를 찾을 수 없습니다.');
    return;
  }
  openProjectPopup(project);
}

// 팝업 DOM
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

// 역할 이름 매핑 (원하는 대로)
const roleDisplayNames = {
  frontend: "프론트엔드",
  backend: "백엔드",
  design: "디자인",
  pm: "기획"
};

let currentSelectedProject = null;

// 팝업 열기
function openProjectPopup(project) {
  if (!getLoggedInUserId()) {
    alert('로그인이 필요합니다.');
    window.location.href = 'login.html';
    return;
  }
  currentSelectedProject = project;

  // 팝업 채우기
  popupTitle.textContent = project.projectName || '프로젝트 이름 없음';
  popupDescription.textContent = project.projectDescription || '설명 없음';
  popupTechStack.textContent = Array.isArray(project.techStack) ? project.techStack.join(', ') : (project.techStack || '기술 스택 없음');
  popupType.textContent = project.projectType || '유형 없음';
  popupCreated.textContent = project.createdAt || '-';
  popupRecruitment.textContent = (project.maxTeamSize || 0) + '명';
  popupDuration.textContent = (project.projectDuration || 0) + '일';
  popupOwnerName.textContent = project.ownerName || '알 수 없음';

  // 역할 버튼들
  applicationRoles.innerHTML = '';
  if (project.roles && Array.isArray(project.roles)) {
    project.roles.forEach(role => {
      const isDisabled = (project.disabledRoles||[]).includes(role);
      const roleBtn = document.createElement('button');
      roleBtn.className = `role-button ${isDisabled?'disabled':''}`;
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

  applyButton.disabled = project.isParticipated === true;
  resetApplicationForm();
  popup.style.display = 'block';
}

// 팝업 닫기
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
    const activeRoleBtn = document.querySelector('.role-button.active');
    const selectedRole = activeRoleBtn ? activeRoleBtn.dataset.role : null;
    const noteValue = applicationNote.value.trim();

    if (!currentSelectedProject || !selectedRole || !noteValue) {
      alert('지원할 역할과 내용을 모두 입력해주세요.');
      return;
    }

    // 여기서 실제 제출 로직(WebSocket / API)
    alert(`프로젝트(${currentSelectedProject.projectName})에 역할(${selectedRole})로 지원!\n내용: ${noteValue}`);
    closeProjectPopup();
  });
}

// 팝업 x버튼
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
