// mypage.js

// API Gateway 엔드포인트 URL
const API_BASE_URL = 'https://m5qcpzwhtg.execute-api.ap-northeast-2.amazonaws.com/prod/profile';

// 페이지 로딩 시 로그인 상태 확인 및 사용자 프로필 로드
window.onload = function () {
    checkLoginStatus();
    requireLogin(); // 로그인 상태가 아닌 경우 로그인 페이지로 리디렉션
    loadUserProfile();
};

// 사용자 프로필 로드 함수
function loadUserProfile() {
    const cognitoUser = userPool.getCurrentUser();

    if (cognitoUser) {
        cognitoUser.getSession(function(err, session) {
            if (err) {
                console.error('세션 가져오기 오류:', err);
                alert('세션을 가져오는 중 오류가 발생했습니다.');
                return;
            }

            const idToken = session.getIdToken().getJwtToken();

            // GET 요청으로 프로필 데이터 가져오기
            fetch(API_BASE_URL, {
                method: 'GET',
                headers: {
                    'Authorization': idToken
                }
            })
            .then(response => response.json())
            .then(data => {
                // 사용자 속성 객체 생성
                // name과 email은 Cognito에서 가져오는 것으로 가정
                cognitoUser.getUserAttributes(function(err, attributes) {
                    if (err) {
                        console.error('사용자 속성 가져오기 오류:', err);
                        alert('사용자 속성을 가져오는 중 오류가 발생했습니다.');
                        return;
                    }

                    const userProfile = {};
                    attributes.forEach(attribute => {
                        userProfile[attribute.getName()] = attribute.getValue();
                    });

                    // 사용자 정보 표시
                    document.getElementById('user-name').value = userProfile.name || '';
                    document.getElementById('user-email').value = userProfile.email || '';
                    document.getElementById('user-techstack').value = (data.TechStack || []).join(', ');
                    document.getElementById('user-experience').value = data.Experience || 0;
                    document.getElementById('user-project-preference').value = data.ProjectPreference || '';
                    document.getElementById('user-project-experience').value = data.ProjectExperience || 0;
                    document.getElementById('user-github').value = data.GithubURL || '';
                    document.getElementById('user-profile-image-url').value = data.ProfileImageURL || 'images/profile-placeholder.png';
                });
            })
            .catch(error => {
                console.error('프로필 가져오기 오류:', error);
                alert('프로필을 가져오는 중 오류가 발생했습니다.');
            });
        });
    } else {
        // 로그인되지 않은 경우 처리
        window.location.href = 'login.html';
    }
}

// 프로필 폼 제출 처리
document.getElementById('profile-form').addEventListener('submit', function (e) {
    e.preventDefault();

    const cognitoUser = userPool.getCurrentUser();

    if (!cognitoUser) {
        alert('로그인이 필요합니다.');
        window.location.href = 'login.html';
        return;
    }

    cognitoUser.getSession(function(err, session) {
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

        // POST 요청으로 프로필 데이터 업데이트
        fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': idToken
            },
            body: JSON.stringify(updatedProfile)
        })
        .then(response => response.json())
        .then(data => {
            alert(data.message);
            loadUserProfile(); // 업데이트된 프로필 로드
        })
        .catch(error => {
            console.error('프로필 저장 오류:', error);
            alert('프로필을 저장하는 중 오류가 발생했습니다.');
        });
    });
});
