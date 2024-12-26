// mypage.js

let userId = '';
let currentEditingProjectId = null;
let currentSelectedProjectId = null; // 현재 상세정보 조회중인 프로젝트 ID

// Step Functions 시작 API (방장 관점)
const STEP_FUNCTIONS_START_API = 'https://1ezekx8bu3.execute-api.ap-northeast-2.amazonaws.com/dev/matching-ai-host';
// Top4 Matching API (방장 관점)
const TOP4_MATCHING_API = 'https://1ezekx8bu3.execute-api.ap-northeast-2.amazonaws.com/dev/top4matching-host';
// 기존 "내 프로젝트" API (프로젝트 목록 가져오기)
const USER_PROJECTS_API = 'https://<your_api>.execute-api.ap-northeast-2.amazonaws.com/prod/createproject';

// 1) Cognito 세션
function populateUserProfile() {
  const cognitoUser = userPool.getCurrentUser();
  if (!cognitoUser) {
    alert('로그인이 필요합니다.');
    window.location.href = 'login.html';
    return;
  }

  cognitoUser.getSession((err, session) => {
    if (err || !session.isValid()) {
      alert('세션이 유효하지 않습니다. 다시 로그인해주세요.');
      window.location.href = 'login.html';
      return;
    }

    console.log('Cognito 세션 성공');
    userId = cognitoUser.getUsername();
    console.log('로그인 아이디:', userId);

    const idToken = session.getIdToken().getJwtToken();
    const payload = JSON.parse(atob(idToken.split('.')[1]));
    document.getElementById('user-name').value = payload.name || '이름 없음';
    document.getElementById('user-email').value = payload.email || '이메일 없음';

    // 추가 API들
    fetchUserProfile();
    fetchMyProjects(userId);
  });
}

// 2) 사용자 프로필
async function fetchUserProfile() {
  try {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      alert('Access Token이 없습니다. 다시 로그인해주세요.');
      window.location.href = 'login.html';
      return;
    }

    const response = await fetch(`https://d2miwwhvzmngyp.cloudfront.net/prod/profile?UserID=${userId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('사용자 프로필 데이터를 가져오지 못했습니다.');
    }

    const userProfile = await response.json();
    console.log('가져온 사용자 데이터:', userProfile);

    document.getElementById('user-name').value = userProfile.name || '';
    document.getElementById('user-email').value = userProfile.email || '';
    document.getElementById('user-techstack').value = userProfile['user-techstack'] || '';
    document.getElementById('user-project-experience').value = userProfile['user-project-experience'] || '';
    document.getElementById('user-github').value = userProfile['user-github'] || '';
    document.getElementById('user-intro').value = userProfile['user-intro'] || '';

    const prefs = userProfile['user-project-preference'] || [];
    if (Array.isArray(prefs)) {
      prefs.forEach(pref => {
        const checkbox = document.querySelector(`#user-project-preference input[value="${pref}"]`);
        if (checkbox) checkbox.checked = true;
      });
    }
  } catch (error) {
    console.error('사용자 데이터 가져오기 오류:', error);
    alert('사용자 데이터를 가져오는 중 오류가 발생했습니다.');
  }
}

// 3) "내 프로젝트" (내가 만든 프로젝트) 가져오기
async function fetchUserProjects() {
  try {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      alert('Access Token이 없습니다. 다시 로그인해주세요.');
      window.location.href = 'login.html';
      return;
    }

    const response = await fetch(`https://d2miwwhvzmngyp.cloudfront.net/prod/createproject?ownerId=${userId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('사용자 프로젝트 데이터를 가져오지 못했습니다.');
    }

    const userProjects = await response.json();
    console.log('가져온 프로젝트 데이터:', userProjects);

    // userProjects.data 가 실제 배열
    renderUserProjects(userProjects.data || []);
  } catch (error) {
    console.error('사용자 프로젝트 가져오기 오류:', error);
    alert('프로젝트 데이터를 가져오는 중 오류가 발생했습니다.');
  }
}

// 4) 화면에 "내 프로젝트" 표시
function renderUserProjects(projects) {
  const container = document.getElementById('user-projects-container');
  container.innerHTML = '';

  if (!projects || projects.length === 0) {
    container.innerHTML = '<p>등록된 프로젝트가 없습니다.</p>';
    return;
  }

  projects.forEach(proj => {
    const div = document.createElement('div');
    div.className = 'project-item';
    div.innerHTML = `
      <h4>${proj.projectName || '프로젝트 이름 없음'}</h4>
      <p><strong>설명:</strong> ${proj.projectDescription || '설명 없음'}</p>
      <p><strong>기술 스택:</strong> ${proj.techStack ? proj.techStack.join(', ') : ''}</p>
      <p><strong>유형:</strong> ${proj.projectType || '유형 없음'}</p>
      <p><strong>생성 일시:</strong> ${proj.createdAt || '알 수 없음'}</p>
      <button class="btn btn-sm btn-info" onclick="selectProject('${proj.projectId}')">선택</button>
      <button class="btn btn-primary btn-sm" onclick='openEditPopup(${JSON.stringify(proj)})'>수정</button>
      <button class="btn btn-danger btn-sm" onclick="deleteProject('${proj.projectId}')">삭제</button>
    `;
    container.appendChild(div);
  });

  window.userProjectsCache = projects;
}

// 5) 프로젝트 선택 -> 버튼 활성
function selectProject(projectId) {
  currentSelectedProjectId = projectId;
  showProjectDetail(projectId);
  document.getElementById('startMatchingBtn').disabled = false;
  document.getElementById('fetchResultBtn').disabled = false;
}

// 상세정보 표시
function showProjectDetail(projectId) {
  if (!window.userProjectsCache) return;
  const project = window.userProjectsCache.find(p => p.projectId === projectId);
  if (!project) {
    document.getElementById('project-detail-container').innerHTML = '<p>프로젝트 정보를 찾지 못했습니다.</p>';
    return;
  }

  let participantsHTML = '<p>참가한 인원이 없습니다.</p>';
  const parts = project.participants || [];
  if (parts.length > 0) {
    participantsHTML = `
      <h5>참가한 인원:</h5>
      <ul>
        ${parts
          .map(
            pt => `
            <li>
              <strong>ID:</strong> ${pt.applicantId}<br>
              <strong>역할:</strong> ${pt.role}<br>
              <button class="btn btn-warning btn-sm" onclick="removeParticipant('${project.projectId}','${pt.applicantId}')">내쫓기</button>
            </li>
          `
          )
          .join('')}
      </ul>
    `;
  }

  document.getElementById('project-detail-container').innerHTML = `
    <h4>${project.projectName}</h4>
    <p><strong>설명:</strong> ${project.projectDescription}</p>
    <p><strong>기술 스택:</strong> ${project.techStack ? project.techStack.join(', ') : ''}</p>
    <p><strong>유형:</strong> ${project.projectType || ''}</p>
    <p><strong>생성 일시:</strong> ${project.createdAt || ''}</p>
    ${participantsHTML}
  `;
}

// 6) 매칭 실행 (Step Functions)
document.getElementById('startMatchingBtn').onclick = async function () {
  if (!currentSelectedProjectId) {
    alert('프로젝트를 선택하세요.');
    return;
  }
  runProjectMatching(currentSelectedProjectId);
};

async function runProjectMatching(projectId) {
  const cognitoUser = userPool.getCurrentUser();
  if (!cognitoUser) {
    alert('로그인 필요');
    return;
  }
  cognitoUser.getSession(async (err, session) => {
    if (err || !session.isValid()) {
      alert('세션 만료');
      return;
    }
    const idToken = session.getIdToken().getJwtToken();
    try {
      const resp = await fetch(STEP_FUNCTIONS_START_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ projectId: projectId, ownerId: userId }),
      });
      if (!resp.ok) throw new Error('매칭 실행 실패');
      await resp.json();
      document.getElementById('statusMessage').innerHTML = '<p>매칭이 시작되었습니다. 잠시 후 결과를 가져오세요.</p>';
    } catch (e) {
      console.error(e);
      alert('매칭 실행 중 오류');
    }
  });
};

// 7) 결과 가져오기 버튼
document.getElementById('fetchResultBtn').onclick = async function () {
  if (!currentSelectedProjectId) {
    alert('프로젝트 선택필요');
    return;
  }
  fetchMatchedUsers(currentSelectedProjectId);
};

async function fetchMatchedUsers(projectId) {
  const cognitoUser = userPool.getCurrentUser();
  if (!cognitoUser) {
    alert('로그인 필요');
    return;
  }
  cognitoUser.getSession(async (err, session) => {
    if (err || !session.isValid()) {
      alert('세션 만료');
      return;
    }
    const idToken = session.getIdToken().getJwtToken();
    try {
      const url = `${TOP4_MATCHING_API}?projectId=${encodeURIComponent(projectId)}`;
      const resp = await fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!resp.ok) throw new Error('결과 조회 실패');

      const data = await resp.json();
      console.log('[fetchMatchedUsers] data:', data); // 콘솔에 전체 응답 확인
      // data.top_4에 유저 배열이 들어있을 것으로 예상
      renderMatchedUsers(data.top_4 || []);
      document.getElementById('statusMessage').innerHTML = '<p>매칭 결과가 표시되었습니다.</p>';
    } catch (e) {
      console.error(e);
      alert('결과 조회 오류');
    }
  });
}

// ======== 여기서 userName, userTechStack, userIntro 등도 표시하도록 수정 ========
function renderMatchedUsers(users) {
  const container = document.getElementById('matched-users-container');
  container.innerHTML = '';
  if (!users || users.length === 0) {
    container.innerHTML = '<p>매칭된 유저가 없습니다.</p>';
    return;
  }

  users.forEach(u => {
    const div = document.createElement('div');
    div.className = 'matched-user-item';

    // Lambda가 반환하는 필드: UserID, SimilarityScore, userName, userTechStack, userIntro
    div.innerHTML = `
      <p><strong>UserID:</strong> ${u.UserID}</p>
      <p><strong>점수:</strong> ${u.SimilarityScore}</p>
      <p><strong>이름:</strong> ${u.userName || ''}</p>
      <p><strong>기술스택:</strong> ${u.userTechStack || ''}</p>
      <p><strong>자기소개:</strong> ${u.userIntro || ''}</p>
    `;
    container.appendChild(div);
  });
}
// ==============================================

// 8) 프로젝트 수정 / 삭제 / removeParticipant (기존 로직)

// ... (deleteProject, openEditPopup, closeEditPopup, saveEditButton.onclick, removeParticipant, etc.)

// 9) "참여한 프로젝트" (기존 로직)
async function fetchMyProjects(userId) {
  // ...
  // renderMyProjects(...)
}

function renderMyProjects(projects) {
  // ...
}

// 10) 회원정보 폼 제출
function attachFormSubmitEvent() {
  // ...
}

// 네비게이션
function updateNavBar() {
  // ...
}

function connectWebSocket(userPool) {
  // ...
}
