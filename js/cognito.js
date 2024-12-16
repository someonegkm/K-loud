// AWS Cognito 설정
const poolData = {
  UserPoolId: 'ap-northeast-2_AOgRZ1a3u', // 사용자 풀 ID
  ClientId: '5o12nbraveo9g0g3l7k71njh7k', // 클라이언트 ID
  Domain: 'ap-northeast-2aogrz1a3u.auth.ap-northeast-2.amazoncognito.com', // Cognito Hosted UI 도메인
  RedirectUri: 'https://kloud-webpage.s3.ap-northeast-2.amazonaws.com/index.html', // Redirect URI
};

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
