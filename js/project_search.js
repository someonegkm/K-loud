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
const API_KEY = '0UIrv7NI3lEbgnNwM8YK849jPLKPgaz3idwZys82'; // API 키를 여기에 입력하세요.

// 데이터 가져오기
async function fetchProjects() {
    try {
        const response = await fetch(API_URL, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY // API 키 추가
            },
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
    popupTitle.textContent = project.projectName;
    popupDescription.textContent = project.projectDescription;
    popupTechStack.textContent = project.techStack.join(', ');
    popupType.textContent = project.projectType;
    popupCreated.textContent = project.createdAt;

    // 팝업 표시
    popup.style.display = 'block';

    // 지원하기 버튼 클릭 이벤트
    applyButton.onclick = () => {
        alert(`${project.projectName} 프로젝트에 지원했습니다!`);
        popup.style.display = 'none';
    };
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
    const frontendContainer = document.getElementById('frontend-projects');
    const backendContainer = document.getElementById('backend-projects');
    const designContainer = document.getElementById('design-projects');
    const planningContainer = document.getElementById('planning-projects');

    frontendContainer.innerHTML = '';
    backendContainer.innerHTML = '';
    designContainer.innerHTML = '';
    planningContainer.innerHTML = '';

    projects.forEach((project, index) => {
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

    // 각 프로젝트 카드에 클릭 이벤트 추가
    const projectCards = document.querySelectorAll('.project-card');
    projectCards.forEach((card, index) => {
        card.addEventListener('click', () => openProjectPopup(projects[index]));
    });
}

// 페이지 로드 시 실행
window.onload = function () {
    console.log('페이지 로드');
    fetchProjects();
};
