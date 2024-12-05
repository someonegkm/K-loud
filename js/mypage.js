// API Gateway 엔드포인트 URL (실제 API Gateway URL로 교체하세요)
const API_BASE_URL = 'https://m5qcpzwhtg.execute-api.ap-northeast-2.amazonaws.com/prod/profile';

window.onload = function () {
    console.log('페이지 로드');
    console.log('API_BASE_URL:', API_BASE_URL);
    checkLoginStatus();
    requireLogin();
    loadUserProfile();
};

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

// 사용자 프로필 불러오기
function loadUserProfile() {
    const cognitoUser = userPool.getCurrentUser();

    if (cognitoUser) {
        cognitoUser.getSession(function (err, session) {
            if (err) {
                console.error('세션 가져오기 오류:', err);
                alert('세션을 가져오는 중 오류가 발생했습니다.');
                return;
            }

            const idToken = session.getIdToken().getJwtToken();
            console.log('ID Token:', idToken);

            fetch(API_BASE_URL, {
                method: 'GET',
                headers: {
                    'Authorization': idToken
                }
            })
                .then(response => {
                    console.log('응답 상태 코드:', response.status);
                    if (!response.ok) {
                        throw new Error(`HTTP 상태 코드: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log('프로필 데이터:', data);

                    // Lambda 응답의 body가 JSON으로 직렬화되어 있으므로 파싱 필요
                    const profile = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;

                    // 사용자 정보 채우기
                    document.getElementById('user-name').value = profile.name || '';
                    document.getElementById('user-email').value = profile.email || '';
                    document.getElementById('user-techstack').value = (profile.TechStack || []).join(', ');
                    document.getElementById('user-experience').value = profile.Experience || 0;
                    document.getElementById('user-project-preference').value = profile.ProjectPreference || '';
                    document.getElementById('user-project-experience').value = profile.ProjectExperience || 0;
                    document.getElementById('user-github').value = profile.GithubURL || '';
                    document.getElementById('user-profile-image-url').value = profile.ProfileImageURL || 'images/profile-placeholder.png';
                })
                .catch(error => {
                    console.error('프로필 가져오기 오류:', error);
                    alert('프로필을 가져오는 중 오류가 발생했습니다.');
                });
        });
    } else {
        console.error('Cognito 사용자 없음');
        window.location.href = 'login.html';
    }
}

// 프로필 저장 버튼 이벤트 핸들러
document.getElementById('profile-form').addEventListener('submit', function (e) {
    e.preventDefault();

    const cognitoUser = userPool.getCurrentUser();

    if (!cognitoUser) {
        alert('로그인이 필요합니다.');
        window.location.href = 'login.html';
        return;
    }

    cognitoUser.getSession(function (err, session) {
        if (err) {
            console.error('세션 가져오기 오류:', err);
            alert('세션을 가져오는 중 오류가 발생했습니다.');
            return;
        }

        const idToken = session.getIdToken().getJwtToken();

        // 업데이트된 프로필 데이터
        const updatedProfile = {
            TechStack: document.getElementById('user-techstack').value.split(',').map(item => item.trim()),
            Experience: parseInt(document.getElementById('user-experience').value, 10),
            ProjectPreference: document.getElementById('user-project-preference').value.trim(),
            ProjectExperience: parseInt(document.getElementById('user-project-experience').value, 10),
            GithubURL: document.getElementById('user-github').value.trim(),
            ProfileImageURL: document.getElementById('user-profile-image-url').value.trim() || 'images/profile-placeholder.png'
        };

        // 입력값 검증
        if (!updatedProfile.TechStack.length || !updatedProfile.ProjectPreference) {
            alert('기술 스택과 선호하는 프로젝트 유형은 필수 입력 사항입니다.');
            return;
        }

        // POST 요청으로 프로필 데이터 저장
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
                    loadUserProfile(); // 저장 후 새로 고침
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
