//----------------------------------------------------
// project_matching.js (수정/통합된 전체 코드)
//----------------------------------------------------

// StepFunctionsTriggerAPI - 매칭 시작용
const STEP_FUNCTIONS_API_URL = 'https://1ezekx8bu3.execute-api.ap-northeast-2.amazonaws.com/dev/StepFunctionsTriggerAPI-v3';
// Top4MatchingAPI - 매칭 결과 조회용
const TOP4_MATCHING_API_URL = 'https://1ezekx8bu3.execute-api.ap-northeast-2.amazonaws.com/dev/Top4MatchingAPI';

// (추가) 프로젝트 정보를 불러오는 예시 API (필요 시 사용)
const PROJECT_API_URL = 'https://d2miwwhvzmngyp.cloudfront.net/prod/getproject';

// ----------------------------------------------------
// Cognito User Pool 관련 함수 (이미 cognito.js에 있겠지만, 참조 예시)
// ----------------------------------------------------
// userPool, decodeToken 등은 cognito.js에서 관리한다고 가정

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

// ----------------------------------------------------
// Step Functions 매칭 시작
// ----------------------------------------------------
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
    // 실행 ARN을 전역 변수에 저장
    window.currentExecutionArn = executionDetails.executionArn;

    statusMessage.innerHTML = '<p>매칭이 시작되었습니다. 약 3~4분 후 "결과 가져오기" 버튼을 눌러 결과를 조회하세요.</p>';

  } catch (error) {
    console.error('Error starting Step Functions:', error.message);
    alert(`Error starting Step Functions: ${error.message}`);
    statusMessage.innerHTML = '<p>매칭 시작 중 오류 발생</p>';
  }
}

// ----------------------------------------------------
// Step Functions 매칭 결과 조회
// ----------------------------------------------------
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
      // 매칭 결과가 있음
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

// ----------------------------------------------------
// 매칭 결과를 프로젝트 카드 형태로 렌더링
// ----------------------------------------------------
function renderMatchingProjects(matches) {
  const projectListDiv = document.getElementById('project-list');
  projectListDiv.innerHTML = ''; 

  if (Array.isArray(matches) && matches.length > 0) {
    let html = '<div class="row">';
    matches.forEach(m => {
      const similarityScore = m.SimilarityScore || 0;
      const projectId = m.ProjectID || 'Unknown Project';
      const projectName = m.projectName || '프로젝트 이름 없음';

      html += `
        <div class="col-md-4" style="margin-bottom:20px;">
          <div class="card h-100 shadow-sm project-card">
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

// ----------------------------------------------------
// "자세히 보기" 버튼: 매칭 결과에서 projectId로 팝업 열기
// ----------------------------------------------------
function openProjectPopupByMatching(projectId) {
  const matchItem = (window.allMatches || []).find(m => m.ProjectID === projectId);
  if (!matchItem) {
    alert('해당 프로젝트 정보를 찾을 수 없습니다.');
    return;
  }

  // 팝업용 데이터 가공
  const projectData = {
    projectName: matchItem.projectName || '이름 없음',
    projectType: matchItem.projectType || '유형 정보 없음',
    techStack: matchItem.techStack || [],
    maxTeamSize: matchItem.maxTeamSize || 0,
    projectDuration: matchItem.projectDuration || 0,
    projectDescription: matchItem.projectDescription || '설명 없음',
    roles: matchItem.roles || [],
    ownerId: matchItem.ownerId,
    projectId: matchItem.ProjectID,
    similarityScore: matchItem.SimilarityScore
  };

  openProjectPopup(projectData);
}

// ----------------------------------------------------
// (옵션) 프로젝트 리스트 Fetch (사용할 경우)
// ----------------------------------------------------
async function fetchProjects() {
  // userId 는 connectWebSocket() 이후 할당
  if (!userId) {
    console.log("로그인 정보가 없어서 fetchProjects()는 실행되지 않습니다.");
    return;
  }
  try {
    const response = await fetch(`${PROJECT_API_URL}?userId=${userId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) throw new Error('API 요청 실패');
    const projects = await response.json();
    console.log('API 응답 프로젝트 데이터:', projects);

    // 필터링 등 필요한 작업 후, 별도 렌더링 가능
    // renderProjects(projects);

  } catch (error) {
    console.error('프로젝트 데이터를 가져오는 중 오류 발생:', error);
  }
}

// ----------------------------------------------------
// WebSocket 연결 및 사용자 정보
// ----------------------------------------------------
let ws = null;
let userName = null;
let userId = null;

function connectWebSocket(userPool) {
  const cognitoUser = userPool.getCurrentUser();
  if (!cognitoUser) {
    console.error('사용자가 로그인하지 않았습니다.');
    return;
  }

  cognitoUser.getSession((err, session) => {
    if (err) {
      console.error('세션을 가져오는 중 오류 발생:', err);
      return;
    }

    const idToken = session.getIdToken().getJwtToken();
    // ID 토큰 Payload 파싱
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

    // 실제 WS URL은 환경에 맞춰 교체
    const wsUrl = `wss://fds9jyxgw7.execute-api.ap-northeast-2.amazonaws.com/prod/?userId=${userId}`;
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket 연결 성공');
      // 필요 시 바로 프로젝트 목록 불러오기
      // fetchProjects();
    };
    ws.onmessage = (event) => {
      alert('새 알림: ' + event.data);
    };
    ws.onclose = () => console.log('WebSocket 연결 종료');
    ws.onerror = (error) => console.error('WebSocket 에러:', error);
  });
}

// ----------------------------------------------------
// 팝업(모달) 열고 닫기 + 지원하기 기능
// ----------------------------------------------------
let currentSelectedProject = null;

// 역할 매핑
const roleDisplayNames = {
  frontend: '프론트엔드',
  backend: '백엔드',
  design: '디자인',
  pm: '기획'
};

// 팝업 열기
function openProjectPopup(project) {
  if (!requireLogin()) {
    return; 
  }

  currentSelectedProject = project;

  document.getElementById('popup-title').textContent = project.projectName || '프로젝트 이름 없음';
  document.getElementById('popup-type').textContent = project.projectType || '유형 없음';

  if (Array.isArray(project.techStack)) {
    document.getElementById('popup-techstack').textContent = project.techStack.join(', ');
  } else {
    document.getElementById('popup-techstack').textContent = project.techStack || '기술 스택 없음';
  }

  document.getElementById('popup-recruitment').textContent = `${project.maxTeamSize || 0}명`;
  document.getElementById('popup-duration').textContent = `${project.projectDuration || 0}`;
  document.getElementById('popup-description').textContent = project.projectDescription || '내용이 없습니다.';

  // 역할 버튼 세팅
  const applicationRolesElem = document.getElementById('application-roles');
  applicationRolesElem.innerHTML = '';

  if (project.roles && Array.isArray(project.roles)) {
    project.roles.forEach((role) => {
      const roleButton = document.createElement('button');
      roleButton.className = 'role-button';
      roleButton.textContent = roleDisplayNames[role] || role;
      roleButton.dataset.role = role;

      // 예) 이미 참여자거나 비활성화 등은 추가 로직 필요
      // roleButton.disabled = false;

      roleButton.addEventListener('click', () => {
        document.querySelectorAll('.role-button').forEach(btn => btn.classList.remove('active'));
        roleButton.classList.add('active');
      });
      applicationRolesElem.appendChild(roleButton);
    });
  }

  // 참여 여부에 따라 지원 버튼 비활성화 예시
  document.getElementById('apply-button').disabled = project.isParticipated;

  // 지원 폼 초기화
  resetApplicationForm();

  // 팝업 표시
  document.getElementById('project-popup').style.display = 'block';
}

// 팝업 닫기
function closeProjectPopup() {
  document.getElementById('project-popup').style.display = 'none';
  resetApplicationForm();
}

// 지원 폼 초기화
function resetApplicationForm() {
  document.querySelectorAll('.role-button').forEach((button) => button.classList.remove('active'));
  document.getElementById('application-note').value = '';
  document.getElementById('application-section').style.display = 'none';
}

// 로그인 필수 체크
function requireLogin() {
  if (!getLoggedInUserId()) {
    alert('로그인이 필요합니다!');
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

// "지원하기" 버튼
const applyBtn = document.getElementById('apply-button');
if (applyBtn) {
  applyBtn.addEventListener('click', () => {
    console.log("지원하기 버튼 클릭");
    document.getElementById('application-section').style.display = 'block';
  });
}

// "지원 제출" 버튼
const submitApplicationBtn = document.getElementById('submit-application');
if (submitApplicationBtn) {
  submitApplicationBtn.addEventListener('click', () => {
    const activeButton = document.querySelector('.role-button.active');
    const selectedRole = activeButton ? activeButton.dataset.role : null;
    const applicationNoteValue = document.getElementById('application-note').value.trim();

    if (!currentSelectedProject || !selectedRole || !applicationNoteValue) {
      alert('지원 유형과 지원서를 모두 작성해주세요.');
      return;
    }

    // WebSocket 메시지 전송 예시
    const message = {
      action: 'submitApplication',
      projectOwnerId: currentSelectedProject.ownerId,
      applicantId: userName, // 사용자 이름
      userId: userId,         // 사용자 ID
      projectName: currentSelectedProject.projectName,
      role: selectedRole,
      note: applicationNoteValue,
      projectId: currentSelectedProject.projectId || 'default-room-id'
    };

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
      alert('지원이 완료되었습니다!');
      closeProjectPopup();
      resetApplicationForm();
    } else {
      alert('연결이 원활하지 않아 지원을 전송할 수 없습니다.');
    }
  });
}

// ----------------------------------------------------
// (선택) 다른 함수: renderProjects(), etc. 필요시 구현
// ----------------------------------------------------
function renderProjects(projects) {
  // 필요 시, 별도 로직
  console.log('renderProjects 호출됨:', projects);
}
