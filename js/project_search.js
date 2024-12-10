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

// 전역 변수
let currentSelectedProject = null; // 현재 선택된 프로젝트
let userName = null; // 사용자 이름을 저장할 전역 변수
let userId = null; // 사용자 이름을 저장할 전역 변수
const API_URL = 'https://df6x7d34ol.execute-api.ap-northeast-2.amazonaws.com/prod/getproject';

// WebSocket 연결
let ws;

function connectWebSocket() {
    const cognitoUser = userPool.getCurrentUser();

    if (!cognitoUser) {
        console.error('사용자가 로그인하지 않았습니다.');
        return;
    }

    // Cognito 사용자 ID 가져오기
    cognitoUser.getSession((err, session) => {
        if (err) {
            console.error('세션을 가져오는 중 오류 발생:', err);
            return;
        }

        // 사용자 ID 가져오기
        const idToken = session.getIdToken().getJwtToken();
        // Base64 디코딩을 UTF-8로 처리
        const payload = JSON.parse(
            decodeURIComponent(
                atob(idToken.split('.')[1])
                    .split('')
                    .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
                    .join('')
            )
        );
        userName = payload.name || '이름 없음'; // `name` 속성 또는 기본값 설정
        userId = cognitoUser.getUsername(); // 또는 다른 방식으로 가져올 수도 있음
        console.log('User ID:', userId);
        console.log('User Name:', userName);


        // WebSocket 연결
        const wsUrl = `wss://fds9jyxgw7.execute-api.ap-northeast-2.amazonaws.com/prod/?userId=${userId}`;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('WebSocket 연결 성공');
        };

        ws.onmessage = (event) => {
            console.log('서버로부터 받은 메시지:', event.data);
            alert('새 알림: ' + event.data);
        };

        ws.onclose = () => {
            console.log('WebSocket 연결 종료');
        };

        ws.onerror = (error) => {
            console.error('WebSocket 에러:', error);
        };
    });
}


// 데이터 가져오기
async function fetchProjects() {
    try {
        const response = await fetch(API_URL, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) throw new Error('API 요청 실패');

        const projects = await response.json();
        console.log('프로젝트 데이터:', projects);
        renderProjects(projects);
    } catch (error) {
        console.error('프로젝트 데이터를 가져오는 중 오류 발생:', error);
    }
}

// 로그인 상태 확인 함수 추가
function ensureLoggedIn(actionCallback) {
    const cognitoUser = userPool.getCurrentUser();
    if (cognitoUser) {
        cognitoUser.getSession((err, session) => {
            if (err || !session.isValid()) {
                alert('로그인이 필요합니다.');
                window.location.href = 'login.html'; // 로그인 페이지로 리디렉션
            } else {
                actionCallback(); // 로그인이 유효한 경우 콜백 실행
            }
        });
    } else {
        alert('로그인이 필요합니다.');
        window.location.href = 'login.html'; // 로그인 페이지로 리디렉션
    }
}

// 팝업 열기
function openProjectPopup(project) {
    if (!project) {
        console.error('잘못된 프로젝트 데이터:', project);
        alert('프로젝트 데이터를 불러올 수 없습니다.');
        return;
    }

    currentSelectedProject = project;

    popupTitle.textContent = project.projectName || '프로젝트 이름 없음';
    popupDescription.textContent = project.projectDescription || '설명이 없습니다.';
    popupTechStack.textContent = project.techStack ? project.techStack.join(', ') : '기술 스택 없음';
    popupType.textContent = project.projectType || '유형 없음';
    popupCreated.textContent = project.createdAt || '생성 날짜 없음';

    popup.style.display = 'block';

    // 초기화
    applicationSection.style.display = 'none'; // 지원 영역 숨김
    resetApplicationForm();
}

// "지원하기" 버튼 클릭 이벤트
applyButton.onclick = () => {
    ensureLoggedIn(() => {
        if (!currentSelectedProject) {
            alert('프로젝트 데이터를 불러올 수 없습니다. 다시 시도해주세요.');
            return;
        }
        // 지원 영역 열기
        applicationSection.style.display = 'block';
    });
};

// 지원 제출 버튼 클릭 이벤트
submitApplicationButton.addEventListener('click', () => {
    const activeButton = document.querySelector('.role-button.active');
    const selectedRole = activeButton ? activeButton.getAttribute('data-role') : null;
    const applicationNoteValue = applicationNote.value.trim();

    if (!currentSelectedProject || !selectedRole || !applicationNoteValue) {
        alert('지원 유형과 지원서를 모두 작성해주세요.');
        return;
    }

    // WebSocket으로 지원 요청 전송
    const message = {
        action: 'submitApplication', // WebSocket route 이름
        projectOwnerId: currentSelectedProject.ownerId,
        applicantId: userName, // 사용자 이름
        userId: userId, // 사용자 ID 추가
        projectName: currentSelectedProject.projectName,
        role: selectedRole,
        note: applicationNoteValue,
    };

    ws.send(JSON.stringify(message));

    alert('지원이 완료되었습니다!');
    popup.style.display = 'none';
    resetApplicationForm();
});

// 지원 양식 초기화
function resetApplicationForm() {
    const roleButtons = document.querySelectorAll('.role-button');
    roleButtons.forEach((button) => button.classList.remove('active'));
    applicationNote.value = '';
}

// 버튼 활성화 토글 (하나만 선택 가능)
applicationRoles.addEventListener('click', (event) => {
    const clickedButton = event.target;
    if (clickedButton.classList.contains('role-button')) {
        const roleButtons = document.querySelectorAll('.role-button');
        roleButtons.forEach((button) => button.classList.remove('active'));
        clickedButton.classList.add('active');
    }
});

// 팝업 닫기
closePopup.addEventListener('click', () => {
    popup.style.display = 'none';
});

// 바깥 클릭 시 팝업 닫기
window.addEventListener('click', (event) => {
    if (event.target === popup) {
        popup.style.display = 'none';
    }
});

// 프로젝트 카드 클릭 이벤트 추가 함수
function addProjectCardListeners(projectCards, projects) {
    projectCards.forEach((card) => {
        if (card instanceof HTMLElement) { // card가 DOM 요소인지 확인
            const index = card.getAttribute('data-index');
            card.addEventListener('click', () => openProjectPopup(projects[index]));
        } else {
            console.error('올바르지 않은 카드 요소:', card);
        }
    });
}

function renderProjects(projects) {
    console.log('렌더링할 프로젝트 데이터:', projects); // 프로젝트 데이터 확인

    const frontendContainer = document.getElementById('frontend-projects');
    const backendContainer = document.getElementById('backend-projects');
    const designContainer = document.getElementById('design-projects');
    const planningContainer = document.getElementById('planning-projects');

    // 각 카테고리 컨테이너 초기화
    frontendContainer.innerHTML = '';
    backendContainer.innerHTML = '';
    designContainer.innerHTML = '';
    planningContainer.innerHTML = '';

    // 프로젝트 카드 생성
    projects.forEach((project, index) => {
        console.log('현재 프로젝트 데이터:', project); // 각 프로젝트 데이터 확인

        const projectCard = `
            <div class="project-card" data-index="${index}">
                <h5>${project.projectName}</h5>
                <p>${project.projectDescription}</p>
                <small>기술 스택: ${project.techStack.join(', ')}</small>
            </div>
        `;

        if (project.roles.includes('frontend')) {
            frontendContainer.innerHTML += projectCard;
        }
        if (project.roles.includes('backend')) {
            backendContainer.innerHTML += projectCard;
        }
        if (project.roles.includes('design')) {
            designContainer.innerHTML += projectCard;
        }
        if (project.roles.includes('pm')) {
            planningContainer.innerHTML += projectCard;
        }
    });

    // DOM에 반영된 후에 카드 요소 가져오기
    const frontendCards = Array.from(frontendContainer.querySelectorAll('.project-card'));
    const backendCards = Array.from(backendContainer.querySelectorAll('.project-card'));
    const designCards = Array.from(designContainer.querySelectorAll('.project-card'));
    const planningCards = Array.from(planningContainer.querySelectorAll('.project-card'));

    // 이벤트 리스너 등록
    addProjectCardListeners(frontendCards, projects);
    addProjectCardListeners(backendCards, projects);
    addProjectCardListeners(designCards, projects);
    addProjectCardListeners(planningCards, projects);
}


// 프로젝트 카드 클릭 이벤트 수정
function openProjectPopup(project) {
    ensureLoggedIn(() => {
        if (!project) {
            console.error('잘못된 프로젝트 데이터:', project);
            alert('프로젝트 데이터를 불러올 수 없습니다.');
            return;
        }

        // 현재 선택된 프로젝트 저장
        currentSelectedProject = project;

        popupTitle.textContent = project.projectName || '프로젝트 이름 없음';
        popupDescription.textContent = project.projectDescription || '설명이 없습니다.';
        popupTechStack.textContent = project.techStack ? project.techStack.join(', ') : '기술 스택 없음';
        popupType.textContent = project.projectType || '유형 없음';
        popupCreated.textContent = project.createdAt || '생성 날짜 없음';

        // 팝업 표시
        popup.style.display = 'block';

        // 초기화
        applicationSection.style.display = 'none'; // 지원 영역 숨김
        resetApplicationForm(); // 지원 양식 초기화
    });
}

// 탭 변경 이벤트 처리
document.querySelectorAll('.nav-link').forEach((tab) => {
    tab.addEventListener('shown.bs.tab', () => {
        fetchProjects(); // 탭 전환 시 데이터 가져오기
    });
});

// 페이지 로드 시 WebSocket 연결
window.onload = () => {
    connectWebSocket();
    fetchProjects();
};
