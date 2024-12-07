let userSub = ''; // Cognito sub 값 저장
let userId = '';  // 로그인 아이디 (username)

function populateUserProfile() {
    const cognitoUser = userPool.getCurrentUser();
    if (!cognitoUser) {
        alert('로그인이 필요합니다.');
        window.location.href = 'login.html';
        return;
    }

    cognitoUser.getSession((err, session) => {
        if (err || !session.isValid()) {
            alert('세션이 유효하지 않습니다. 다시 로그인해주세요.');
            window.location.href = 'login.html';
            return;
        }

        console.log('세션이 성공적으로 가져와졌습니다.');
        const idToken = session.getIdToken().getJwtToken();
        localStorage.setItem('idToken', idToken);

        // 사용자 ID 가져오기 (로그인 아이디)
        userId = cognitoUser.getUsername();
        console.log('로그인 아이디 (username):', userId);

        cognitoUser.getUserAttributes((err, attributes) => {
            if (err) {
                console.error('사용자 속성 가져오기 오류:', err);
                return;
            }

            attributes.forEach(attribute => {
                console.log(`속성 이름: ${attribute.Name}, 속성 값: ${attribute.Value}`);
                if (attribute.Name === 'sub') {
                    userSub = attribute.Value; // sub 값 저장
                    console.log('사용자 sub:', userSub);
                }
            });

            // 사용자 속성 로드 후 데이터 가져오기
            fetchUserProfile(); // 사용자 프로필 데이터 가져오기
            fetchUserProjects(); // 사용자 프로젝트 데이터 가져오기
        });
    });
}





// 사용자 프로필 데이터 가져오기
async function fetchUserProfile() {
    try {
        const response = await fetch(`https://nglpet7yod.execute-api.ap-northeast-2.amazonaws.com/prod/profile?UserID=${userSub}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${localStorage.getItem('idToken')}`, // Cognito 토큰 추가
            },
        });

        if (!response.ok) {
            throw new Error('사용자 프로필 데이터를 가져오지 못했습니다.');
        }

        const userProfile = await response.json();
        console.log('가져온 사용자 데이터:', userProfile);

        // 폼 필드에 데이터 채우기
        document.getElementById('user-name').value = userProfile.name || '';
        document.getElementById('user-email').value = userProfile.email || '';
        document.getElementById('user-techstack').value = userProfile['user-techstack'] || '';
        document.getElementById('user-project-preference').value = userProfile['user-project-preference'] || '';
        document.getElementById('user-project-experience').value = userProfile['user-project-experience'] || '';
        document.getElementById('user-github').value = userProfile['user-github'] || '';
        document.getElementById('user-intro').value = userProfile['user-intro'] || '';
    } catch (error) {
        console.error('사용자 데이터 가져오기 오류:', error);
        alert('사용자 데이터를 가져오는 중 오류가 발생했습니다.');
    }
}

// 사용자 프로젝트 데이터 가져오기
async function fetchUserProjects() {
    try {
        const response = await fetch(`https://df6x7d34ol.execute-api.ap-northeast-2.amazonaws.com/prod/createproject?ownerId=${userId}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${localStorage.getItem('idToken')}`, // Cognito 토큰 추가
            },
        });

        if (!response.ok) {
            throw new Error('사용자 프로젝트 데이터를 가져오지 못했습니다.');
        }

        const userProjects = await response.json();
        console.log('가져온 프로젝트 데이터:', userProjects);

        renderUserProjects(userProjects.data || []);
    } catch (error) {
        console.error('사용자 프로젝트 가져오기 오류:', error);
        alert('프로젝트 데이터를 가져오는 중 오류가 발생했습니다.');
    }
}

// 가져온 프로젝트 데이터를 화면에 렌더링
function renderUserProjects(projects) {
    const projectsContainer = document.getElementById('user-projects-container');
    projectsContainer.innerHTML = ''; // 기존 내용 초기화

    if (projects.length === 0) {
        projectsContainer.innerHTML = '<p>등록된 프로젝트가 없습니다.</p>';
        return;
    }

    projects.forEach(project => {
        const projectElement = document.createElement('div');
        projectElement.className = 'project-item'; // CSS 클래스 추가
        projectElement.innerHTML = `
            <h4>${project.projectName}</h4>
            <p><strong>설명:</strong> ${project.projectDescription}</p>
            <p><strong>기술 스택:</strong> ${project.techStack.join(', ')}</p>
            <p><strong>유형:</strong> ${project.projectType}</p>
            <p><strong>생성 일시:</strong> ${project.createdAt}</p>
            <button class="btn btn-danger btn-sm" onclick="deleteProject('${project.projectId}')">삭제</button>
        `;
        projectsContainer.appendChild(projectElement);
    });
}

// 프로젝트 삭제
async function deleteProject(projectId) {
    if (!confirm('정말로 이 프로젝트를 삭제하시겠습니까?')) {
        return; // 사용자가 취소를 선택한 경우
    }

    try {
        const response = await fetch(`https://df6x7d34ol.execute-api.ap-northeast-2.amazonaws.com/prod/${projectId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('idToken')}`, // Cognito 토큰 추가
            },
        });

        if (!response.ok) {
            throw new Error('프로젝트 삭제 중 문제가 발생했습니다.');
        }

        alert('프로젝트가 성공적으로 삭제되었습니다!');
        fetchUserProjects(); // 삭제 후 프로젝트 목록 업데이트
    } catch (error) {
        console.error('프로젝트 삭제 오류:', error);
        alert('프로젝트를 삭제하는 중 오류가 발생했습니다.');
    }
}


// 페이지 로드 시 실행
window.onload = function () {
    console.log('페이지 로드');
    updateNavBar(); // 내비게이션 업데이트
    populateUserProfile(); // 사용자 프로필 채우기
    attachFormSubmitEvent(); // 폼 제출 이벤트 연결
    fetchUserProjects(); // 사용자 프로젝트 가져오기
};

// 내비게이션 바 업데이트 함수
function updateNavBar() {
    const cognitoUser = userPool.getCurrentUser();
    const loginLogoutLink = document.getElementById('login-logout-link');

    if (cognitoUser) {
        loginLogoutLink.textContent = '로그아웃';
        loginLogoutLink.href = '#';
        loginLogoutLink.onclick = function () {
            cognitoUser.signOut();
            window.location.href = 'login.html';
        };
    } else {
        loginLogoutLink.textContent = '로그인';
        loginLogoutLink.href = 'login.html';
        loginLogoutLink.onclick = null;
    }
}
