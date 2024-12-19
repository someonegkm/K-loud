let userSub = ''; // Cognito sub 값 저장
let userId = '';  // 로그인 아이디 (username)
let currentEditingProjectId = null; // 수정 중인 프로젝트 ID

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
        console.log('ID Token:', idToken);

        // 사용자 ID 가져오기 (username)
        userId = cognitoUser.getUsername();
        console.log('로그인 아이디 (username):', userId);

        // 사용자 속성 대신 ID Token을 디코딩하여 사용자 정보 가져오기
        const payload = JSON.parse(atob(idToken.split('.')[1]));
        console.log('ID Token Payload:', payload);

        // 필요한 사용자 정보 설정
        document.getElementById('user-name').value = payload.name || '이름 없음';
        document.getElementById('user-email').value = payload.email || '이메일 없음';

        fetchUserProfile();
        fetchUserProjects();
        fetchMyProjects(userId);
    });
}



// 사용자 프로필 데이터 가져오기
async function fetchUserProfile() {
    try {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
            alert('Access Token이 없습니다. 다시 로그인해주세요.');
            window.location.href = 'login.html';
            return;
        }

        const response = await fetch(`https://nglpet7yod.execute-api.ap-northeast-2.amazonaws.com/prod/profile?UserID=${userId}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${accessToken}`, // Access Token 사용
            },
        });

        if (!response.ok) {
            throw new Error('사용자 프로필 데이터를 가져오지 못했습니다.');
        }

        const userProfile = await response.json();
        console.log('가져온 사용자 데이터:', userProfile);

        // 사용자 프로필 데이터 채우기
        document.getElementById('user-name').value = userProfile.name || '';
        document.getElementById('user-email').value = userProfile.email || '';
        document.getElementById('user-techstack').value = userProfile['user-techstack'] || '';
        document.getElementById('user-project-experience').value = userProfile['user-project-experience'] || '';
        document.getElementById('user-github').value = userProfile['user-github'] || '';
        document.getElementById('user-intro').value = userProfile['user-intro'] || '';

        // 선호 프로젝트 유형 데이터 할당
        const preferences = userProfile['user-project-preference'] || [];
        if (Array.isArray(preferences)) {
            preferences.forEach((preference) => {
                const checkbox = document.querySelector(`#user-project-preference input[value="${preference}"]`);
                if (checkbox) checkbox.checked = true;
            });
        }
    } catch (error) {
        console.error('사용자 데이터 가져오기 오류:', error);
        alert('사용자 데이터를 가져오는 중 오류가 발생했습니다.');
    }
}


// 사용자 프로젝트 데이터 가져오기
async function fetchUserProjects() {
    try {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
            alert('Access Token이 없습니다. 다시 로그인해주세요.');
            window.location.href = 'login.html';
            return;
        }

        const response = await fetch(`https://nglpet7yod.execute-api.ap-northeast-2.amazonaws.com/prod/createproject?ownerId=${userId}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${accessToken}`, // Access Token 사용
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
        projectElement.className = 'project-item';
        projectElement.style.border = '1px solid #ccc';
        projectElement.style.padding = '10px';
        projectElement.style.marginBottom = '10px';

        projectElement.innerHTML = `
            <h4>${project.projectName || '프로젝트 이름 없음'}</h4>
            <p><strong>설명:</strong> ${project.projectDescription || '설명 없음'}</p>
            <p><strong>기술 스택:</strong> ${project.techStack ? project.techStack.join(', ') : '없음'}</p>
            <p><strong>유형:</strong> ${project.projectType || '유형 없음'}</p>
            <p><strong>생성 일시:</strong> ${project.createdAt || '알 수 없음'}</p>
            <button class="btn btn-primary btn-sm" onclick='openEditPopup(${JSON.stringify(project)})'>수정</button>
            <button class="btn btn-danger btn-sm" onclick="deleteProject('${project.projectId}')">삭제</button>
        `;

        // 참가 인원 정보 추가
        const participants = project.participants || [];
        const participantsContainer = document.createElement('div');
        participantsContainer.style.marginTop = '10px';

        if (participants.length > 0) {
            participantsContainer.innerHTML = `
                <h5>참가한 인원:</h5>
                <ul>
                    ${participants.map(participant => `
                        <li>
                            <strong>ID:</strong> ${participant.applicantId}<br>
                            <strong>역할:</strong> ${participant.role}<br>
                            <button class="btn btn-warning btn-sm" onclick="removeParticipant('${project.projectId}', '${participant.applicantId}')">내쫓기</button>
                        </li>
                    `).join('')}
                </ul>
            `;
        } else {
            participantsContainer.innerHTML = '<p>참가한 인원이 없습니다.</p>';
        }

        projectElement.appendChild(participantsContainer); // 참가 인원 추가
        projectsContainer.appendChild(projectElement);
    });
}

// 수정 팝업 열기
function openEditPopup(project) {
    // 현재 수정 중인 프로젝트 ID 저장
    currentEditingProjectId = project.projectId;

    // 팝업에 기존 데이터 채우기
    document.getElementById('edit-projectName').value = project.projectName || '';
    document.getElementById('edit-projectDescription').value = project.projectDescription || '';
    document.getElementById('edit-techStack').value = project.techStack ? project.techStack.join(', ') : '';
    document.getElementById('edit-projectType').value = project.projectType || '';
    document.getElementById('edit-maxTeamSize').value = project.maxTeamSize || 0;

    // 팝업 표시
    document.getElementById('edit-project-popup').style.display = 'block';
}

// 팝업 닫기
function closeEditPopup() {
    document.getElementById('edit-project-popup').style.display = 'none';
    currentEditingProjectId = null;
}

// 수정된 프로젝트 저장
document.getElementById('saveEditButton').addEventListener('click', async function () {
    if (!currentEditingProjectId) {
        alert('수정할 프로젝트를 선택하지 않았습니다.');
        return;
    }

    // 수정된 데이터 가져오기
    const updatedProject = {
        projectId: currentEditingProjectId,
        projectName: document.getElementById('edit-projectName').value,
        projectDescription: document.getElementById('edit-projectDescription').value,
        techStack: document.getElementById('edit-techStack').value.split(',').map(s => s.trim()),
        projectType: document.getElementById('edit-projectType').value,
        maxTeamSize: parseInt(document.getElementById('edit-maxTeamSize').value, 10),
    };

    console.log('수정된 데이터:', updatedProject);

    try {
        // API Gateway로 PUT 요청
        const response = await fetch('https://nglpet7yod.execute-api.ap-northeast-2.amazonaws.com/prod/updateProject', { // 수정된 API URL
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('idToken')}`, // Cognito 토큰 추가
            },
            body: JSON.stringify(updatedProject),
        });

        if (!response.ok) {
            throw new Error('프로젝트 수정 중 문제가 발생했습니다.');
        }

        alert('프로젝트가 성공적으로 수정되었습니다!');
        closeEditPopup();
        fetchUserProjects(); // 수정 후 프로젝트 목록 새로고침
    } catch (error) {
        console.error('수정 요청 실패:', error);
        alert('프로젝트 수정 중 오류가 발생했습니다.');
    }
});

// 팝업 취소 버튼 클릭 시 닫기
document.getElementById('cancelEditButton').addEventListener('click', closeEditPopup);

// 프로젝트 삭제
async function deleteProject(projectId) {
    if (!confirm('정말로 이 프로젝트를 삭제하시겠습니까?')) {
        return;
    }

    try {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
            alert('Access Token이 없습니다. 다시 로그인해주세요.');
            window.location.href = 'login.html';
            return;
        }

        const response = await fetch(`https://nglpet7yod.execute-api.ap-northeast-2.amazonaws.com/prod/createproject/${projectId}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${accessToken}`, // Access Token 사용
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


// 프로젝트 참여한 인원 삭제
async function removeParticipant(projectId, applicantId) {
    if (!confirm('정말로 이 참가자를 내쫓으시겠습니까?')) {
        return; // 사용자가 취소를 선택한 경우
    }

    try {
        const response = await fetch('https://nglpet7yod.execute-api.ap-northeast-2.amazonaws.com/prod/removeParticipant', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('idToken')}`
            },
            body: JSON.stringify({ projectId, applicantId })
        });

        if (!response.ok) {
            throw new Error('참가자 삭제 중 문제가 발생했습니다.');
        }

        alert('참가자가 성공적으로 내쫓겼습니다!');
        fetchUserProjects(); // 프로젝트 목록 다시 불러오기
    } catch (error) {
        console.error('참가자 삭제 오류:', error);
        alert('참가자를 내쫓는 중 오류가 발생했습니다.');
    }
}


//사용자가 참여한 프로젝트 가져오기
async function fetchMyProjects(userId) {
    const API_URL = `https://nglpet7yod.execute-api.ap-northeast-2.amazonaws.com/prod/getAcceptProjects?applicantId=${userId}`;

    try {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
            alert('Access Token이 없습니다. 다시 로그인해주세요.');
            window.location.href = 'login.html';
            return;
        }

        const response = await fetch(API_URL, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${accessToken}`, // Access Token 사용
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`참여한 프로젝트 조회 실패: ${response.status} - ${errorText}`);
        }

        const projects = await response.json();
        console.log('Lambda 응답:', projects);
        renderMyProjects(projects);
    } catch (error) {
        console.error('참여한 프로젝트 조회 중 오류 발생:', error);
        const container = document.getElementById('participated-projects-container');
        container.innerHTML = '<p>참여한 프로젝트를 가져오는 중 문제가 발생했습니다.</p>';
    }
}


function renderMyProjects(projects) {
    const container = document.getElementById('participated-projects-container');

    if (!container) {
        console.error("참여한 프로젝트 컨테이너가 존재하지 않습니다.");
        return;
    }

    container.innerHTML = ''; // 기존 데이터 초기화

    if (projects.length === 0) {
        container.innerHTML = '<p>참여한 프로젝트가 없습니다.</p>';
        return;
    }

    projects.forEach(project => {
        console.log('프로젝트 데이터:', project); // 각 프로젝트 데이터 확인

        const projectItem = document.createElement('div');
        projectItem.className = 'project-item';
        projectItem.style.border = '1px solid #ccc';
        projectItem.style.padding = '10px';
        projectItem.style.marginBottom = '10px';

        // projectName이 없으면 기본값으로 처리
        projectItem.innerHTML = `
            <h4>${project.projectName || '프로젝트 이름 없음'}</h4>
            <p><strong>방장:</strong> ${project.projectOwnerId}</p>
            <p><strong>참여 시간:</strong> ${new Date(Number(project.timestamp)).toLocaleString()}</p>
        `;

        container.appendChild(projectItem);
    });
}

// 사용자 정보 저장
function attachFormSubmitEvent() {
    const form = document.getElementById('profile-form');
    form.addEventListener('submit', async function (e) {
        e.preventDefault(); // 기본 제출 동작 막기

        // 사용자 입력값 가져오기
        const userProfile = {
            UserID: userId, // Cognito 사용자 ID(username) 사용
            name: document.getElementById('user-name').value,
            email: document.getElementById('user-email').value,
            user_techstack: document.getElementById('user-techstack').value,
            // 체크박스에서 선택된 값 수집
            user_project_preference: Array.from(
                document.querySelectorAll('#user-project-preference input[type="checkbox"]:checked')
            ).map((checkbox) => checkbox.value),
            user_project_experience: document.getElementById('user-project-experience').value,
            user_github: document.getElementById('user-github').value,
            user_intro: document.getElementById('user-intro').value,
        };

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
                throw new Error('프로필 저장 중 문제가 발생했습니다.');
            }

            const result = await response.json();
            console.log('저장된 데이터:', result);

            // 저장 완료 알림
            alert('프로필이 성공적으로 저장되었습니다!');

            // 마이페이지로 이동
            window.location.href = 'mypage.html'; // "마이페이지" URL
        } catch (error) {
            console.error('API 호출 오류:', error);
            alert('프로필 저장 중 오류가 발생했습니다.');
        }
    });
}

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
