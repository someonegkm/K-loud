// project_matching.js

// Lambda API Gateway Endpoint (API Gateway에서 배포한 Invoke URL + /user-matching)
const LAMBDA_API_URL = 'https://1ezekx8bu3.execute-api.ap-northeast-2.amazonaws.com/prod/user-matching';

// Cognito UserPool 객체가 선언되어 있다고 가정 (cognito.js에서 전역 userPool 객체 사용)
function getLoggedInUserId() {
  const cognitoUser = userPool.getCurrentUser();
  return cognitoUser ? cognitoUser.getUsername() : null;
}

// NavBar 업데이트 함수
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

// Lambda 호출 함수
async function fetchMatchingProjects(userId) {
  try {
    console.log('Calling Lambda with userId:', userId);
    const idToken = localStorage.getItem('idToken');
    if (!idToken) {
      console.warn('No idToken found in localStorage.');
    }

    const response = await fetch(LAMBDA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({ userId })
    });

    console.log('API Response Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response text:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const projects = await response.json();
    console.log('Filtered Projects:', projects);

    renderMatchingProjects(projects);
  } catch (error) {
    console.error('Error fetching projects:', error.message);
    alert(`Error fetching projects: ${error.message}`);
  }
}


// 프로젝트 목록 렌더링 함수
function renderMatchingProjects(projects) {
  const projectListDiv = document.getElementById('project-list');
  projectListDiv.innerHTML = ''; // 기존 내용 초기화

  if (Array.isArray(projects) && projects.length > 0) {
    let html = '<div class="row">';
    projects.forEach(proj => {
      const projectName = proj.projectName || 'No Name';
      const projectType = proj.projectType || 'N/A';
      let techStack = 'N/A';

      // techStack이 배열일 수도 있고, 문자열일 수도 있음
      if (Array.isArray(proj.techStack)) {
        techStack = proj.techStack.join(', ');
      } else if (typeof proj.techStack === 'string') {
        techStack = proj.techStack;
      }

      const projectDescription = proj.projectDescription || 'No Description';

      html += `
        <div class="col-md-4" style="margin-bottom:20px;">
          <div class="card">
            <div class="card-body">
              <h5 class="card-title">${projectName}</h5>
              <p class="card-text">Type: ${projectType}</p>
              <p class="card-text">Stacks: ${techStack}</p>
              <p class="card-text">Description: ${projectDescription}</p>
            </div>
          </div>
        </div>
      `;
    });
    html += '</div>';
    projectListDiv.innerHTML = html;
  } else {
    projectListDiv.innerHTML = '<p>조건에 맞는 프로젝트가 없습니다.</p>';
  }
}

// 페이지 로드 시 실행
window.addEventListener('load', () => {
  updateNavBar(); // NavBar 업데이트

  const userId = getLoggedInUserId();
  if (!userId) {
    console.log('로그인이 필요합니다.');
    alert('로그인이 필요합니다.');
    window.location.href = 'login.html';
    return;
  }

  console.log(`Logged-in User ID: ${userId}`);
  fetchMatchingProjects(userId); // Lambda 호출
});
