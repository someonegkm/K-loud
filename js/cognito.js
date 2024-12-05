// AWS Cognito 설정
const poolData = {
    UserPoolId: 'ap-northeast-2_AOgRZ1a3u', // 실제 사용자 풀 ID로 변경하세요
    ClientId: '5o12nbraveo9g0g3l7k71njh7k',  // 실제 앱 클라이언트 ID로 변경하세요
  };
  
  const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
  
  // 로그인 상태 확인 함수
  function checkLoginStatus() {
    const cognitoUser = userPool.getCurrentUser();
    const loginLogoutLink = document.getElementById('login-logout-link');
  
    if (cognitoUser != null) {
      cognitoUser.getSession(function(err, session) {
        if (err) {
          console.log(err);
          setLoginLink();
          return;
        }
        if (session.isValid()) {
          // 로그인된 상태
          loginLogoutLink.innerHTML = '<i class="fa fa-user" aria-hidden="true"></i> 로그아웃';
          loginLogoutLink.href = '#';
          loginLogoutLink.onclick = function(e) {
            e.preventDefault();
            signOut();
          };
        } else {
          // 세션이 유효하지 않음
          setLoginLink();
        }
      });
    } else {
      // 로그인되지 않은 상태
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
      // 로컬 스토리지에서 토큰 삭제 (필요한 경우)
      localStorage.removeItem('accessToken');
      localStorage.removeItem('idToken');
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
      cognitoUser.getSession(function(err, session) {
        if (err || !session.isValid()) {
          // 세션이 유효하지 않음
          alert('로그인이 필요합니다.');
          window.location.href = 'login.html'; // 로그인 페이지로 이동
        } else {
          // 로그인된 상태, 추가 작업이 필요하면 여기에 작성
        }
      });
    } else {
      // 로그인되지 않은 상태
      alert('로그인이 필요합니다.');
      window.location.href = 'login.html'; // 로그인 페이지로 이동
    }
  }
  
  // 페이지 로딩 시 실행
  window.onload = function() {
    checkLoginStatus();
  };
  