// API Gateway URL
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

// 프로젝트 렌더링
function renderProjects(projects) {
    // 각 카테고리의 컨테이너 가져오기
    const frontendContainer = document.getElementById('frontend-projects');
    const backendContainer = document.getElementById('backend-projects');
    const designContainer = document.getElementById('design-projects');
    const planningContainer = document.getElementById('planning-projects');

    // 초기화
    frontendContainer.innerHTML = '';
    backendContainer.innerHTML = '';
    designContainer.innerHTML = '';
    planningContainer.innerHTML = '';

    // 데이터 렌더링
    projects.forEach(project => {
        const projectCard = `
            <div class="project-card">
                <h5>${project.projectName}</h5>
                <p>${project.projectDescription}</p>
                <small>기술 스택: ${project.techStack.join(', ')}</small>
            </div>
        `;

        // 카테고리에 따라 추가
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
}

// 페이지 로드 시 실행
window.onload = function () {
    fetchProjects();
};
