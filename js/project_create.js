// UUID 생성 함수
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// 날짜 및 시간 형식 변환 함수
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// 필요한 역할 수집 함수 (선택된 버튼의 데이터-role 속성 값 수집)
function getSelectedRoles() {
    const selectedRoles = [];
    document.querySelectorAll('.role-button.active').forEach((button) => {
        selectedRoles.push(button.getAttribute('data-role'));
    });
    return selectedRoles;
}

// 역할 버튼 클릭 이벤트 추가
document.querySelectorAll('.role-button').forEach((button) => {
    button.addEventListener('click', () => {
        button.classList.toggle('active'); // 활성화 상태 토글
    });
});

// 페이지 로드 시 사용자 ID 자동 설정
function setOwnerIdField() {
    const cognitoUser = userPool.getCurrentUser(); // 현재 사용자 가져오기

    if (!cognitoUser) {
        console.error('사용자가 로그인하지 않았습니다.');
        alert('로그인이 필요합니다. 로그인 페이지로 이동합니다.');
        window.location.href = 'login.html';
        return;
    }

    // 사용자 세션 확인
    cognitoUser.getSession((err, session) => {
        if (err || !session.isValid()) {
            console.error('세션이 유효하지 않습니다:', err);
            alert('세션이 만료되었습니다. 다시 로그인해주세요.');
            window.location.href = 'login.html';
            return;
        }

        // `username`을 가져와 `ownerId` 필드에 설정
        userId = cognitoUser.getUsername();
        console.log('현재 사용자 ID:', userId);

        const ownerIdField = document.getElementById('ownerId');
        if (ownerIdField) {
            ownerIdField.value = userId;
        }
    });
}

// 방 저장하기 버튼 클릭 이벤트
document.getElementById('saveProjectButton').addEventListener('click', async function () {
    // 입력된 값 가져오기
    const projectName = document.getElementById('projectName').value.trim();
    const projectDescription = document.getElementById('projectDescription').value.trim();
    const ownerId = document.getElementById('ownerId').value.trim(); // 자동으로 채워진 값 사용
    const techStack = document.getElementById('techStack').value.trim();
    const projectType = document.getElementById('projectType').value.trim();
    const maxTeamSize = parseInt(document.getElementById('maxTeamSize').value, 10);
    const projectDuration = parseInt(document.getElementById('projectDuration').value, 10);
    const roles = getSelectedRoles();

    const fields = { projectName, projectDescription, techStack, projectType, maxTeamSize, projectDuration };
    if (!validateFields(fields)) return;

    if (roles.length !== maxTeamSize) {
        alert(`모집 인원(${maxTeamSize})과 선택된 역할(${roles.length})의 수가 같아야 합니다.`);
        return;
    }

    // 유저 닉네임 가져오기
    const cognitoUser = userPool.getCurrentUser();
    let ownerName = '';
    if (cognitoUser) {
        ownerName = await new Promise((resolve) => {
            cognitoUser.getSession((err, session) => {
                if (!err && session.isValid()) {
                    const idToken = session.getIdToken().getJwtToken();
                    const payload = JSON.parse(atob(idToken.split('.')[1]));
                    const name = payload.name || '알 수 없음';
                    resolve(name);
                } else {
                    resolve('알 수 없음');
                }
            });
        });
    }

    // 프로젝트 데이터 생성
    const projectData = {
        projectId: generateUUID(),
        projectName,
        projectDescription,
        ownerId,
        ownerName: decodeURIComponent(escape(ownerName)), // 한글 UTF-8 처리
        techStack: techStack.split(',').map(s => s.trim()),
        projectType,
        maxTeamSize,
        projectDuration,
        roles,
        createdAt: formatDate(new Date()),
    };

    console.log('프로젝트 데이터:', JSON.stringify(projectData, null, 2));

    // API 호출
    try {
        const response = await fetch('https://d2miwwhvzmngyp.cloudfront.net/prod/createproject', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8',
                Authorization: `Bearer ${localStorage.getItem('idToken')}`,
            },
            body: JSON.stringify(projectData),
        });

        if (response.ok) {
            alert('프로젝트 생성이 완료되었습니다!');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        } else {
            throw new Error('프로젝트 생성 실패');
        }
    } catch (error) {
        console.error('API 요청 실패:', error);
        alert('프로젝트 생성 중 문제가 발생했습니다.');
    }
});

// 필드 검증 함수
function validateFields(fields) {
    const { projectName, projectDescription, techStack, projectType, maxTeamSize, projectDuration } = fields;

    if (!projectName) {
        alert('프로젝트 이름을 입력하세요.');
        return false;
    }

    if (!projectDescription) {
        alert('프로젝트 설명을 입력하세요.');
        return false;
    }

    if (!techStack) {
        alert('기술 스택을 입력하세요.');
        return false;
    }

    if (!projectType) {
        alert('프로젝트 유형을 선택하세요.');
        return false;
    }

    if (!maxTeamSize || isNaN(maxTeamSize) || maxTeamSize <= 0) {
        alert('유효한 모집 인원을 입력하세요.');
        return false;
    }

    if (!projectDuration || isNaN(projectDuration) || projectDuration <= 0) {
        alert('유효한 프로젝트 소요 기간을 입력하세요.');
        return false;
    }

    return true; // 모든 필드가 유효하면 true 반환
}

