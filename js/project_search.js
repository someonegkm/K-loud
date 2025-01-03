// 팝업 엘리먼트 가져오기
const popup = document.getElementById('project-popup');
const closePopup = document.getElementById('close-popup');
const popupTitle = document.getElementById('popup-title');
const popupDescription = document.getElementById('popup-description');
const popupTechStack = document.getElementById('popup-techstack');
const popupType = document.getElementById('popup-type');
const popupCreated = document.getElementById('popup-created');
const applyButton = document.getElementById('apply-button');
const applicationSection = document.getElementById('application-section');
const applicationRoles = document.getElementById('application-roles');
const applicationNote = document.getElementById('application-note');
const submitApplicationButton = document.getElementById('submit-application');
const roleDisplayNames = {
    frontend: "프론트엔드",
    backend: "백엔드",
    design: "디자인",
    pm: "기획"
};

// 전역 변수
let currentSelectedProject = null;
let userName = null;
let userId = null;
const API_URL = 'https://d2miwwhvzmngyp.cloudfront.net/prod/getproject';

// WebSocket 연결
let ws;

function connectWebSocket() {
    const cognitoUser = userPool.getCurrentUser();

    if (!cognitoUser) {
        console.error('사용자가 로그인하지 않았습니다.');
        return;
    }

    cognitoUser.getSession((err, session) => {
        if (err) {
            console.error('세션을 가져오는 중 오류 발생:', err);
            return;
        }

        const idToken = session.getIdToken().getJwtToken();
        const payload = JSON.parse(
            decodeURIComponent(
                atob(idToken.split('.')[1])
                    .split('')
                    .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
                    .join('')
            )
        );
        userName = payload.name || '이름 없음';
        userId = cognitoUser.getUsername();

        const wsUrl = `wss://fds9jyxgw7.execute-api.ap-northeast-2.amazonaws.com/prod/?userId=${userId}`;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => console.log('WebSocket 연결 성공');
        ws.onmessage = (event) => alert('새 알림: ' + event.data);
        ws.onclose = () => console.log('WebSocket 연결 종료');
        ws.onerror = (error) => console.error('WebSocket 에러:', error);
    });
}

// 데이터 가져오기
async function fetchProjects() {
    try {
        const response = await fetch(`${API_URL}?userId=${userId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) throw new Error('API 요청 실패');

        const projects = await response.json();
        console.log('API 응답 프로젝트 데이터:', projects); // API 응답 로그

        // 내가 만든 프로젝트를 제외한 필터링된 데이터
        const filteredProjects = projects.filter(
            (project) => project.ownerId !== userId
        );
        console.log('필터링된 프로젝트 데이터:', filteredProjects);

        // 필터링된 프로젝트 렌더링
        renderProjects(filteredProjects);

        // 전체 프로젝트 렌더링 (필터링 없이)
        renderAllProjects(projects);
    } catch (error) {
        console.error('프로젝트 데이터를 가져오는 중 오류 발생:', error);
    }
}

// 전체 프로젝트 랜더링 함수
function renderAllProjects(projects) {
    const allProjectsContainer = document.getElementById('all-projects');
    allProjectsContainer.innerHTML = ''; // 기존 내용을 초기화

    // 전체 탭에서도 ownerId와 maxTeamSize 기준으로 필터링
    const filteredProjects = projects.filter(
        (project) => project.ownerId !== userId && project.maxTeamSize > 0
    );

    filteredProjects.forEach((project) => {
        const remainingSlots = Math.max(
            0,
            project.maxTeamSize - (project.participants?.length || 0)
        );

        const roles = project.roles.map(role => roleDisplayNames[role] || role).join(', '); // 지원 유형 구성

        const projectCard = document.createElement('div');
        projectCard.className = 'project-card';

        projectCard.innerHTML = `
            <h5>${project.projectName}</h5>
            <small>프로젝트 유형: ${project.projectType}</small>
            <br>
            <small>모집 인원: ${remainingSlots}/${project.maxTeamSize}</small>
            <br>
            <small>지원 유형: ${roles}</small>
        `;

        projectCard.addEventListener('click', () => openProjectPopup(project));

        allProjectsContainer.appendChild(projectCard);
    });
}


// 프로젝트 렌더링
function renderProjects(projects) {
    console.log('렌더링할 프로젝트 데이터:', projects);

    const frontendContainer = document.getElementById('frontend-projects');
    const backendContainer = document.getElementById('backend-projects');
    const designContainer = document.getElementById('design-projects');
    const planningContainer = document.getElementById('planning-projects');

    // 초기화
    frontendContainer.innerHTML = '';
    backendContainer.innerHTML = '';
    designContainer.innerHTML = '';
    planningContainer.innerHTML = '';

    projects.forEach((project, index) => {
        const remainingSlots = Math.max(0, project.maxTeamSize - (project.participants?.length || 0));
        console.log(`Project: ${project.projectName}, Roles: ${project.roles}, Remaining Slots: ${remainingSlots}`);
        const isParticipated = project.isParticipated;

        const roles = project.roles.map(role => roleDisplayNames[role] || role).join(', '); // 지원 유형 구성

        const projectCard = document.createElement('div');
        projectCard.className = 'project-card';
        projectCard.dataset.index = index;

        projectCard.innerHTML = `
            <h5>${project.projectName}</h5>
            <small>프로젝트 유형: ${project.projectType}</small>
            <br>
            <small>모집 인원: ${remainingSlots}/${project.maxTeamSize}</small>
            ${isParticipated ? '<small>이미 참여한 프로젝트입니다.</small>' : ''}
            <br>
            <small>지원 유형: ${roles}</small> <!-- 추가된 지원 유형 -->
        `;

        // 프로젝트 카드 클릭 이벤트 추가
        projectCard.addEventListener('click', () => openProjectPopup(project));

        // 기획(PM)만 별도로 처리
        if (project.roles.includes('pm') && remainingSlots > 0) {
            console.log('Adding to Planning:', project.projectName);
            const planningCard = projectCard.cloneNode(true);
            planningCard.addEventListener('click', () => openProjectPopup(project));
            planningContainer.appendChild(planningCard);
        } else {
            console.log(`Not Adding to Planning: ${project.projectName}, includes pm: ${project.roles.includes('pm')}, remainingSlots: ${remainingSlots}`);
        }

        // 다른 역할별 탭 추가
        ['frontend', 'backend', 'design'].forEach((role) => {
            if (project.roles.includes(role) && remainingSlots > 0) {
                const container = document.getElementById(`${role}-projects`);
                if (container) {
                    console.log(`Adding to ${role}:`, project.projectName);
                    const clonedCard = projectCard.cloneNode(true);
                    clonedCard.addEventListener('click', () => openProjectPopup(project));
                    container.appendChild(clonedCard);
                }
            }
        });
    });
}

// 팝업 열기
function openProjectPopup(project) {
    requireLogin(); // 로그인 상태 확인 후 진행
    if (!project) {
        console.error('잘못된 프로젝트 데이터:', project);
        alert('프로젝트 데이터를 불러올 수 없습니다.');
        return;
    }

    currentSelectedProject = project;

    // 팝업 내용 채우기
    document.getElementById('popup-title').textContent = project.projectName || '프로젝트 이름 없음';
    document.getElementById('popup-type').textContent = project.projectType || '유형 없음';
    document.getElementById('popup-techstack').textContent = project.techStack ? project.techStack.join(', ') : '기술 스택 없음';
    document.getElementById('popup-recruitment').textContent = `${project.maxTeamSize || 0}명`;
    document.getElementById('popup-duration').textContent = `${project.projectDuration || 0}일`;
    document.getElementById('popup-description').textContent = project.projectDescription || '내용이 없습니다.';
    document.getElementById('popup-owner-name').textContent = project.ownerName || '알 수 없음'; // 방장 닉네임 추가

    // 역할 버튼 생성
    const applicationRoles = document.getElementById('application-roles');
    applicationRoles.innerHTML = ''; // 기존 역할 초기화

    project.roles.forEach((role) => {
        const isDisabled = (project.disabledRoles || []).includes(role); // 비활성화 확인
        const roleButton = document.createElement('button');
        roleButton.className = `role-button ${isDisabled ? 'disabled' : ''}`;
        roleButton.textContent = roleDisplayNames[role] || role; // 역할 이름 매핑
        roleButton.dataset.role = role;

        if (isDisabled) {
            roleButton.disabled = true; // 클릭 불가능
            roleButton.title = '이 역할은 지원할 수 없습니다.'; // 경고 메시지
        } else {
            // 활성화된 버튼 클릭 이벤트 추가
            roleButton.addEventListener('click', () => {
                document.querySelectorAll('.role-button').forEach((btn) => btn.classList.remove('active'));
                roleButton.classList.add('active');
            });
        }

        applicationRoles.appendChild(roleButton);
    });

    // 이미 참여한 프로젝트라면 버튼 비활성화
    applyButton.disabled = project.isParticipated;

    // 지원 영역 초기화
    resetApplicationForm();

    // 팝업 표시
    document.getElementById('project-popup').style.display = 'block';
}



// 지원 제출 버튼 클릭 이벤트
submitApplicationButton.addEventListener('click', () => {
    // 활성화된 역할 버튼 가져오기
    const activeButton = document.querySelector('.role-button.active');
    const selectedRole = activeButton ? activeButton.getAttribute('data-role') : null;
    const applicationNoteValue = applicationNote.value.trim();

    // 필요한 데이터가 없는 경우 경고
    if (!currentSelectedProject || !selectedRole || !applicationNoteValue) {
        alert('지원 유형과 지원서를 모두 작성해주세요.');
        return;
    }

    // WebSocket을 통해 서버로 메시지 전송
    const message = {
        action: 'submitApplication', // 서버에서 처리할 액션
        projectOwnerId: currentSelectedProject.ownerId, // 프로젝트 소유자 ID
        applicantId: userName, // 지원자 이름
        userId, // 지원자 ID
        projectName: currentSelectedProject.projectName, // 프로젝트 이름
        role: selectedRole, // 선택한 역할
        note: applicationNoteValue, // 지원서 내용
        projectId: currentSelectedProject.projectId || 'default-room-id', // 프로젝트 ID
    };

    // WebSocket 메시지 전송
    ws.send(JSON.stringify(message));

    // 완료 메시지 및 팝업 닫기
    alert('지원이 완료되었습니다!');
    closeProjectPopup();
    resetApplicationForm();
});


// 팝업 닫기
function closeProjectPopup() {
    document.getElementById('project-popup').style.display = 'none';
    resetApplicationForm(); // 초기화
}

// 지원 양식 초기화
function resetApplicationForm() {
    document.querySelectorAll('.role-button').forEach((button) => button.classList.remove('active'));
    applicationNote.value = '';
    applicationSection.style.display = 'none'; // 지원 영역 숨김
}



// 초기화 및 WebSocket 연결
document.addEventListener('DOMContentLoaded', () => {
    connectWebSocket();
    fetchProjects();

    // 닫기 버튼 이벤트 리스너 등록
    const closePopupButton = document.getElementById('close-popup');
    if (closePopupButton) {
        closePopupButton.addEventListener('click', () => {
            console.log("닫기 버튼 클릭");
            closeProjectPopup();
        });
    }

    // "지원하기" 버튼 이벤트 리스너
    const applyButton = document.getElementById('apply-button');
    if (applyButton) {
        applyButton.addEventListener('click', () => {
            console.log("지원하기 버튼 클릭");
            // 지원 영역 표시
            applicationSection.style.display = 'block';
        });
    }
});

