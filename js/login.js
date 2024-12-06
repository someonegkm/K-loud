// AWS Cognito 설정
const poolData = {
  UserPoolId: 'ap-northeast-2_AOgRZ1a3u', // 실제 사용자 풀 ID로 변경하세요
  ClientId: '5o12nbraveo9g0g3l7k71njh7k',  // 실제 앱 클라이언트 ID로 변경하세요
};

const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
let container = document.getElementById('container');

// 화면 전환 함수
function toggle() {
  container.classList.toggle('sign-in');
  container.classList.toggle('sign-up');
}

// 초기 화면 설정
setTimeout(() => {
  container.classList.add('sign-in');
}, 200);

let isCodeSent = false; // 코드 전송 여부를 확인하기 위한 플래그

// 로그인 기능
function login() {
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

  const userData = {
    Username: signinId,
    Pool: userPool,
  };

  const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

  cognitoUser.authenticateUser(authenticationDetails, {
    onSuccess: function (result) {
      const accessToken = result.getAccessToken().getJwtToken();
      const idToken = result.getIdToken().getJwtToken();
      console.log('로그인 성공, 액세스 토큰:', accessToken);

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('idToken', idToken);

      signinErrorElement.textContent = '로그인 성공!';
      signinErrorElement.style.color = 'green';
      signinErrorElement.style.display = 'block';

      window.location.href = 'index.html';
    },
    onFailure: function (err) {
      console.error('로그인 실패:', err);
      signinErrorElement.textContent = err.message || JSON.stringify(err);
      signinErrorElement.style.color = 'red';
      signinErrorElement.style.display = 'block';
    },
  });
}

// 회원가입 기능
document.getElementById('signup-button').addEventListener('click', function (e) {
  e.preventDefault();
  const id = document.getElementById('signup-id').value.trim();
  const username = document.getElementById('signup-username').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value.trim();
  const confirmPassword = document.getElementById('signup-confirm-password').value.trim();
  const errorElement = document.getElementById('signup-error');

  if (!id || !username || !email || !password || !confirmPassword) {
    errorElement.textContent = '모든 입력란을 작성해주세요.';
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

    errorElement.textContent = '이메일로 전송된 확인 코드를 입력해주세요.';
    errorElement.style.color = 'green';
    errorElement.style.display = 'block';

    document.getElementById('verification-code-group').style.display = 'block';
    document.getElementById('verify-button').style.display = 'block';
    document.getElementById('signup-button').disabled = true;
  });
});

// 확인 코드 제출
document.getElementById('verify-button').addEventListener('click', function (e) {
  e.preventDefault();
  const verificationCode = document.getElementById('verification-code').value.trim();
  const errorElement = document.getElementById('signup-error');
  const id = document.getElementById('signup-id').value.trim();

  if (!verificationCode) {
    errorElement.textContent = '확인 코드를 입력해주세요.';
    errorElement.style.color = 'red';
    errorElement.style.display = 'block';
    return;
  }

  const cognitoUser = new AmazonCognitoIdentity.CognitoUser({
    Username: id,
    Pool: userPool,
  });

  cognitoUser.confirmRegistration(verificationCode, true, function (err, result) {
    if (err) {
      errorElement.textContent = err.message || JSON.stringify(err);
      errorElement.style.color = 'red';
      errorElement.style.display = 'block';
      return;
    }

    // 회원가입 성공 메시지 표시
    errorElement.textContent = '회원가입이 완료되었습니다. 잠시 후 로그인 화면으로 이동합니다.';
    errorElement.style.color = 'green';
    errorElement.style.display = 'block';

    // 3초 뒤에 로그인 화면으로 전환
    setTimeout(() => {
      resetToLoginState(); // 로그인 상태로 복구
      document.getElementById('container').classList.add('sign-in'); // 화면 전환 (sign-in 활성화)
      document.getElementById('container').classList.remove('sign-up'); // sign-up 비활성화
    }, 3000);;
  });
});

// 비밀번호 재설정
document.getElementById('forgot-password-link').addEventListener('click', function (e) {
  e.preventDefault();

  const forgotPasswordLink = document.getElementById('forgot-password-link');
  const signinButton = document.getElementById('signin-button');
  const signinPassword = document.getElementById('signin-password');
  const signinError = document.getElementById('signin-error');
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

    signinError.textContent = '';

    // 소셜 로그인 숨기기
    if (socialLoginBox) {
      socialLoginBox.style.display = 'none';
    }
  } else {
    // 로그인 상태로 복구
    resetToLoginState();
  }
});


// 비밀번호 변경
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

// 비밀번호 변경 필드 표시
function displayResetPasswordFields() {
  // 아이디 입력 필드 비활성화
  const signinId = document.getElementById('signin-id');
  signinId.disabled = true;

  // 이메일 입력 필드 비활성화
  const signinEmail = document.getElementById('signin-email');
  signinEmail.disabled = true;

  // 확인 코드 입력 필드 추가
  const resetCodeInput = document.createElement('input');
  resetCodeInput.type = 'text';
  resetCodeInput.id = 'reset-code';
  resetCodeInput.placeholder = '확인 코드';
  document.getElementById('signin-email').parentNode.appendChild(resetCodeInput);

  // 새 비밀번호 입력 필드 추가
  const newPasswordInput = document.createElement('input');
  newPasswordInput.type = 'password';
  newPasswordInput.id = 'new-password';
  newPasswordInput.placeholder = '새 비밀번호';
  document.getElementById('signin-email').parentNode.appendChild(newPasswordInput);

  const confirmPasswordInput = document.createElement('input');
  confirmPasswordInput.type = 'password';
  confirmPasswordInput.id = 'confirm-password';
  confirmPasswordInput.placeholder = '새 비밀번호 확인';
  document.getElementById('signin-email').parentNode.appendChild(confirmPasswordInput);

  const resetPasswordButton = document.createElement('button');
  resetPasswordButton.id = 'reset-password-button';
  resetPasswordButton.textContent = '비밀번호 변경';
  resetPasswordButton.onclick = resetPassword;
  document.getElementById('signin-email').parentNode.appendChild(resetPasswordButton);
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

      // 3초 후 로그인 화면으로 복구
      setTimeout(resetToLoginState, 3000);
    },
    onFailure: function (err) {
      console.error('비밀번호 변경 실패:', err);
      signinErrorElement.textContent = err.message || JSON.stringify(err);
      signinErrorElement.style.color = 'red';
      signinErrorElement.style.display = 'block';
    },
  });
}

function logoutUser() {
  const cognitoUser = userPool.getCurrentUser();
  if (cognitoUser) {
      cognitoUser.signOut(); // Cognito 세션 종료
      console.log('사용자 로그아웃 성공');
  }

  // 로컬 스토리지 초기화
  localStorage.removeItem('idToken');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');

  // 로그인 페이지로 리디렉션
  window.location.href = 'login.html';
}


function resetToLoginState() {
  const signinButton = document.getElementById('signin-button');
  signinButton.textContent = '로그인'; // 버튼 텍스트 복구
  signinButton.onclick = null; // 기존 비밀번호 재설정 기능 제거
  signinButton.addEventListener('click', login); // 로그인 기능 다시 연결

  const forgotPasswordLink = document.getElementById('forgot-password-link');
  forgotPasswordLink.textContent = '비밀번호를 잊어버리셨나요?'; // 링크 텍스트 복구

  // 중복된 이메일 입력 필드 제거
  const signinEmail = document.getElementById('signin-email');
  if (signinEmail) signinEmail.remove();

  // 비밀번호 입력 필드 표시
  const signinPassword = document.getElementById('signin-password');
  signinPassword.style.display = 'block';

  // 중복된 입력 필드 제거
  const resetCodeField = document.getElementById('reset-code');
  const newPasswordField = document.getElementById('new-password');
  const confirmPasswordField = document.getElementById('confirm-password');
  const resetPasswordButton = document.getElementById('reset-password-button');

  if (resetCodeField) resetCodeField.remove();
  if (newPasswordField) newPasswordField.remove();
  if (confirmPasswordField) confirmPasswordField.remove();
  if (resetPasswordButton) resetPasswordButton.remove();

  // 아이디 입력 필드 활성화
  const signinId = document.getElementById('signin-id');
  signinId.disabled = false; // 수정 가능하도록 설정

  // 소셜 로그인 표시
  const socialLoginBox = document.getElementById('social-login');
  if (socialLoginBox) {
    socialLoginBox.style.display = 'block';
  }

  // 에러 메시지 초기화
  const signinError = document.getElementById('signin-error');
  signinError.textContent = '';
}




