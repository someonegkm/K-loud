// AWS Cognito 설정
const poolData = {
    UserPoolId: 'ap-northeast-2_AOgRZ1a3u', // 실제 사용자 풀 ID로 변경하세요
    ClientId: '5o12nbraveo9g0g3l7k71njh7k', // 실제 앱 클라이언트 ID로 변경하세요
    Domain: 'ap-northeast-2aogrz1a3u.auth.ap-northeast-2.amazoncognito.com',
    RedirectUri: 'https://kloud-webpage.s3.ap-northeast-2.amazonaws.com/index.html',
  };
  
  const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
  
  // Authorization Code를 가져와 토큰 교환
  function exchangeCodeForTokens() {
    const urlParams = new URLSearchParams(window.location.search);
    const authCode = urlParams.get('code');
  
    if (authCode) {
      const tokenEndpoint = `https://${poolData.Domain}/oauth2/token`;
  
      const bodyData = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: poolData.ClientId,
        redirect_uri: poolData.RedirectUri,
        code: authCode,
      });
  
      fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyData.toString(),
      })
        .then((response) => {
          if (!response.ok) throw new Error('토큰 교환 실패');
          return response.json();
        })
        .then((tokens) => {
          console.log('Access Token:', tokens.access_token);
          console.log('ID Token:', tokens.id_token);
  
          // 토큰 저장
          localStorage.setItem('accessToken', tokens.access_token);
          localStorage.setItem('idToken', tokens.id_token);
  
          // 페이지 상태 갱신
          checkLoginStatus();
        })
        .catch((error) => console.error('Error exchanging token:', error));
    }
  }
  
  // 로그인 상태 확인 함수
  function checkLoginStatus() {
    const accessToken = localStorage.getItem('accessToken');
    const idToken = localStorage.getItem('idToken');
    const loginLogoutLink = document.getElementById('login-logout-link');
  
    if (accessToken && idToken) {
      // 로그인된 상태
      const payload = JSON.parse(atob(idToken.split('.')[1])); // ID 토큰 디코딩
      const userId = payload['cognito:username'] || payload.email; // 사용자 이름 또는 이메일
  
      // 사용자 ID를 HTML 필드에 표시
      const ownerIdField = document.getElementById('ownerId');
      if (ownerIdField) {
        ownerIdField.value = userId;
        ownerIdField.setAttribute('readonly', true);
      }
  
      loginLogoutLink.innerHTML = '<i class="fa fa-user" aria-hidden="true"></i> 로그아웃';
      loginLogoutLink.href = '#';
      loginLogoutLink.onclick = function (e) {
        e.preventDefault();
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
  }
  
  // 로그아웃 함수
  function signOut() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('idToken');
    alert('로그아웃 되었습니다.');
    window.location.href = 'index.html';
  }
  
  // 페이지 로딩 시 실행
  window.onload = function () {
    exchangeCodeForTokens(); // URL에서 code 추출 및 토큰 교환
    checkLoginStatus();      // 로그인 상태 확인
  };
  