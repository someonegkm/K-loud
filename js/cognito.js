// HTTPS 리소스만 로드하도록 설정
if (window.location.protocol === 'http:') {
  alert('HTTP는 지원되지 않습니다. HTTPS로 접속해주세요.');
  window.location.href = window.location.href.replace('http:', 'https:');
}

// Refresh Token 및 Access Token 처리
function isAccessTokenExpired() {
  const accessToken = localStorage.getItem('accessToken');
  if (!accessToken) return true;

  const payload = JSON.parse(atob(accessToken.split('.')[1]));
  const expirationTime = payload.exp * 1000; // ms 단위
  return Date.now() >= expirationTime;
}

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
      alert('세션이 만료되었습니다. 다시 로그인해주세요.');
      window.location.href = 'login.html';
      return;
  }

  const cognitoUser = userPool.getCurrentUser();
  if (!cognitoUser) {
      alert('로그인이 필요합니다.');
      window.location.href = 'login.html';
      return;
  }

  return new Promise((resolve, reject) => {
      cognitoUser.refreshSession(
          new AmazonCognitoIdentity.CognitoRefreshToken({ RefreshToken: refreshToken }),
          (err, session) => {
              if (err) {
                  console.error('토큰 갱신 실패:', err);
                  alert('세션이 만료되었습니다. 다시 로그인해주세요.');
                  window.location.href = 'login.html';
                  reject(err);
              } else {
                  const newAccessToken = session.getAccessToken().getJwtToken();
                  const newIdToken = session.getIdToken().getJwtToken();

                  // 새 토큰 저장
                  localStorage.setItem('accessToken', newAccessToken);
                  localStorage.setItem('idToken', newIdToken);

                  console.log('Access Token 갱신 성공!');
                  resolve(newAccessToken);
              }
          }
      );
  });
}

async function fetchWithAuth(url, options = {}) {
  if (isAccessTokenExpired()) {
      console.log('Access Token이 만료되었습니다. 갱신을 시도합니다...');
      await refreshAccessToken(); // Access Token 갱신
  }

  const accessToken = localStorage.getItem('accessToken');
  if (!accessToken) {
      alert('로그인이 필요합니다.');
      window.location.href = 'login.html';
      return;
  }

  const headers = options.headers || {};
  headers['Authorization'] = `Bearer ${accessToken}`; // Access Token 추가
  options.headers = headers;

  return fetch(url, options);
}

// 사용자 프로필 가져오기
async function fetchUserProfile() {
  try {
      const response = await fetchWithAuth('https://nglpet7yod.execute-api.ap-northeast-2.amazonaws.com/prod/profile?UserID=' + userId, {
          method: 'GET',
      });

      if (!response.ok) {
          throw new Error('사용자 데이터를 가져오는 데 실패했습니다.');
      }

      const userProfile = await response.json();
      console.log('가져온 사용자 데이터:', userProfile);

      // 사용자 정보 렌더링
      document.getElementById('user-name').value = userProfile.name || '';
      document.getElementById('user-email').value = userProfile.email || '';
  } catch (error) {
      console.error('사용자 프로필 가져오기 오류:', error);
  }
}

// WebSocket 연결
async function connectWebSocket() {
  if (isAccessTokenExpired()) {
      await refreshAccessToken(); // Access Token 갱신
  }

  const accessToken = localStorage.getItem('accessToken');
  if (!accessToken) {
      console.error('Access Token이 없습니다.');
      return;
  }

  const wsUrl = `wss://your-websocket-endpoint?token=${accessToken}`;
  const ws = new WebSocket(wsUrl);

  ws.onopen = () => console.log('WebSocket 연결 성공');
  ws.onmessage = (event) => console.log('WebSocket 메시지:', event.data);
  ws.onerror = (err) => console.error('WebSocket 연결 오류:', err);
  ws.onclose = () => console.log('WebSocket 연결이 종료되었습니다.');
}

// 로그인 후 토큰 저장
function handleLoginSuccess(session) {
  const idToken = session.getIdToken().getJwtToken();
  const accessToken = session.getAccessToken().getJwtToken();
  const refreshToken = session.getRefreshToken().getToken();

  localStorage.setItem('idToken', idToken);
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);

  console.log('로그인 성공! 토큰 저장 완료');
}

// 페이지 로드 시 동작
window.onload = async () => {
  console.log('DOM fully loaded and parsed');

  const cognitoUser = userPool.getCurrentUser();
  if (!cognitoUser) {
      console.log('로그인이 필요합니다.');
      window.location.href = 'login.html';
      return;
  }

  cognitoUser.getSession((err, session) => {
      if (err || !session.isValid()) {
          console.log('세션이 유효하지 않습니다. 다시 로그인해주세요.');
          window.location.href = 'login.html';
          return;
      }

      handleLoginSuccess(session); // 토큰 저장
      fetchUserProfile(); // 사용자 정보 가져오기
      connectWebSocket(); // WebSocket 연결
  });
};
