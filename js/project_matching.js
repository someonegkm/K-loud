// project_matching.js

// 실제 API Gateway Invoke URL로 변경 필요
const STEP_FUNCTIONS_API_URL = 'https://1ezekx8bu3.execute-api.ap-northeast-2.amazonaws.com/dev/StepFunctionsTriggerAPI';

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

async function startStepFunctions(userId) {
  // 매칭 시작 시 Step Functions 실행하고 executionArn만 받아옴
  // 바로 결과 폴링하지 않고, 사용자에게 3~4분 기다렸다가 "결과 가져오기" 버튼 누르도록 안내
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

    // 실행 ARN 저장 후 사용자에게 기다리라고 안내
    statusMessage.innerHTML = '<p>매칭이 시작되었습니다. 약 3~4분 후 "결과 가져오기" 버튼을 눌러 결과를 조회하세요.</p>';

  } catch (error) {
    console.error('Error starting Step Functions:', error.message);
    alert(`Error starting Step Functions: ${error.message}`);
    statusMessage.innerHTML = '<p>매칭 시작 중 오류 발생</p>';
  }
}

// fetchStepFunctionsResult는 이제 한 번만 호출
// 결과가 아직 준비 안 되었으면 "아직 매칭 중" 메시지 출력
async function fetchStepFunctionsResult(executionArn) {
  const statusMessage = document.getElementById('statusMessage');
  try {
    const resultUrl = `${STEP_FUNCTIONS_API_URL}/result?executionArn=${encodeURIComponent(executionArn)}`;
    const response = await fetch(resultUrl);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error fetching result:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Step Functions Execution Result:', result);

    if (result.status === 'SUCCEEDED') {
      console.log('Final Result:', result.output);
      const output = JSON.parse(result.output); 
      renderMatchingProjects(output.top_4);
      statusMessage.innerHTML = '<p>매칭 결과가 아래에 표시되었습니다.</p>';
    } else if (result.status === 'FAILED') {
      statusMessage.innerHTML = '<p>매칭이 실패했습니다. 다시 시도해주세요.</p>';
    } else {
      // RUNNING 상태
      statusMessage.innerHTML = '<p>아직 매칭이 완료되지 않았습니다. 잠시 후 다시 "결과 가져오기" 버튼을 눌러주세요.</p>';
    }
  } catch (error) {
    console.error('Error fetching Step Functions result:', error.message);
    alert(`Error fetching Step Functions result: ${error.message}`);
    statusMessage.innerHTML = '<p>결과 조회 중 오류 발생. 다시 시도해주세요.</p>';
  }
}

function renderMatchingProjects(matches) {
  const projectListDiv = document.getElementById('project-list');
  projectListDiv.innerHTML = ''; 

  if (Array.isArray(matches) && matches.length > 0) {
    let html = '<div class="row">';
    matches.forEach(m => {
      const userId = m.UserID || 'Unknown User';
      const similarityScore = m.SimilarityScore || 0;
      const projectId = m.ProjectID || 'Unknown Project';

      html += `
        <div class="col-md-4" style="margin-bottom:20px;">
          <div class="card">
            <div class="card-body">
              <h5 class="card-title">User ID: ${userId}</h5>
              <p class="card-text">Project ID: ${projectId}</p>
              <p class="card-text">Similarity Score: ${similarityScore.toFixed(2)}</p>
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
