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
            <div class="project-card">
                <h5>${project.projectName}</h5>
                <p>${project.projectDescription}</p>
                <small>기술 스택: ${project.techStack.join(', ')}</small>
            </div>
            ${index < projects.length - 1 ? '<div class="divider"></div>' : ''}
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
}
