// 페이지 로드 시 실행
window.onload = function () {
    console.log('페이지 로드');
    updateNavBar(); // 내비게이션 업데이트
    checkLoginStatus();
    requireLogin();
    populateUserProfile(); // 사용자 프로필 채우기
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

// 사용자 프로필 채우기
function populateUserProfile() {
    const cognitoUser = userPool.getCurrentUser();
    if (cognitoUser) {
        cognitoUser.getSession(function (err, session) {
            if (err) {
                console.error('세션 가져오기 오류:', err);
                alert('세션을 가져오는 중 오류가 발생했습니다.');
                return;
            }

            console.log('세션이 성공적으로 가져와졌습니다.');
            // 사용자 속성 가져오기
            cognitoUser.getUserAttributes(function (err, attributes) {
                if (err) {
                    console.error('사용자 속성 가져오기 오류:', err);
                    return;
                }

                // 사용자 속성을 가져온 후 필드 채우기
                const nameField = document.getElementById('user-name');
                const emailField = document.getElementById('user-email');

                attributes.forEach(attribute => {
                    if (attribute.Name === 'name') {
                        nameField.value = attribute.Value; // 이름 필드 채우기
                    } else if (attribute.Name === 'email') {
                        emailField.value = attribute.Value; // 이메일 필드 채우기
                    }
                });
            });
        });
    } else {
        console.error('사용자가 로그인되지 않았습니다.');
        window.location.href = 'login.html';
    }
}

function attachFormSubmitEvent() {
    const form = document.getElementById('profile-form');
    form.addEventListener('submit', async function (e) {
        e.preventDefault(); // 기본 제출 동작 막기

        const updatedProfile = {
            TechStack: document.getElementById('user-techstack').value.split(',').map(item => item.trim()),
            Experience: parseInt(document.getElementById('user-experience').value, 10),
            ProjectPreference: document.getElementById('user-project-preference').value.trim(),
            ProjectExperience: parseInt(document.getElementById('user-project-experience').value, 10),
            GithubURL: document.getElementById('user-github').value.trim()
        };

        try {
            const response = await fetch('https://ywris75rza.execute-api.ap-northeast-2.amazonaws.com/prod/save-profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('idToken')}`, // Cognito 토큰 추가
                },
                body: JSON.stringify(updatedProfile),
            });

            if (!response.ok) {
                throw new Error('API 호출 실패');
            }

            const result = await response.json();
            alert('프로필이 성공적으로 저장되었습니다!');
            console.log('저장된 데이터:', result);
        } catch (error) {
            console.error('API 호출 오류:', error);
            alert('프로필 저장 중 오류가 발생했습니다.');
        }
    });
}
