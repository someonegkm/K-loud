// AWS Cognito 설정
const poolData = {
  UserPoolId: 'ap-northeast-2_AOgRZ1a3u', // 사용자 풀 ID
  ClientId: '5o12nbraveo9g0g3l7k71njh7k', // 클라이언트 ID
  Domain: 'ap-northeast-2aogrz1a3u.auth.ap-northeast-2.amazoncognito.com', // Cognito Hosted UI 도메인
  RedirectUri: 'https://d1fzhb1yjkhc8i.cloudfront.net/index.html', // Redirect URI
};

const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

// 로그인 상태 확인 함수
function checkLoginStatus() {
  let cognitoUser = userPool.getCurrentUser();
  const loginLogoutLink = document.getElementById('login-logout-link');
  const idToken = localStorage.getItem('idToken');
  const accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken'); // RefreshToken 추가

  if (cognitoUser) {
      cognitoUser.getSession((err, session) => {
          if (err || !session.isValid()) {
              console.error('세션이 유효하지 않습니다.', err);
              setLoginLink();
              return;
          }

          const idTokenPayload = session.getIdToken().decodePayload(); // ID 토큰에서 페이로드 디코딩
          const username = idTokenPayload.username || idTokenPayload['cognito:username'] || 'unknown';

          console.log('로그인된 사용자 이름:', username);
          localStorage.setItem('username', username); // 로컬 스토리지에 저장

          updateNavBar(username); // 네비게이션 상태 업데이트
      });
  } else if (idToken && accessToken) {
      console.log('로컬 스토리지에서 토큰을 가져와 세션을 복원합니다.');

      const idTokenPayload = JSON.parse(atob(idToken.split('.')[1])); // ID 토큰 디코딩
      const username = idTokenPayload.username || idTokenPayload['cognito:username'] || 'unknown';

      cognitoUser = new AmazonCognitoIdentity.CognitoUser({
          Username: username,
          Pool: userPool,
      });

      cognitoUser.setSignInUserSession(
          new AmazonCognitoIdentity.CognitoUserSession({
              IdToken: new AmazonCognitoIdentity.CognitoIdToken({ IdToken: idToken }),
              AccessToken: new AmazonCognitoIdentity.CognitoAccessToken({ AccessToken: accessToken }),
              RefreshToken: new AmazonCognitoIdentity.CognitoRefreshToken({ RefreshToken: refreshToken || '' }),
          })
      );

      console.log('세션이 수동으로 복원되었습니다. 사용자 이름:', username);
      localStorage.setItem('username', username); // 로컬 스토리지에 저장
      updateNavBar(username); // 네비게이션 상태 업데이트
  } else {
      console.log('로그인되지 않은 상태입니다.');
      setLoginLink();
  }
}

// URL에서 Authorization Code 추출
function extractCodeFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const authCode = urlParams.get('code'); // "code" 파라미터 추출
    console.log('Extracted Authorization Code:', authCode);
  
    if (!authCode) {
      console.error('Authorization Code가 없습니다. URL을 확인하세요.');
      return null;
    }
    return authCode;
  }

// Cognito 설정 확인
function validateCognitoConfiguration() {
  if (!poolData.Domain || !poolData.ClientId || !poolData.RedirectUri) {
    console.error('Cognito 설정이 올바르지 않습니다. 설정을 확인하세요:', poolData);
    return false;
  }
  console.log('Cognito 설정 확인:', poolData);
  return true;
}

// Authorization Code를 이용해 토큰 교환
async function exchangeCodeForTokens(authCode) {
    if (!validateCognitoConfiguration()) {
      console.error('Cognito 설정 오류로 인해 토큰 교환이 중단되었습니다.');
      return;
    }
  
    const tokenEndpoint = `https://${poolData.Domain}/oauth2/token`;
    const bodyData = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: poolData.ClientId,
      redirect_uri: poolData.RedirectUri,
      code: authCode,
    });
  
    console.log('Token 요청 데이터:', bodyData.toString());
  
    try {
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyData.toString(),
      });
  
      console.log('Token 요청 응답 상태:', response.status);
  
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Token 교환 실패:', errorText);
        throw new Error('Token 교환 실패');
      }
  
      const tokens = await response.json();
      console.log('받은 토큰:', tokens);
  
      // 토큰 저장
      localStorage.setItem('accessToken', tokens.access_token);
      localStorage.setItem('idToken', tokens.id_token);
      localStorage.setItem('refreshToken', tokens.refresh_token); // Refresh Token 저장

      // 사용자 정보 요청
      fetchUserInfo(tokens.access_token);
  
    } catch (error) {
      console.error('Token 교환 중 오류 발생:', error);
    }
  }

// 사용자 정보 요청 함수
async function fetchUserInfo(accessToken) {
    const userInfoEndpoint = `https://${poolData.Domain}/oauth2/userInfo`;
  
    try {
      const response = await fetch(userInfoEndpoint, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
  
      if (!response.ok) {
        throw new Error('사용자 정보 요청 실패');
      }
  
      const userInfo = await response.json();
      console.log('사용자 정보:', userInfo);
  
      // 사용자 정보를 로컬스토리지에 저장하거나 UI에 표시
      localStorage.setItem('userInfo', JSON.stringify(userInfo));
      alert(`안녕하세요, ${userInfo.name || '사용자'}님!`);
    } catch (error) {
      console.error('사용자 정보 요청 중 오류 발생:', error);
    }
}

// 로그인 상태 업데이트 함수
function updateNavBar(username) {
  const loginLogoutLink = document.getElementById('login-logout-link');

  if (username) {
      console.log('네비게이션 상태 업데이트:', username);
      loginLogoutLink.textContent = '로그아웃';
      loginLogoutLink.href = '#';
      loginLogoutLink.onclick = function () {
          signOut();
      };
  } else {
      setLoginLink();
  }
}

  // 로그인 링크 설정 함수
function setLoginLink() {
  const loginLogoutLink = document.getElementById('login-logout-link');
  loginLogoutLink.innerHTML = '<i class="fa fa-user" aria-hidden="true"></i> 로그인';
  loginLogoutLink.href = 'login.html';
  loginLogoutLink.onclick = null;
}

// 로그아웃 함수
function signOut() {
  const cognitoUser = userPool.getCurrentUser();
  if (cognitoUser != null) {
      cognitoUser.signOut();
      localStorage.removeItem('accessToken');
      localStorage.removeItem('idToken');
      localStorage.removeItem('refreshToken'); // Refresh Token 삭제
      alert('로그아웃 되었습니다.');
      window.location.href = 'index.html'; // 로그아웃 후 메인 페이지로 이동
  } else {
      alert('로그인된 사용자가 없습니다.');
  }
}

// 보호된 페이지 접근 시 로그인 상태 확인 및 리디렉션 함수
function requireLogin() {
  const cognitoUser = userPool.getCurrentUser();
  if (cognitoUser != null) {
      cognitoUser.getSession(function (err, session) {
          if (err || !session.isValid()) {
              alert('로그인이 필요합니다.');
              window.location.href = 'login.html'; // 로그인 페이지로 이동
          }
      });
  } else {
      alert('로그인이 필요합니다.');
      window.location.href = 'login.html'; // 로그인 페이지로 이동
  }
}

// 페이지 로딩 시 실행
document.addEventListener('DOMContentLoaded', function () {
  console.log('DOM fully loaded and parsed');
  const authCode = extractCodeFromURL();
  if (authCode) {
    exchangeCodeForTokens(authCode);
  } else {
    console.log('Authorization Code가 없어서 토큰 교환을 생략합니다.');
  }
});
