// AWS Cognito 설정
const poolData = {
  UserPoolId: 'ap-northeast-2_AOgRZ1a3u',
  ClientId: '5o12nbraveo9g0g3l7k71njh7k',
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
