// UUID 생성 함수
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
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

// 방 저장하기 버튼 클릭 이벤트
document.getElementById('saveProjectButton').addEventListener('click', async function() {
    // 입력된 값 가져오기
    const projectName = document.getElementById('projectName').value;
    const projectDescription = document.getElementById('projectDescription').value;
    const ownerId = document.getElementById('ownerId').value;
    const techStack = document.getElementById('techStack').value;
    const projectType = document.getElementById('projectType').value;
    const minExperience = document.getElementById('minExperience').value;

    // 생성 일시와 고유 ID 추가
    const now = new Date();
    const formattedDate = formatDate(now);
    const projectId = generateUUID();

    // JSON 데이터 생성
    const projectData = {
        projectId: projectId,
        projectName: projectName,
        projectDescription: projectDescription,
        ownerId: ownerId,
        techStack: techStack.split(',').map(s => s.trim()),
        projectType: projectType,
        minExperience: parseInt(minExperience, 10),
        createdAt: formattedDate,
    };

    console.log('프로젝트 데이터:', JSON.stringify(projectData, null, 2));

    try {
        // API Gateway로 POST 요청
        const response = await fetch('https://df6x7d34ol.execute-api.ap-northeast-2.amazonaws.com/prod/createproject', { // API Gateway URL을 입력하세요.
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(projectData),
        });

        if (response.ok) {
            const responseData = await response.json();
            console.log('API Gateway 응답:', responseData);

            // 성공 팝업 메시지
            alert('프로젝트 생성이 완료되었습니다!');

            // index.html로 이동
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000); // 1초 후에 이동
        } else {
            console.error('API Gateway 응답 에러:', response.statusText);
            alert('프로젝트 생성 중 문제가 발생했습니다.');
        }
    } catch (error) {
        console.error('API Gateway 요청 실패:', error);
        alert('서버와 통신 중 오류가 발생했습니다.');
    }
});
