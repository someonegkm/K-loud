// 사용자 프로필 데이터를 가져오고 폼에 채우기
async function fetchUserProfile() {
    try {
        const response = await fetch(`https://nglpet7yod.execute-api.ap-northeast-2.amazonaws.com/prod/profile?UserID=${localStorage.getItem('userID')}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${localStorage.getItem('idToken')}`, // 인증 토큰
            },
        });

        if (!response.ok) {
            throw new Error('프로필 데이터를 가져오지 못했습니다.');
        }

        const { profile } = await response.json();
        console.log('가져온 프로필 데이터:', profile);

        // 폼 필드에 데이터 채우기
        document.getElementById('user-techstack').value = profile['user-techstack'] || '';
        document.getElementById('user-project-preference').value = profile['user-project-preference'] || '';
        document.getElementById('user-project-experience').value = profile['user-project-experience'] || '';
        document.getElementById('user-github').value = profile['user-github'] || '';
        document.getElementById('user-intro').value = profile['user-intro'] || '';
    } catch (error) {
        console.error('프로필 데이터 가져오기 오류:', error);
        alert('프로필 데이터를 가져오는 중 오류가 발생했습니다.');
    }
}

// 페이지 로드 시 사용자 프로필 가져오기
document.addEventListener('DOMContentLoaded', function () {
    fetchUserProfile();
});


// 페이지 로드 시 실행
window.onload = function () {
    console.log('페이지 로드');
    updateNavBar(); // 내비게이션 업데이트
    checkLoginStatus(); // 로그인 상태 확인
    requireLogin(); // 로그인 상태 리디렉션
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
let userSub = ''; // Cognito sub 값을 저장할 변수

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

            // ID 토큰 가져오기
            if (session.isValid()) {
                const idToken = session.getIdToken().getJwtToken();
                console.log("ID Token:", idToken);
                localStorage.setItem('idToken', idToken);
            } else {
                console.error("세션이 유효하지 않습니다.");
                alert("세션이 유효하지 않습니다. 다시 로그인해주세요.");
                window.location.href = 'login.html';
                return;
            }

            // 사용자 속성 가져오기
            cognitoUser.getUserAttributes(function (err, attributes) {
                if (err) {
                    console.error('사용자 속성 가져오기 오류:', err);
                    return;
                }

                attributes.forEach(attribute => {
                    if (attribute.Name === 'sub') {
                        userSub = attribute.Value; // sub 값을 저장
                        console.log('사용자 sub:', userSub);
                    }
                    if (attribute.Name === 'name') {
                        document.getElementById('user-name').value = attribute.Value || '';
                    }
                    if (attribute.Name === 'email') {
                        document.getElementById('user-email').value = attribute.Value || '';
                    }
                });

                // 사용자 속성 로드 후 fetchUserProfile 호출
                fetchUserProfile(); // API 호출
            });
        });
    } else {
        console.error('사용자가 로그인되지 않았습니다.');
        window.location.href = 'login.html';
    }
}

// 폼 제출 이벤트 연결
function attachFormSubmitEvent() {
    const form = document.getElementById('profile-form');
    form.addEventListener('submit', async function (e) {
        e.preventDefault(); // 기본 제출 동작 막기

        // 사용자 입력값 가져오기
        const name = document.getElementById('user-name').value;
        const email = document.getElementById('user-email').value;
        const userTechStack = document.getElementById('user-techstack').value;
        const userProjectPreference = document.getElementById('user-project-preference').value;
        const userProjectExperience = document.getElementById('user-project-experience').value;
        const userGithub = document.getElementById('user-github').value;
        const userIntro = document.getElementById('user-intro').value; // 자기 소개 필드 추가

        // JSON 형식으로 데이터 생성
        const userProfile = {
            UserID: userSub, // Cognito sub 값 사용
            name: name,
            email: email,
            user_techstack: userTechStack,
            user_project_preference: userProjectPreference,
            user_project_experience: userProjectExperience,
            user_github: userGithub,
            user_intro: userIntro, // 자기 소개 추가
        };

        // API Gateway 호출
        try {
            const response = await fetch('https://nglpet7yod.execute-api.ap-northeast-2.amazonaws.com/prod/profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('idToken')}`, // Cognito 토큰 추가
                },
                body: JSON.stringify(userProfile),
            });

            if (!response.ok) {
                throw new Error('API 호출 실패');
            }

            const result = await response.json();
            console.log('저장된 데이터:', result);
            alert('프로필이 성공적으로 저장되었습니다!');
        } catch (error) {
            console.error('API 호출 오류:', error);
            alert('프로필 저장 중 오류가 발생했습니다.');
        }
    });
}
