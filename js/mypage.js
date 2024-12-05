// 페이지 로드 시 실행
window.onload = function () {
    console.log('페이지 로드');
    updateNavBar(); // 내비게이션 업데이트
    checkLoginStatus();
    requireLogin();
    attachFormSubmitEvent(); // 폼 제출 이벤트 연결
};

// 내비게이션 바 업데이트 함수
function updateNavBar() {
    const cognitoUser = userPool.getCurrentUser();
    const loginLogoutLink = document.getElementById('login-logout-link');

    if (cognitoUser) {
        // 로그인된 경우: 로그아웃 링크 표시
        loginLogoutLink.textContent = '로그아웃';
        loginLogoutLink.href = '#';
        loginLogoutLink.onclick = function () {
            cognitoUser.signOut();
            window.location.href = 'login.html';
        };
    } else {
        // 로그인되지 않은 경우: 로그인 링크 표시
        loginLogoutLink.textContent = '로그인';
        loginLogoutLink.href = 'login.html';
        loginLogoutLink.onclick = null;
    }
}

// 로그인 상태 확인 함수
function checkLoginStatus() {
    const cognitoUser = userPool.getCurrentUser();
    if (!cognitoUser) {
        console.error('로그인되지 않은 사용자');
        window.location.href = 'login.html';
    }
}

// 로그인 리디렉션 함수
function requireLogin() {
    const cognitoUser = userPool.getCurrentUser();
    if (!cognitoUser) {
        console.error('로그인이 필요합니다.');
        window.location.href = 'login.html';
    }
}

// 폼 제출 이벤트 연결
function attachFormSubmitEvent() {
    const form = document.getElementById('profile-form');
    form.addEventListener('submit', function (e) {
        e.preventDefault(); // 기본 제출 동작 막기

        const cognitoUser = userPool.getCurrentUser();
        if (!cognitoUser) {
            alert('로그인이 필요합니다.');
            window.location.href = 'login.html';
            return;
        }

        // 세션 가져오기
        cognitoUser.getSession(function (err, session) {
            if (err) {
                console.error('세션 가져오기 오류:', err);
                alert('세션을 가져오는 중 오류가 발생했습니다.');
                return;
            }

            const idToken = session.getIdToken().getJwtToken();
            console.log('ID Token:', idToken);

            // 입력된 프로필 데이터 가져오기
            const updatedProfile = {
                TechStack: document.getElementById('user-techstack').value.split(',').map(item => item.trim()),
                Experience: parseInt(document.getElementById('user-experience').value, 10),
                ProjectPreference: document.getElementById('user-project-preference').value.trim(),
                ProjectExperience: parseInt(document.getElementById('user-project-experience').value, 10),
                GithubURL: document.getElementById('user-github').value.trim()
            };

            // 입력값 검증
            if (!updatedProfile.TechStack.length || !updatedProfile.ProjectPreference) {
                alert('기술 스택과 선호하는 프로젝트 유형은 필수 입력 사항입니다.');
                return;
            }

            // API 요청 (Lambda를 통해 DynamoDB에 저장)
            const API_BASE_URL = 'https://lyxy5nvij3.execute-api.ap-northeast-2.amazonaws.com/prod/profile'; // API Gateway URL로 변경
            fetch(API_BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': idToken
                },
                body: JSON.stringify(updatedProfile)
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP 상태 코드: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log('저장 응답 데이터:', data);
                    if (data.message) {
                        alert(data.message); // 성공 메시지
                    } else {
                        alert('알 수 없는 오류가 발생했습니다.');
                    }
                })
                .catch(error => {
                    console.error('프로필 저장 오류:', error);
                    alert('프로필 저장 중 오류가 발생했습니다.');
                });
        });
    });
}
