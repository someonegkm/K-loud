// project_matching.js

// Step Functions API Gateway Endpoint (Step Functions 실행 엔드포인트 URL)
const STEP_FUNCTIONS_API_URL = 'https://1ezekx8bu3.execute-api.ap-northeast-2.amazonaws.com/dev/StepFunctionsTriggerAPI';

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

// Step Functions 실행 함수
async function startStepFunctions(userId) {
  try {
    console.log('Starting Step Functions with userId:', userId);
    const idToken = localStorage.getItem('idToken');
    if (!idToken) {
      console.warn('No idToken found in localStorage.');
    }

    // Step Functions 실행 요청
    const response = await fetch(STEP_FUNCTIONS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({
        userId: userId
      })
    });

    console.log('Step Functions Start Response Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response text:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const executionDetails = await response.json();
    console.log('Step Functions Execution Details:', executionDetails);

    // 실행 ARN을 기반으로 결과 확인 요청
    const executionArn = executionDetails.executionArn;
    await fetchStepFunctionsResult(executionArn);

  } catch (error) {
    console.error('Error starting Step Functions:', error.message);
    alert(`Error starting Step Functions: ${error.message}`);
  }
}

// Step Functions 실행 결과 가져오기 함수
async function fetchStepFunctionsResult(executionArn) {
  try {
    const resultUrl = `${STEP_FUNCTIONS_API_URL}/result?executionArn=${encodeURIComponent(executionArn)}`;

    // Step Functions 결과 가져오기 요청
    let response;
    do {
      response = await fetch(resultUrl);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error fetching result:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Step Functions Execution Result:', result);

      if (result.status === 'SUCCEEDED') {
        console.log('Final Result:', result.output);
        const output = JSON.parse(result.output); // 결과 파싱
        renderMatchingProjects(output.top_4); // top_4 출력
        return;
      } else if (result.status === 'FAILED') {
        throw new Error('Step Functions execution failed');
      }

      console.log('Step Functions still running... retrying in 3 seconds');
      await new Promise(resolve => setTimeout(resolve, 3000));

    } while (response.status === 200 && response.status !== 'SUCCEEDED');

  } catch (error) {
    console.error('Error fetching Step Functions result:', error.message);
    alert(`Error fetching Step Functions result: ${error.message}`);
  }
}

// 프로젝트 목록 렌더링 함수
function renderMatchingProjects(projects) {
  const projectListDiv = document.getElementById('project-list');
  projectListDiv.innerHTML = ''; // 기존 내용 초기화

  if (Array.isArray(projects) && projects.length > 0) {
    let html = '<div class="row">';
    projects.forEach(proj => {
      const projectName = proj.ProjectID || 'No Name';
      const similarityScore = proj.SimilarityScore || 0;

      html += `
        <div class="col-md-4" style="margin-bottom:20px;">
          <div class="card">
            <div class="card-body">
              <h5 class="card-title">Project ID: ${projectName}</h5>
              <p class="card-text">Similarity Score: ${similarityScore.toFixed(2)}</p>
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
  startStepFunctions(userId); // Step Functions 호출
});
