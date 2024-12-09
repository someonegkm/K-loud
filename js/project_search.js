// 팝업 엘리먼트 가져오기
const popup = document.getElementById('project-popup');
const closePopup = document.getElementById('close-popup');
const popupTitle = document.getElementById('popup-title');
const popupDescription = document.getElementById('popup-description');
const popupTechStack = document.getElementById('popup-techstack');
const popupType = document.getElementById('popup-type');
const popupCreated = document.getElementById('popup-created');
const applyButton = document.getElementById('apply-button');

const API_URL = 'https://df6x7d34ol.execute-api.ap-northeast-2.amazonaws.com/prod/getproject';

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

// 팝업 열기
function openProjectPopup(project) {
    if (!project) {
        console.error('잘못된 프로젝트 데이터:', project);
        alert('프로젝트 데이터를 불러올 수 없습니다.');
        return;
    }

    // 팝업에 데이터를 표시
    console.log("열리는 프로젝트 데이터:", project);
    popupTitle.textContent = project.projectName || '프로젝트 이름 없음';
    popupDescription.textContent = project.projectDescription || '설명이 없습니다.';
    popupTechStack.textContent = project.techStack ? project.techStack.join(', ') : '기술 스택 없음';
    popupType.textContent = project.projectType || '유형 없음';
    popupCreated.textContent = project.createdAt || '생성 날짜 없음';

    popup.style.display = 'block';
}

// 팝업 닫기
closePopup.onclick = () => {
    popup.style.display = 'none';
};

// 바깥 클릭 시 팝업 닫기
window.onclick = (event) => {
    if (event.target === popup) {
        popup.style.display = 'none';
    }
};

// 프로젝트 렌더링
function renderProjects(projects) {
    console.log("전체 프로젝트 데이터:", projects);

    // 각각의 컨테이너 초기화
    const frontendContainer = document.getElementById('frontend-projects');
    const backendContainer = document.getElementById('backend-projects');
    const designContainer = document.getElementById('design-projects');
    const planningContainer = document.getElementById('planning-projects');

    frontendContainer.innerHTML = '';
    backendContainer.innerHTML = '';
    designContainer.innerHTML = '';
    planningContainer.innerHTML = '';

    projects.forEach((project, index) => {
        console.log('현재 프로젝트 데이터:', project);

        const projectCard = `
            <div class="project-card" data-index="${index}">
                <h5>${project.projectName}</h5>
                <p>${project.projectDescription}</p>
                <small>기술 스택: ${project.techStack.join(', ')}</small>
            </div>
        `;

        // 프로젝트 역할에 따라 각 탭에 추가
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

    // 카드에 클릭 이벤트 추가
    const projectCards = document.querySelectorAll('.project-card');
    projectCards.forEach((card) => {
        const index = card.getAttribute('data-index');
        console.log('이벤트 연결 - 프로젝트 인덱스:', index);
        card.addEventListener('click', () => openProjectPopup(projects[index]));
    });
}


// 페이지 로드 시 실행
window.onload = function () {
    console.log('페이지 로드');
    fetchProjects();
};
