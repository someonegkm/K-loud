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

            console.log('세션이 성공적으로 가져와졌습니다.');

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

            // 데이터 저장 로직 추가 가능 (예: 로컬 저장, 다른 처리 등)
            console.log('저장할 데이터:', updatedProfile);
            alert('프로필 데이터가 성공적으로 처리되었습니다!');
        });
    });
}
