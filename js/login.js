// AWS Cognito 설정
const poolData = {
  UserPoolId: 'ap-northeast-2_AOgRZ1a3u', // 사용자 풀 ID
  ClientId: '5o12nbraveo9g0g3l7k71njh7k', // 클라이언트 ID
  Domain: 'ap-northeast-2aogrz1a3u.auth.ap-northeast-2.amazoncognito.com', // Cognito Hosted UI 도메인
  RedirectUri: 'https://d2miwwhvzmngyp.cloudfront.net', // Redirect URI
};

const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

let container = document.getElementById('container');

// 비밀번호 재설정 로직 추가
let isCodeSent = false; // 코드 전송 여부 확인 플래그

// 화면 전환 함수
function toggle() {
  container.classList.toggle('sign-in');
  container.classList.toggle('sign-up');
}

// 초기 화면 설정
setTimeout(() => {
  container.classList.add('sign-in');
}, 200);

// 전역 변수로 id 선언
let id = '';

// 회원가입 폼 검증 및 처리 로직
document.getElementById('signup-button').addEventListener('click', function (e) {
  e.preventDefault();
  id = document.getElementById('signup-id').value.trim();
  const username = document.getElementById('signup-username').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value.trim();
  const confirmPassword = document.getElementById('signup-confirm-password').value.trim();
  const errorElement = document.getElementById('signup-error');

  // 정규식 패턴
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordPattern = /^(?=.*[A-Z])(?=.*[!@#$])[A-Za-z\d!@#$]{8,20}$/;
  const idPattern = /^[a-zA-Z0-9]+$/;

  // 입력값 검증
  if (!id || !username || !email || !password || !confirmPassword) {
    errorElement.textContent = '모든 입력란을 작성해주세요.';
    errorElement.style.color = 'red';
    errorElement.style.display = 'block';
    return;
  }

  if (!idPattern.test(id)) {
    errorElement.textContent = '아이디는 영어와 숫자만 입력할 수 있습니다.';
    errorElement.style.color = 'red';
    errorElement.style.display = 'block';
    return;
  }

  if (!emailPattern.test(email)) {
    errorElement.textContent = '올바른 이메일 형식을 입력해주세요.';
    errorElement.style.color = 'red';
    errorElement.style.display = 'block';
    return;
  }

  if (!passwordPattern.test(password)) {
    errorElement.textContent = '비밀번호는 8~20자, 대문자와 특수문자(!@#$)를 포함해야 합니다.';
    errorElement.style.color = 'red';
    errorElement.style.display = 'block';
    return;
  }

  if (password !== confirmPassword) {
    errorElement.textContent = '비밀번호가 일치하지 않습니다.';
    errorElement.style.color = 'red';
    errorElement.style.display = 'block';
    return;
  }

  const attributeList = [];
  const dataEmail = { Name: 'email', Value: email };
  const attributeEmail = new AmazonCognitoIdentity.CognitoUserAttribute(dataEmail);
  attributeList.push(attributeEmail);

  const dataName = { Name: 'name', Value: username };
  const attributeName = new AmazonCognitoIdentity.CognitoUserAttribute(dataName);
  attributeList.push(attributeName);

  userPool.signUp(id, password, attributeList, null, function (err, result) {
    if (err) {
      errorElement.textContent = err.message || JSON.stringify(err);
      errorElement.style.color = 'red';
      errorElement.style.display = 'block';
      return;
    }
    const cognitoUser = result.user;
    errorElement.textContent = '회원가입이 완료되었습니다. 이메일로 전송된 확인 코드를 입력해주세요.';
    errorElement.style.color = 'green';
    errorElement.style.display = 'block';
    document.getElementById('verification-code-group').style.display = 'block';
    document.getElementById('verify-button').style.display = 'block';
    document.getElementById('signup-button').disabled = true;
  });
});

function togglePassword(inputId, toggleElement) {
  const inputField = document.getElementById(inputId);
  const icon = toggleElement.querySelector('i'); // 내부 아이콘 선택

  if (inputField.type === 'password') {
    inputField.type = 'text'; // 비밀번호 보이기
    icon.classList.replace('bx-show', 'bx-hide'); // 눈 감기 아이콘으로 변경
  } else {
    inputField.type = 'password'; // 비밀번호 숨기기
    icon.classList.replace('bx-hide', 'bx-show'); // 눈 뜨기 아이콘으로 변경
  }
}

// 확인 코드 제출 처리 로직 추가
document.getElementById('verify-button').addEventListener('click', function (e) {
  e.preventDefault();
  const verificationCode = document.getElementById('verification-code').value.trim();
  const errorElement = document.getElementById('signup-error');
  if (!verificationCode) {
    errorElement.textContent = '확인 코드를 입력해주세요.';
    errorElement.style.color = 'red';
    errorElement.style.display = 'block';
    return;
  }
  const cognitoUser = new AmazonCognitoIdentity.CognitoUser({ Username: id, Pool: userPool });
  cognitoUser.confirmRegistration(verificationCode, true, function (err, result) {
    if (err) {
      errorElement.textContent = err.message || JSON.stringify(err);
      errorElement.style.color = 'red';
      errorElement.style.display = 'block';
      return;
    }
    errorElement.textContent = '계정이 성공적으로 확인되었습니다. 이제 로그인할 수 있습니다.';
    errorElement.style.color = 'green';
    errorElement.style.display = 'block';
    document.getElementById('verification-code-group').style.display = 'none';
    document.getElementById('verify-button').style.display = 'none';
    document.getElementById('signup-form').reset();
    document.getElementById('signup-button').disabled = false;
  });
});

// 로그인 폼 검증 및 처리 로직
document.getElementById('signin-button').addEventListener('click', handleSignIn);

// "엔터" 키 입력 시 로그인
['signin-id', 'signin-password'].forEach((id) => {
  document.getElementById(id).addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSignIn();
    }
  });
});

// 로그인 처리 함수
function handleSignIn() {
  const signinId = document.getElementById('signin-id').value.trim();
  const signinPassword = document.getElementById('signin-password').value.trim();
  const signinErrorElement = document.getElementById('signin-error');

  if (!signinId || !signinPassword) {
    signinErrorElement.textContent = '아이디와 비밀번호를 모두 입력해주세요.';
    signinErrorElement.style.color = 'red';
    signinErrorElement.style.display = 'block';
    return;
  }

  const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails({
    Username: signinId,
    Password: signinPassword,
  });

  const userData = { Username: signinId, Pool: userPool };
  const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

  cognitoUser.authenticateUser(authenticationDetails, {
    onSuccess: function (result) {
      const accessToken = result.getAccessToken().getJwtToken();
      const idToken = result.getIdToken().getJwtToken();
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('idToken', idToken);
      signinErrorElement.textContent = '로그인 성공!';
      signinErrorElement.style.color = 'green';
      signinErrorElement.style.display = 'block';
      window.location.href = 'index.html';
    },
    onFailure: function (err) {
      signinErrorElement.textContent = err.message || JSON.stringify(err);
      signinErrorElement.style.color = 'red';
      signinErrorElement.style.display = 'block';
    },
  });
}

// 구글 로그인 버튼 이벤트 핸들러
document.querySelector('.social-icon.google').addEventListener('click', () => {
  const googleSignInUrl = `https://${poolData.Domain}/oauth2/authorize?` +
    `client_id=${poolData.ClientId}&response_type=code&scope=email+openid+profile&` +
    `redirect_uri=${encodeURIComponent(poolData.RedirectUri)}&identity_provider=Google`;

  // Google Hosted UI로 리다이렉트
  window.location.href = googleSignInUrl;
});

// Redirect URI에서 Authorization Code 추출 및 처리
const urlParams = new URLSearchParams(window.location.search);
const authCode = urlParams.get('code');

if (authCode) {
  exchangeAuthCodeForTokens(authCode);
}

async function exchangeAuthCodeForTokens(authCode) {
  const tokenEndpoint = `https://${poolData.Domain}/oauth2/token`;

  const bodyData = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: poolData.ClientId,
      redirect_uri: poolData.RedirectUri,
      code: authCode,
  });

  try {
      const response = await fetch(tokenEndpoint, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: bodyData.toString(),
      });

      if (!response.ok) {
          throw new Error('Token 교환 실패');
      }

      const tokens = await response.json();
      console.log('Access Token:', tokens.access_token);
      console.log('ID Token:', tokens.id_token);

      // 토큰을 localStorage에 저장
      localStorage.setItem('accessToken', tokens.access_token);
      localStorage.setItem('idToken', tokens.id_token);

      // 사용자 정보 요청
      fetchUserInfo(tokens.access_token);

      // 로그인 성공 후 메인 페이지로 리디렉트
      window.location.href = 'index.html';
  } catch (error) {
      console.error('Error exchanging token:', error);
  }
}

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
    console.error('Error fetching user info:', error);
  }
}

// 비밀번호 재설정 링크 클릭 핸들러
const forgotPasswordLink = document.getElementById('forgot-password-link');
forgotPasswordLink.addEventListener('click', function (e) {
  e.preventDefault();
  const signinButton = document.getElementById('signin-button');
  const signinPassword = document.getElementById('signin-password');
  const socialLoginBox = document.getElementById('social-login'); // 소셜 로그인 영역

  if (forgotPasswordLink.textContent === '비밀번호를 잊어버리셨나요?') {
    // 비밀번호 재설정 상태로 전환
    forgotPasswordLink.textContent = '로그인 창으로';

    signinButton.textContent = '코드 전송';
    signinButton.onclick = sendResetCode;

    // 비밀번호 필드 숨기고 이메일 필드 추가
    signinPassword.style.display = 'none';
    const signinEmail = document.createElement('input');
    signinEmail.type = 'email';
    signinEmail.id = 'signin-email';
    signinEmail.placeholder = '이메일';
    signinPassword.parentNode.appendChild(signinEmail);

    // 소셜 로그인 숨기기
    if (socialLoginBox) {
      socialLoginBox.style.display = 'none';
    }
  } else {
    // 로그인 상태로 복구
    resetToLoginState();
  }
});

// 코드 전송 기능
function sendResetCode() {
  if (isCodeSent) {
    const signinErrorElement = document.getElementById('signin-error');
    signinErrorElement.textContent = '이미 코드가 전송되었습니다. 이메일을 확인해주세요.';
    signinErrorElement.style.color = 'red';
    signinErrorElement.style.display = 'block';
    return;
  }

  const id = document.getElementById('signin-id').value.trim();
  const email = document.getElementById('signin-email').value.trim();
  const signinErrorElement = document.getElementById('signin-error');

  if (!id || !email) {
    signinErrorElement.textContent = '아이디와 이메일을 모두 입력해주세요.';
    signinErrorElement.style.color = 'red';
    signinErrorElement.style.display = 'block';
    return;
  }

  const cognitoUser = new AmazonCognitoIdentity.CognitoUser({
    Username: id,
    Pool: userPool,
  });

  // 비밀번호 재설정 요청
  cognitoUser.forgotPassword({
    onSuccess: function (data) {
      console.log('코드 전송 성공:', data);
      signinErrorElement.textContent = '확인 코드가 이메일로 전송되었습니다.';
      signinErrorElement.style.color = 'green';
      signinErrorElement.style.display = 'block';

      isCodeSent = true; // 코드 전송 완료 상태로 변경
      displayResetPasswordFields();
    },
    onFailure: function (err) {
      signinErrorElement.textContent = err.message || JSON.stringify(err);
      signinErrorElement.style.color = 'red';
      signinErrorElement.style.display = 'block';
    },
  });
}



// 비밀번호 재설정 필드 표시
function displayResetPasswordFields() {
  const signinId = document.getElementById('signin-id');
  signinId.disabled = true; // 아이디 필드 비활성화

  const signinEmail = document.getElementById('signin-email');
  signinEmail.disabled = true; // 이메일 필드 비활성화

  // 확인 코드 입력 필드 추가
  const resetCodeInput = document.createElement('input');
  resetCodeInput.type = 'text';
  resetCodeInput.id = 'reset-code';
  resetCodeInput.placeholder = '확인 코드';
  signinEmail.parentNode.appendChild(resetCodeInput);

  // 새 비밀번호 입력 필드 추가
  const newPasswordInput = document.createElement('input');
  newPasswordInput.type = 'password';
  newPasswordInput.id = 'new-password';
  newPasswordInput.placeholder = '새 비밀번호';
  signinEmail.parentNode.appendChild(newPasswordInput);

  const confirmPasswordInput = document.createElement('input');
  confirmPasswordInput.type = 'password';
  confirmPasswordInput.id = 'confirm-password';
  confirmPasswordInput.placeholder = '새 비밀번호 확인';
  signinEmail.parentNode.appendChild(confirmPasswordInput);

  // 비밀번호 변경 버튼 추가
  const resetPasswordButton = document.createElement('button');
  resetPasswordButton.id = 'reset-password-button';
  resetPasswordButton.textContent = '비밀번호 변경';
  resetPasswordButton.onclick = resetPassword;
  signinEmail.parentNode.appendChild(resetPasswordButton);
}

// 비밀번호 변경 처리
function resetPassword() {
  const id = document.getElementById('signin-id').value.trim();
  const resetCode = document.getElementById('reset-code').value.trim();
  const newPassword = document.getElementById('new-password').value.trim();
  const confirmPassword = document.getElementById('confirm-password').value.trim();
  const signinErrorElement = document.getElementById('signin-error');

  if (!resetCode || !newPassword || !confirmPassword) {
    signinErrorElement.textContent = '모든 필드를 입력해주세요.';
    signinErrorElement.style.color = 'red';
    signinErrorElement.style.display = 'block';
    return;
  }

  if (newPassword !== confirmPassword) {
    signinErrorElement.textContent = '비밀번호가 일치하지 않습니다.';
    signinErrorElement.style.color = 'red';
    signinErrorElement.style.display = 'block';
    return;
  }

  const cognitoUser = new AmazonCognitoIdentity.CognitoUser({
    Username: id,
    Pool: userPool,
  });

  cognitoUser.confirmPassword(resetCode, newPassword, {
    onSuccess: function () {
      console.log('비밀번호 변경 성공');
      signinErrorElement.textContent = '비밀번호가 성공적으로 변경되었습니다. 잠시 후 로그인 화면으로 이동합니다.';
      signinErrorElement.style.color = 'green';
      signinErrorElement.style.display = 'block';

      setTimeout(resetToLoginState, 3000); // 3초 후 로그인 화면으로 복구
    },
    onFailure: function (err) {
      signinErrorElement.textContent = err.message || JSON.stringify(err);
      signinErrorElement.style.color = 'red';
      signinErrorElement.style.display = 'block';
    },
  });
}

// 로그인 화면 복구
function resetToLoginState() {
  const signinButton = document.getElementById('signin-button');
  signinButton.textContent = '로그인';
  signinButton.onclick = null;
  signinButton.addEventListener('click', handleSignIn);

  const forgotPasswordLink = document.getElementById('forgot-password-link');
  forgotPasswordLink.textContent = '비밀번호를 잊어버리셨나요?';

  const signinEmail = document.getElementById('signin-email');
  if (signinEmail) signinEmail.remove();

  const signinPassword = document.getElementById('signin-password');
  signinPassword.style.display = 'block';

  const resetCodeField = document.getElementById('reset-code');
  const newPasswordField = document.getElementById('new-password');
  const confirmPasswordField = document.getElementById('confirm-password');
  const resetPasswordButton = document.getElementById('reset-password-button');

  if (resetCodeField) resetCodeField.remove();
  if (newPasswordField) newPasswordField.remove();
  if (confirmPasswordField) confirmPasswordField.remove();
  if (resetPasswordButton) resetPasswordButton.remove();

  const socialLoginBox = document.getElementById('social-login');
  if (socialLoginBox) {
    socialLoginBox.style.display = 'block';
  }

  const signinError = document.getElementById('signin-error');
  signinError.textContent = '';
}


// 메인 페이지로 이동하는 함수
function goToMain() {
  window.location.href = 'index.html';
}