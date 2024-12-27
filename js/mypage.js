// mypage.js

let userId = '';
let currentEditingProjectId = null;
let currentSelectedProjectId = null; // 현재 상세정보 조회중인 프로젝트 ID

// Step Functions 시작 API (방장 관점)
const STEP_FUNCTIONS_START_API = 'https://1ezekx8bu3.execute-api.ap-northeast-2.amazonaws.com/dev/matching-ai-host';
// Top4 Matching API (방장 관점)
const TOP4_MATCHING_API = 'https://1ezekx8bu3.execute-api.ap-northeast-2.amazonaws.com/dev/top4matching-host';
// "내 프로젝트" API
const USER_PROJECTS_API = 'https://<your_api>.execute-api.ap-northeast-2.amazonaws.com/prod/createproject';

// (A) 헬퍼 함수: 개행(\n)을 <br>로 치환
function formatMultilineText(text) {
  if (!text) return '';
  // \r\n, \r, \n 모두 치환
  return text
    .replace(/\r\n/g, '<br>')
    .replace(/\r/g, '<br>')
    .replace(/\n/g, '<br>');
}

// 1) 사용자 세션
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

    // 추가 프로필 API
    fetchUserProfile();
    // "내 프로젝트" 불러오기
    fetchUserProjects();
  });
}

// 2) 프로필 가져오기
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
        Authorization: `Bearer ${accessToken}`
      }
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

// 3) "내 프로젝트" 가져오기
async function fetchUserProjects() {
  try {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      alert('로그인이 필요합니다.');
      window.location.href = 'login.html';
      return;
    }

    const response = await fetch(`https://d2miwwhvzmngyp.cloudfront.net/prod/createproject?ownerId=${userId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('사용자 프로젝트 데이터를 가져오지 못했습니다.');
    }

    const userProjects = await response.json();
    console.log('가져온 프로젝트 데이터:', userProjects);

    renderUserProjects(userProjects.data || []);
  } catch (error) {
    console.error('사용자 프로젝트 가져오기 오류:', error);
    alert('프로젝트 데이터를 가져오는 중 오류가 발생했습니다.');
  }
}

// 4) 프로젝트 목록을 Card로 표시 + 개행 치환
function renderUserProjects(projects) {
  const container = document.getElementById('user-projects-container');
  container.innerHTML = '';

  if (!projects || projects.length === 0) {
    container.innerHTML = '<p>등록된 프로젝트가 없습니다.</p>';
    return;
  }

  projects.forEach(proj => {
    // Bootstrap Card
    const card = document.createElement('div');
    card.className = 'card';

    const createdTime = proj.createdAt || '알 수 없음';
    const headerHtml = `
      <div class="card-header">
        <h5 class="card-title mb-0">${proj.projectName || '프로젝트 이름 없음'}</h5>
        <small class="text-muted">생성 일시: ${createdTime}</small>
      </div>
    `;

    // 프로젝트 설명 개행 치환
    const descHtml = formatMultilineText(proj.projectDescription || '');

    // 기술스택 Badge
    let techStackList = '';
    if (Array.isArray(proj.techStack)) {
      techStackList = proj.techStack.map(ts => `<span class="badge badge-info">${ts}</span>`).join(' ');
    }
    const bodyHtml = `
      <div class="card-body">
        <p><strong>설명:</strong> ${descHtml || '설명 없음'}</p>
        <p><strong>기술 스택:</strong> ${techStackList}</p>
        <p><strong>유형:</strong> ${proj.projectType || '유형 없음'}</p>
      </div>
    `;

    const footerHtml = `
      <div class="card-footer text-right">
        <button class="btn btn-sm btn-info" onclick="selectProject('${proj.projectId}')">선택</button>
        <button class="btn btn-sm btn-primary" onclick='openEditPopup(${JSON.stringify(proj)})'>수정</button>
        <button class="btn btn-sm btn-danger" onclick="deleteProject('${proj.projectId}')">삭제</button>
      </div>
    `;

    card.innerHTML = headerHtml + bodyHtml + footerHtml;
    container.appendChild(card);
  });

  window.userProjectsCache = projects;
}

// 5) 프로젝트 선택
function selectProject(projectId) {
  currentSelectedProjectId = projectId;
  showProjectDetail(projectId);
  document.getElementById('startMatchingBtn').disabled = false;
  document.getElementById('fetchResultBtn').disabled = false;
}

// 프로젝트 상세 (개행 치환)
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
      <h5>참가 인원:</h5>
      <ul>
        ${parts.map(pt => `
          <li>
            <strong>ID:</strong> ${pt.applicantId}<br>
            <strong>역할:</strong> ${pt.role}<br>
            <button class="btn btn-warning btn-sm" onclick="removeParticipant('${project.projectId}','${pt.applicantId}')">내쫓기</button>
          </li>
        `).join('')}
      </ul>
    `;
  }

  const descHtml = formatMultilineText(project.projectDescription || '');
  const techStr = Array.isArray(project.techStack) ? project.techStack.join(', ') : '';

  document.getElementById('project-detail-container').innerHTML = `
    <h5>${project.projectName || ''}</h5>
    <p><strong>설명:</strong> ${descHtml || '설명 없음'}</p>
    <p><strong>기술 스택:</strong> ${techStr}</p>
    <p><strong>유형:</strong> ${project.projectType || ''}</p>
    <p><strong>생성 일시:</strong> ${project.createdAt || ''}</p>
    ${participantsHTML}
  `;
}

// 매칭 실행
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
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({ projectId: projectId, ownerId: userId })
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

// 결과 가져오기
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
        headers: { Authorization: `Bearer ${idToken}` }
      });
      if (!resp.ok) throw new Error('결과 조회 실패');

      const data = await resp.json();
      console.log('[fetchMatchedUsers] data:', data);
      renderMatchedUsers(data.top_4 || []);
      document.getElementById('statusMessage').innerHTML = '<p>매칭 결과가 표시되었습니다.</p>';
    } catch (e) {
      console.error(e);
      alert('결과 조회 오류');
    }
  });
}

// 매칭된 유저 목록도 Card
function renderMatchedUsers(users) {
  const container = document.getElementById('matched-users-container');
  container.innerHTML = '';

  if (!users || users.length === 0) {
    container.innerHTML = '<p>매칭된 유저가 없습니다.</p>';
    return;
  }

  users.forEach(u => {
    const card = document.createElement('div');
    card.className = 'card mb-2';

    const score = (u.SimilarityScore && !isNaN(u.SimilarityScore))
      ? u.SimilarityScore.toFixed(2) : '0';

    const headerHtml = `
      <div class="card-header">
        <h6 class="card-title mb-0">
          UserID: ${u.UserID || ''} 
          <small class="text-muted">(점수: ${score})</small>
        </h6>
      </div>
    `;
    // 유저 소개도 개행 치환 가능
    const introHtml = formatMultilineText(u.userIntro || '');
    const bodyHtml = `
      <div class="card-body">
        <p><strong>이름:</strong> ${u.userName || ''}</p>
        <p><strong>기술스택:</strong> ${u.userTechStack || ''}</p>
        <p><strong>자기소개:</strong> ${introHtml}</p>
      </div>
    `;
    card.innerHTML = headerHtml + bodyHtml;
    container.appendChild(card);
  });
}

// 삭제
async function deleteProject(projectId) {
  if (!confirm('정말 프로젝트를 삭제하시겠습니까?')) return;
  try {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      alert('로그인 필요');
      return;
    }
    const resp = await fetch(`https://d2miwwhvzmngyp.cloudfront.net/prod/createproject/${projectId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!resp.ok) throw new Error('프로젝트 삭제 실패');
    alert('프로젝트가 삭제되었습니다!');
    fetchUserProjects();
  } catch (e) {
    console.error('프로젝트 삭제 에러:', e);
    alert('프로젝트 삭제 중 오류');
  }
}

function openEditPopup(project) {
  currentEditingProjectId = project.projectId;
  document.getElementById('edit-projectName').value = project.projectName || '';
  // 편집 폼에서 편집할 때는 개행 복원 없이 raw 데이터(, ) 사용
  document.getElementById('edit-projectDescription').value =
    project.projectDescription || '';
  document.getElementById('edit-techStack').value =
    project.techStack ? project.techStack.join(', ') : '';
  document.getElementById('edit-projectType').value = project.projectType || 'Web Development';
  document.getElementById('edit-maxTeamSize').value = project.maxTeamSize || 0;
  document.getElementById('edit-project-popup').style.display = 'block';
}

function closeEditPopup() {
  document.getElementById('edit-project-popup').style.display = 'none';
  currentEditingProjectId = null;
}
document.getElementById('cancelEditButton').onclick = closeEditPopup;

document.getElementById('saveEditButton').onclick = async function () {
  if (!currentEditingProjectId) {
    alert('수정할 프로젝트가 없습니다.');
    return;
  }
  const updatedProject = {
    projectId: currentEditingProjectId,
    projectName: document.getElementById('edit-projectName').value,
    // 사용자 입력을 그대로 저장
    projectDescription: document.getElementById('edit-projectDescription').value,
    techStack: document.getElementById('edit-techStack').value.split(',').map(s => s.trim()),
    projectType: document.getElementById('edit-projectType').value,
    maxTeamSize: parseInt(document.getElementById('edit-maxTeamSize').value, 10)
  };

  try {
    const idToken = localStorage.getItem('idToken');
    if (!idToken) {
      alert('로그인 필요');
      return;
    }
    const response = await fetch('https://d2miwwhvzmngyp.cloudfront.net/prod/updateProject', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify(updatedProject)
    });
    if (!response.ok) throw new Error('프로젝트 수정 실패');
    alert('프로젝트가 성공적으로 수정되었습니다!');
    closeEditPopup();
    fetchUserProjects();
  } catch (e) {
    console.error('프로젝트 수정 에러:', e);
    alert('프로젝트 수정 오류');
  }
};

async function removeParticipant(projectId, applicantId) {
  if (!confirm('정말 참가자를 내쫓으시겠습니까?')) return;
  try {
    const idToken = localStorage.getItem('idToken');
    if (!idToken) {
      alert('로그인 필요');
      return;
    }
    const resp = await fetch('https://d2miwwhvzmngyp.cloudfront.net/prod/removeParticipant', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify({ projectId, applicantId })
    });
    if (!resp.ok) throw new Error('참가자 삭제 실패');
    alert('참가자를 내쫓았습니다!');
    fetchUserProjects();
    if (currentSelectedProjectId === projectId) {
      showProjectDetail(projectId);
    }
  } catch (e) {
    console.error(e);
    alert('참가자 삭제 중 오류');
  }
}

// 9) "참여한 프로젝트" (기존 유지)
async function fetchMyProjects(userId) {
  // ...
}

function renderMyProjects(projects) {
  // ...
}

// 회원정보 폼 제출
function attachFormSubmitEvent() {
  const form = document.getElementById('profile-form');
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    const userProfile = {
      UserID: userId,
      name: document.getElementById('user-name').value,
      email: document.getElementById('user-email').value,
      user_techstack: document.getElementById('user-techstack').value,
      user_project_preference: Array.from(document.querySelectorAll('#user-project-preference input[type="checkbox"]:checked')).map(c => c.value),
      user_project_experience: document.getElementById('user-project-experience').value,
      user_github: document.getElementById('user-github').value,
      user_intro: document.getElementById('user-intro').value
    };

    try {
      const idToken = localStorage.getItem('idToken');
      if (!idToken) {
        alert('로그인 필요');
        return;
      }
      const response = await fetch('https://d2miwwhvzmngyp.cloudfront.net/prod/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify(userProfile)
      });
      if (!response.ok) throw new Error('프로필 저장 실패');
      alert('프로필 저장 성공');
      window.location.href = 'mypage.html';
    } catch (e) {
      console.error(e);
      alert('프로필 저장 오류');
    }
  });
}

// 네비게이션
function updateNavBar() {
  const cognitoUser = userPool.getCurrentUser();
  const loginLogoutLink = document.getElementById('login-logout-link');
  if (cognitoUser) {
    loginLogoutLink.textContent = '로그아웃';
    loginLogoutLink.href = '#';
    loginLogoutLink.onclick = function() {
      cognitoUser.signOut();
      window.location.href = 'login.html';
    };
  } else {
    loginLogoutLink.textContent = '로그인';
    loginLogoutLink.href = 'login.html';
    loginLogoutLink.onclick = null;
  }
}

function connectWebSocket(userPool) {
  // 기존 websocket.js 로직 그대로 유지
}
