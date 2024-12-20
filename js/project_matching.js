// project_matching.js

const STEP_FUNCTIONS_API_URL = 'https://<API_ID>.execute-api.ap-northeast-2.amazonaws.com/dev/StepFunctionsTriggerAPI';

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
    const executionArn = executionDetails.executionArn;
    await fetchStepFunctionsResult(executionArn);

  } catch (error) {
    console.error('Error starting Step Functions:', error.message);
    alert(`Error starting Step Functions: ${error.message}`);
  }
}

async function fetchStepFunctionsResult(executionArn) {
  try {
    const resultUrl = `${STEP_FUNCTIONS_API_URL}/result?executionArn=${encodeURIComponent(executionArn)}`;
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
        const output = JSON.parse(result.output); 
        renderMatchingProjects(output.top_4);
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

window.addEventListener('load', () => {
  updateNavBar(); 

  const userId = getLoggedInUserId();
  if (!userId) {
    alert('로그인이 필요합니다.');
    window.location.href = 'login.html';
    return;
  }

  console.log(`Logged-in User ID: ${userId}`);
  startStepFunctions(userId);
});
