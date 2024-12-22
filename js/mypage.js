// mypage.js

let userId = '';
let currentEditingProjectId = null;
let currentSelectedProjectId = null; // 현재 상세정보 조회중인 프로젝트 ID

// Step Functions 시작 API (방장 관점)
const STEP_FUNCTIONS_START_API = 'https://<your_api>.execute-api.ap-northeast-2.amazonaws.com/prod/startProjectMatching';
// Top4 Matching API (방장 관점)
const TOP4_MATCHING_API = 'https://<your_api>.execute-api.ap-northeast-2.amazonaws.com/prod/top4project';
// 기존 "내 프로젝트" API
const USER_PROJECTS_API = 'https://<your_api>.execute-api.ap-northeast-2.amazonaws.com/prod/createproject';

// 기타 API들 (프로필, removeParticipant 등)도 원래 코드 유지

// 1) Cognito에서 사용자 세션 가져오기
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
        userId = cognitoUser.getUsername(); // 사용자 username
        console.log('로그인 아이디:', userId);

        const idToken = session.getIdToken().getJwtToken();
        const payload = JSON.parse(atob(idToken.split('.')[1]));
        // 이름, 이메일 등 표시
        document.getElementById('user-name').value = payload.name || '이름 없음';
        document.getElementById('user-email').value = payload.email || '이메일 없음';

        // 추가 프로필 API 호출
        fetchUserProfile(); 
        // 참여한 프로젝트
        fetchMyProjects(userId);
    });
}

// 2) 사용자 프로필 데이터 가져오기
async function fetchUserProfile() {
    try {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
            console.warn('accessToken 없음');
            return;
        }

        const response = await fetch(`https://<your_api>.execute-api.ap-northeast-2.amazonaws.com/prod/profile?UserID=${userId}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });
        if (!response.ok) throw new Error('사용자 프로필 데이터를 가져오지 못했습니다.');

        const userProfile = await response.json();
        console.log('사용자 데이터:', userProfile);
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
    }
}

// 3) 사용자 프로젝트(내가 만든 프로젝트) 가져오기 (원래 코드)
async function fetchUserProjects() {
    try {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
            alert('로그인 토큰이 없습니다.');
            return;
        }
        // 원래 URL: createproject?ownerId=
        const response = await fetch(`${USER_PROJECTS_API}?ownerId=${userId}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });
        if (!response.ok) throw new Error('프로젝트 목록 가져오기 실패');

        const data = await response.json();
        console.log('프로젝트 목록:', data);
        // data.data 형식일 수도 있으니 확인
        renderUserProjects(data.data || data.projects || []);
    } catch (error) {
        console.error('프로젝트 데이터 가져오는 중 오류:', error);
        alert('프로젝트 데이터를 가져오는 중 오류가 발생했습니다.');
    }
}

// 4) 화면에 "내 프로젝트" 표시
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

    window.userProjectsCache = projects; // 프로젝트 캐시
}

// 5) 프로젝트 선택 -> 상세 표시 -> 매칭 버튼 활성
function selectProject(projectId) {
    currentSelectedProjectId = projectId;
    showProjectDetail(projectId);
    document.getElementById('startMatchingBtn').disabled = false;
    document.getElementById('fetchResultBtn').disabled = false;
}

// 5.1) 상세정보 표시
function showProjectDetail(projectId) {
    if (!window.userProjectsCache) return;
    const project = window.userProjectsCache.find(p => p.projectId === projectId);
    if (!project) {
        document.getElementById('project-detail-container').innerHTML = '<p>프로젝트 정보를 찾지 못했습니다.</p>';
        return;
    }
    let participantsHTML='<p>참가한 인원이 없습니다.</p>';
    const parts = project.participants || [];
    if(parts.length>0){
      participantsHTML=`
        <h5>참가한 인원:</h5>
        <ul>
          ${parts.map(pt=>`
             <li>
               <strong>ID:</strong> ${pt.applicantId}<br>
               <strong>역할:</strong> ${pt.role}<br>
               <button class="btn btn-warning btn-sm" onclick="removeParticipant('${project.projectId}','${pt.applicantId}')">내쫓기</button>
             </li>`).join('')}
        </ul>
      `;
    }
    document.getElementById('project-detail-container').innerHTML = `
      <h4>${project.projectName}</h4>
      <p><strong>설명:</strong> ${project.projectDescription}</p>
      <p><strong>기술 스택:</strong> ${project.techStack? project.techStack.join(', '):''}</p>
      <p><strong>유형:</strong> ${project.projectType||''}</p>
      <p><strong>생성 일시:</strong> ${project.createdAt||''}</p>
      ${participantsHTML}
    `;
}

// 6) 매칭 실행 버튼 -> Step Functions
document.getElementById('startMatchingBtn').onclick= async function(){
  if(!currentSelectedProjectId){
    alert('프로젝트를 선택하세요.');
    return;
  }
  runProjectMatching(currentSelectedProjectId);
};

// (A) Step Functions에 projectId, ownerId 전달
async function runProjectMatching(projectId){
  const cognitoUser = userPool.getCurrentUser();
  if(!cognitoUser){
    alert('로그인 필요');
    return;
  }
  cognitoUser.getSession(async (err, session)=>{
    if(err||!session.isValid()){
      alert('세션 만료');
      return;
    }
    const idToken=session.getIdToken().getJwtToken();
    try {
      const resp=await fetch(STEP_FUNCTIONS_START_API, {
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ projectId: projectId, ownerId: userId })
      });
      if(!resp.ok) throw new Error('매칭 실행 실패');
      await resp.json();
      document.getElementById('statusMessage').innerHTML='<p>매칭이 시작되었습니다. 잠시 후 결과를 가져오세요.</p>';
    } catch(e){
      console.error(e);
      alert('매칭 실행 중 오류');
    }
  });
};

// 7) 결과 가져오기 버튼
document.getElementById('fetchResultBtn').onclick= async function(){
  if(!currentSelectedProjectId){
    alert('프로젝트 선택필요');
    return;
  }
  fetchMatchedUsers(currentSelectedProjectId);
};

// (B) 3번 Lambda에서 top4 -> 오른쪽 표시
async function fetchMatchedUsers(projectId){
  const cognitoUser=userPool.getCurrentUser();
  if(!cognitoUser){
    alert('로그인필요');
    return;
  }
  cognitoUser.getSession(async (err,session)=>{
    if(err||!session.isValid()){
      alert('세션 만료');
      return;
    }
    const idToken=session.getIdToken().getJwtToken();
    try {
      const url=`${TOP4_MATCHING_API}?projectId=${encodeURIComponent(projectId)}`;
      const resp=await fetch(url, {
        method:'GET',
        headers:{ 'Authorization': `Bearer ${idToken}` }
      });
      if(!resp.ok) throw new Error('결과 조회 실패');
      const data=await resp.json();
      renderMatchedUsers(data.top_4||[]);
      document.getElementById('statusMessage').innerHTML='<p>매칭 결과가 표시되었습니다.</p>';
    } catch(e){
      console.error(e);
      alert('결과 조회 오류');
    }
  });
}

function renderMatchedUsers(users){
  const container=document.getElementById('matched-users-container');
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
      <p><strong>점수:</strong> ${u.SimilarityScore}</p>
    `;
    container.appendChild(div);
  });
}

// 8) 프로젝트 수정, 삭제, removeParticipant => 원래 코드 그대로
async function deleteProject(projectId){
  if(!confirm('정말 프로젝트를 삭제하시겠습니까?')) return;
  try {
    const accessToken=localStorage.getItem('accessToken');
    if(!accessToken){
      alert('로그인 필요');
      return;
    }
    const resp=await fetch(`https://<your_api>.execute-api.ap-northeast-2.amazonaws.com/prod/createproject/${projectId}`, {
      method:'DELETE',
      headers:{ 'Authorization': `Bearer ${accessToken}` }
    });
    if(!resp.ok) throw new Error('프로젝트 삭제 실패');
    alert('프로젝트가 삭제되었습니다!');
    fetchUserProjects();
  } catch(e){
    console.error('프로젝트 삭제 에러:', e);
    alert('프로젝트 삭제 중 오류');
  }
}

function openEditPopup(project){
  currentEditingProjectId= project.projectId;
  document.getElementById('edit-projectName').value = project.projectName||'';
  document.getElementById('edit-projectDescription').value = project.projectDescription||'';
  document.getElementById('edit-techStack').value = project.techStack? project.techStack.join(', '):'';
  document.getElementById('edit-projectType').value = project.projectType||'';
  document.getElementById('edit-maxTeamSize').value = project.maxTeamSize||0;
  document.getElementById('edit-project-popup').style.display='block';
}

function closeEditPopup(){
  document.getElementById('edit-project-popup').style.display='none';
  currentEditingProjectId=null;
}
document.getElementById('cancelEditButton').onclick=closeEditPopup;

document.getElementById('saveEditButton').onclick= async function(){
  if(!currentEditingProjectId){
    alert('수정할 프로젝트가 없습니다.');
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
    const resp=await fetch('https://<your_api>.execute-api.ap-northeast-2.amazonaws.com/prod/updateProject',{
      method:'PUT',
      headers:{
        'Content-Type':'application/json',
        'Authorization': `Bearer ${localStorage.getItem('idToken')}`
      },
      body: JSON.stringify(updatedProject)
    });
    if(!resp.ok) throw new Error('프로젝트 수정 실패');
    alert('프로젝트가 성공적으로 수정되었습니다!');
    closeEditPopup();
    fetchUserProjects();
  } catch(e){
    console.error('프로젝트 수정 에러:', e);
    alert('프로젝트 수정 오류');
  }
};

// 참가자 내쫓기
async function removeParticipant(projectId, applicantId){
  if(!confirm('정말 참가자를 내쫓으시겠습니까?')) return;
  try {
    const resp=await fetch('https://<your_api>.execute-api.ap-northeast-2.amazonaws.com/prod/removeParticipant',{
      method:'DELETE',
      headers:{
        'Content-Type':'application/json',
        'Authorization': `Bearer ${localStorage.getItem('idToken')}`
      },
      body: JSON.stringify({ projectId, applicantId })
    });
    if(!resp.ok) throw new Error('참가자 삭제 실패');
    alert('참가자를 내쫓았습니다!');
    fetchUserProjects();
    if(currentSelectedProjectId===projectId){
      showProjectDetail(projectId);
    }
  } catch(e){
    console.error(e);
    alert('참가자 삭제 중 오류');
  }
}

// 9) "참여 프로젝트" (이미 존재하는 부분)
// 아래는 기존 코드 그대로 유지
async function fetchMyProjects(userId){
  // ...
  // 원본 코드에 있던 API
  // ...
  // renderMyProjects(...)
}
function renderMyProjects(projects){
  // ...
  // 원본 코드
}

// 10) 회원정보 폼 제출
function attachFormSubmitEvent(){
  const form=document.getElementById('profile-form');
  form.addEventListener('submit', async function(e){
    e.preventDefault();
    // 기존대로 userProfile 수집
    const userProfile={
      UserID: userId,
      name: document.getElementById('user-name').value,
      email: document.getElementById('user-email').value,
      user_techstack: document.getElementById('user-techstack').value,
      user_project_preference: Array.from(document.querySelectorAll('#user-project-preference input[type="checkbox"]:checked')).map(c=>c.value),
      user_project_experience: document.getElementById('user-project-experience').value,
      user_github: document.getElementById('user-github').value,
      user_intro: document.getElementById('user-intro').value
    };
    try {
      const resp=await fetch('https://<your_api>.execute-api.ap-northeast-2.amazonaws.com/prod/profile',{
        method:'POST',
        headers:{
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('idToken')}`
        },
        body: JSON.stringify(userProfile)
      });
      if(!resp.ok) throw new Error('프로필 저장 실패');
      alert('프로필 저장 성공');
      window.location.href='mypage.html';
    } catch(e){
      console.error('프로필 저장 오류:', e);
      alert('프로필 저장 중 오류 발생');
    }
  });
}

// 네비게이션
function updateNavBar(){
  const cognitoUser = userPool.getCurrentUser();
  const loginLogoutLink = document.getElementById('login-logout-link');
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
  // 기존 websocket.js 로직
}
