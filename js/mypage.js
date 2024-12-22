// mypage.js (프로젝트 방장 관점 - 원본 코드 최대한 유지 + 매칭 부분 추가)

// 전역변수
let userId = '';
let currentEditingProjectId = null;
let currentSelectedProjectId = null; // 현재 상세정보 조회중인 프로젝트 ID

// Step Functions 시작 API
const STEP_FUNCTIONS_START_API = 'https://<your_api>.execute-api.ap-northeast-2.amazonaws.com/prod/startProjectMatching';
// Top4 Matching API
const TOP4_MATCHING_API = 'https://<your_api>.execute-api.ap-northeast-2.amazonaws.com/prod/top4project';
// userProjects API
const USER_PROJECTS_API = 'https://<your_api>.execute-api.ap-northeast-2.amazonaws.com/prod/listMyProjects';
// 프로필 등 기타 API는 환경에 맞춰 수정 필요.

// 1) 사용자 프로필(이름, 이메일 등) Cognito에서 가져오기
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

        userId = cognitoUser.getUsername();
        const idToken = session.getIdToken().getJwtToken();
        const payload = JSON.parse(atob(idToken.split('.')[1]));
        document.getElementById('user-name').value = payload.name || '이름 없음';
        document.getElementById('user-email').value = payload.email || '이메일 없음';

        fetchUserProfile(); // API로 상세 프로필 가져오기
        fetchMyProjects(userId); // "참여 프로젝트" 목록
    });
}

// 2) 프로필 가져오기(백엔드 API)
async function fetchUserProfile() {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) return;

    const response = await fetch(`https://<your_api>.execute-api.ap-northeast-2.amazonaws.com/prod/profile?UserID=${userId}`, {
        method:'GET',
        headers:{ 'Authorization': `Bearer ${accessToken}` }
    });

    if (response.ok) {
        const userProfile = await response.json();
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
    }
}

// 3) "내 프로젝트" 가져오기 (ownerId=userId)
async function fetchUserProjects() {
    try {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
            alert('로그인 토큰없음');
            return;
        }

        const response = await fetch(`${USER_PROJECTS_API}?ownerId=${userId}`, {
            method:'GET',
            headers:{ 'Authorization': `Bearer ${accessToken}` }
        });
        if (!response.ok) {
            throw new Error('프로젝트 목록 가져오기 실패');
        }

        const data = await response.json();
        // data.projects 형식 가정
        renderUserProjects(data.projects || []);
    } catch (error) {
        console.error('사용자 프로젝트 가져오기 오류:', error);
        alert('프로젝트 데이터를 가져오는 중 오류가 발생했습니다.');
    }
}

// 4) 화면에 프로젝트 목록 렌더
function renderUserProjects(projects) {
    const container = document.getElementById('user-projects-container');
    container.innerHTML = '';

    if (projects.length === 0) {
        container.innerHTML = '<p>등록된 프로젝트가 없습니다.</p>';
        return;
    }

    projects.forEach(proj => {
        const div = document.createElement('div');
        div.className = 'project-item';
        div.innerHTML = `
            <h4>${proj.projectName}</h4>
            <p><strong>설명:</strong> ${proj.projectDescription}</p>
            <p><strong>기술 스택:</strong> ${proj.techStack ? proj.techStack.join(', ') : ''}</p>
            <p><strong>유형:</strong> ${proj.projectType}</p>
            <p><strong>생성 일시:</strong> ${proj.createdAt}</p>
            <button class="btn btn-sm btn-info" onclick="selectProject('${proj.projectId}')">선택</button>
            <button class="btn btn-primary btn-sm" onclick='openEditPopup(${JSON.stringify(proj)})'>수정</button>
            <button class="btn btn-danger btn-sm" onclick="deleteProject('${proj.projectId}')">삭제</button>
        `;
        container.appendChild(div);
    });

    // 전역 캐시
    window.userProjectsCache = projects;
}

// 5) 프로젝트 선택 -> 왼쪽 상세 표시 + 매칭버튼 활성
function selectProject(projectId) {
    currentSelectedProjectId = projectId;
    showProjectDetail(projectId);
    document.getElementById('startMatchingBtn').disabled = false;
    document.getElementById('fetchResultBtn').disabled = false;
}

// 6) 상세 정보 표시
function showProjectDetail(projectId) {
    if (!window.userProjectsCache) return;
    const project = window.userProjectsCache.find(p => p.projectId === projectId);
    if (!project) {
        document.getElementById('project-detail-container').innerHTML = '<p>프로젝트 데이터를 찾지 못했습니다.</p>';
        return;
    }

    let participantsHTML = '<p>참가한 인원이 없습니다.</p>';
    const participants = project.participants || [];
    if (participants.length > 0) {
        participantsHTML = `
          <h5>참가 인원:</h5>
          <ul>
            ${participants.map(pt => `
              <li>
                <strong>ID:</strong> ${pt.applicantId}<br>
                <strong>역할:</strong> ${pt.role}<br>
                <button class="btn btn-warning btn-sm" onclick="removeParticipant('${project.projectId}','${pt.applicantId}')">내쫓기</button>
              </li>
            `).join('')}
          </ul>
        `;
    }

    document.getElementById('project-detail-container').innerHTML = `
      <h4>${project.projectName}</h4>
      <p><strong>설명:</strong> ${project.projectDescription}</p>
      <p><strong>기술 스택:</strong> ${project.techStack ? project.techStack.join(', ') : ''}</p>
      <p><strong>유형:</strong> ${project.projectType}</p>
      <p><strong>생성 일시:</strong> ${project.createdAt}</p>
      ${participantsHTML}
    `;
}

// 매칭 실행 버튼
document.getElementById('startMatchingBtn').onclick = async function() {
  if (!currentSelectedProjectId) {
    alert('프로젝트를 먼저 선택하세요.');
    return;
  }
  runStepFunctionsMatching(currentSelectedProjectId);
};

// 매칭 실행 (Step Functions 시작)
async function runStepFunctionsMatching(projectId) {
  try {
    const cognitoUser = userPool.getCurrentUser();
    if (!cognitoUser) {
      alert('로그인 필요');
      window.location.href='login.html';
      return;
    }

    cognitoUser.getSession(async (err, session) => {
      if (err || !session.isValid()) {
        alert('세션 만료');
        return;
      }
      const idToken = session.getIdToken().getJwtToken();

      const response = await fetch(STEP_FUNCTIONS_START_API, {
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ projectId: projectId, ownerId: userId })
      });
      if (!response.ok) throw new Error('매칭 실행 실패');
      await response.json();
      document.getElementById('statusMessage').innerHTML='<p>매칭이 시작되었습니다. 잠시 후 결과 가져오기를 눌러주세요.</p>';
    });
  } catch(e) {
    console.error(e);
    alert('매칭 실행 중 오류가 발생했습니다.');
  }
};

// 결과 가져오기 버튼
document.getElementById('fetchResultBtn').onclick = async function() {
  if (!currentSelectedProjectId) {
    alert('프로젝트를 먼저 선택하세요.');
    return;
  }
  fetchMatchingResult(currentSelectedProjectId);
};

// 결과 가져오기 (3번 Lambda)
async function fetchMatchingResult(projectId) {
  try {
    const cognitoUser = userPool.getCurrentUser();
    if (!cognitoUser) {
      alert('로그인 필요');
      window.location.href='login.html';
      return;
    }
    cognitoUser.getSession(async (err, session) => {
      if (err || !session.isValid()) {
        alert('세션만료');
        return;
      }
      const idToken = session.getIdToken().getJwtToken();
      const url = `${TOP4_MATCHING_API}?projectId=${encodeURIComponent(projectId)}`;
      const resp = await fetch(url, {
        method:'GET',
        headers:{ 'Authorization': `Bearer ${idToken}` }
      });
      if (!resp.ok) throw new Error('결과 조회 실패');
      const data = await resp.json();
      renderMatchedUsers(data.top_4 || []);
      document.getElementById('statusMessage').innerHTML='<p>매칭 결과가 표시되었습니다.</p>';
    });
  } catch(e) {
    console.error(e);
    alert('결과 조회 오류');
  }
}

// 오른쪽 영역에 매칭된 유저 표시
function renderMatchedUsers(users){
  const container = document.getElementById('matched-users-container');
  container.innerHTML='';
  if(!users || users.length===0){
    container.innerHTML='<p>매칭된 유저가 없습니다.</p>';
    return;
  }
  users.forEach(u=>{
    const div=document.createElement('div');
    div.className='matched-user-item';
    div.innerHTML=`
      <p><strong>UserID:</strong> ${u.UserID}</p>
      <p><strong>Similarity Score:</strong> ${u.SimilarityScore}</p>
    `;
    container.appendChild(div);
  });
}

// 프로젝트 수정/삭제/참가자 내쫓기, etc
async function deleteProject(projectId) {
  if(!confirm('정말 삭제?')) return;
  const accessToken=localStorage.getItem('accessToken');
  if(!accessToken)return;
  const resp=await fetch(`https://<your_api>.execute-api.ap-northeast-2.amazonaws.com/prod/createproject/${projectId}`, {
    method:'DELETE',
    headers:{ 'Authorization': `Bearer ${accessToken}` }
  });
  if(resp.ok){
    alert('프로젝트 삭제 성공');
    fetchUserProjects();
  } else {
    alert('프로젝트 삭제 실패');
  }
}

function openEditPopup(project) {
  currentEditingProjectId = project.projectId;
  document.getElementById('edit-projectName').value = project.projectName || '';
  document.getElementById('edit-projectDescription').value = project.projectDescription || '';
  document.getElementById('edit-techStack').value = project.techStack ? project.techStack.join(', ') : '';
  document.getElementById('edit-projectType').value = project.projectType || '';
  document.getElementById('edit-maxTeamSize').value = project.maxTeamSize || 0;
  document.getElementById('edit-project-popup').style.display='block';
}

function closeEditPopup() {
  document.getElementById('edit-project-popup').style.display='none';
  currentEditingProjectId=null;
}
document.getElementById('cancelEditButton').onclick=closeEditPopup;

document.getElementById('saveEditButton').onclick=async function(){
  if(!currentEditingProjectId){
    alert('수정할 프로젝트를 선택하지 않았습니다.');
    return;
  }
  const updatedProject={
    projectId:currentEditingProjectId,
    projectName:document.getElementById('edit-projectName').value,
    projectDescription:document.getElementById('edit-projectDescription').value,
    techStack: document.getElementById('edit-techStack').value.split(',').map(s=>s.trim()),
    projectType: document.getElementById('edit-projectType').value,
    maxTeamSize: parseInt(document.getElementById('edit-maxTeamSize').value,10)
  };

  try {
    const response = await fetch('https://<your_api>.execute-api.ap-northeast-2.amazonaws.com/prod/updateProject', {
      method:'PUT',
      headers:{
        'Content-Type':'application/json',
        'Authorization': `Bearer ${localStorage.getItem('idToken')}`
      },
      body: JSON.stringify(updatedProject)
    });
    if (!response.ok) throw new Error('프로젝트 수정 실패');
    alert('프로젝트 수정 성공!');
    closeEditPopup();
    fetchUserProjects();
  } catch (error) {
    console.error(error);
    alert('프로젝트 수정 중 오류 발생');
  }
};

async function removeParticipant(projectId, applicantId) {
  if (!confirm('참가자를 내쫓겠습니까?')) return;

  try {
    const response = await fetch('https://<your_api>.execute-api.ap-northeast-2.amazonaws.com/prod/removeParticipant', {
      method:'DELETE',
      headers:{
        'Content-Type':'application/json',
        'Authorization': `Bearer ${localStorage.getItem('idToken')}`
      },
      body: JSON.stringify({ projectId, applicantId })
    });
    if(!response.ok) throw new Error('참가자 삭제 실패');
    alert('참가자 내쫓기 성공!');
    fetchUserProjects();
    if(currentSelectedProjectId===projectId){
      showProjectDetail(projectId);
    }
  } catch(e){
    console.error(e);
    alert('참가자 삭제 오류');
  }
}

// 참여한 프로젝트
async function fetchMyProjects(userId) {
  const API_URL = `https://<your_api>.execute-api.ap-northeast-2.amazonaws.com/prod/getAcceptProjects?applicantId=${userId}`;
  try {
    const accessToken = localStorage.getItem('accessToken');
    if(!accessToken){
      alert('로그인 필요');
      return;
    }
    const response=await fetch(API_URL,{
      method:'GET',
      headers:{ 'Authorization': `Bearer ${accessToken}` }
    });
    if(!response.ok) throw new Error('참여 프로젝트 조회 실패');
    const projects=await response.json();
    renderMyProjects(projects);
  } catch(error){
    console.error('참여 프로젝트 가져오기 오류:', error);
    document.getElementById('participated-projects-container').innerHTML='<p>참여한 프로젝트 가져오기 실패</p>';
  }
}

function renderMyProjects(projects){
  const container=document.getElementById('participated-projects-container');
  container.innerHTML='';
  if(!projects || projects.length===0){
    container.innerHTML='<p>참여한 프로젝트가 없습니다.</p>';
    return;
  }
  projects.forEach(p=>{
    const div=document.createElement('div');
    div.className='project-item';
    div.style.border='1px solid #ccc';
    div.style.padding='10px';
    div.style.marginBottom='10px';
    div.innerHTML=`
      <h4>${p.projectName || '프로젝트 없음'}</h4>
      <p><strong>방장:</strong> ${p.projectOwnerId}</p>
      <p><strong>참여 시간:</strong> ${new Date(Number(p.timestamp)).toLocaleString()}</p>
    `;
    container.appendChild(div);
  });
}

// 프로필 폼 제출
function attachFormSubmitEvent(){
  const form=document.getElementById('profile-form');
  form.addEventListener('submit', async function(e){
    e.preventDefault();
    const userProfile={
      UserID:userId,
      name:document.getElementById('user-name').value,
      email:document.getElementById('user-email').value,
      user_techstack:document.getElementById('user-techstack').value,
      user_project_preference:Array.from(document.querySelectorAll('#user-project-preference input[type="checkbox"]:checked'))
                                 .map(c=>c.value),
      user_project_experience:document.getElementById('user-project-experience').value,
      user_github:document.getElementById('user-github').value,
      user_intro:document.getElementById('user-intro').value
    };

    try {
      const response=await fetch('https://<your_api>.execute-api.ap-northeast-2.amazonaws.com/prod/profile',{
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'Authorization': `Bearer ${localStorage.getItem('idToken')}`
        },
        body: JSON.stringify(userProfile)
      });
      if(!response.ok) throw new Error('프로필 저장 실패');
      alert('프로필 저장 성공');
      window.location.href='mypage.html';
    } catch(e){
      console.error(e);
      alert('프로필 저장 오류');
    }
  });
}

// 네비게이션 로그인/로그아웃 표시
function updateNavBar(){
  const cognitoUser=userPool.getCurrentUser();
  const loginLogoutLink=document.getElementById('login-logout-link');
  if(cognitoUser){
    loginLogoutLink.textContent='로그아웃';
    loginLogoutLink.href='#';
    loginLogoutLink.onclick=function(){
      cognitoUser.signOut();
      window.location.href='login.html';
    };
  } else {
    loginLogoutLink.textContent='로그인';
    loginLogoutLink.href='login.html';
    loginLogoutLink.onclick=null;
  }
}

function connectWebSocket(userPool){
  // 필요시 websocket 기능
}
