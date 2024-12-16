// WebSocket 연결
let ws;
let userName = null; // 사용자 이름을 저장할 전역 변수

// 알림 표시 함수
function showNotification(messageContent) {
    const notificationContainer = document.getElementById('notification-container');

    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.style.cssText = `
        background-color: #f8f9fa;
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 10px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        transition: opacity 0.3s ease-out;
    `;
    notification.innerHTML = `
        <strong>프로젝트 알림</strong><br>
        ${messageContent}
        <button style="float: right; background: none; border: none; color: #007bff; cursor: pointer;">닫기</button>
    `;

    // 닫기 버튼 이벤트 추가
    const closeButton = notification.querySelector('button');
    closeButton.addEventListener('click', () => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300); // 애니메이션 후 제거
    });

    notificationContainer.appendChild(notification);

    // 자동으로 알림 제거 (5초 후)
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// WebSocket 연결 함수
function connectWebSocket(userPool) {
    let cognitoUser = userPool.getCurrentUser();
    console.log('현재 사용자:', cognitoUser);

    // getCurrentUser()가 null일 경우 세션 복구 시도
    if (!cognitoUser) {
        console.warn('사용자가 로그인하지 않았습니다.');
        const idToken = localStorage.getItem('idToken');
        const accessToken = localStorage.getItem('accessToken');

        if (!idToken || !accessToken) {
            console.error('토큰이 없습니다. 로그인이 필요합니다.');
            return;
        }

        console.log('로컬 스토리지에서 토큰을 가져와 세션을 복원합니다.');

        // ID 토큰 디코딩하여 sub 또는 username 추출
        const decodedToken = JSON.parse(atob(idToken.split('.')[1])); // JWT 디코딩
        const userIdFromToken = decodedToken['cognito:username'] || decodedToken['sub'];

        console.log('토큰에서 가져온 사용자 ID:', userIdFromToken);

        cognitoUser = new AmazonCognitoIdentity.CognitoUser({
            Username: userIdFromToken, // 디코딩된 사용자 ID 사용
            Pool: userPool,
        });

        // 세션 설정
        cognitoUser.setSignInUserSession(
            new AmazonCognitoIdentity.CognitoUserSession({
                IdToken: new AmazonCognitoIdentity.CognitoIdToken({ IdToken: idToken }),
                AccessToken: new AmazonCognitoIdentity.CognitoAccessToken({ AccessToken: accessToken }),
                RefreshToken: new AmazonCognitoIdentity.CognitoRefreshToken({ RefreshToken: '' }),
            })
        );
    }

    // 세션 확인 및 WebSocket 연결
    cognitoUser.getSession((err, session) => {
        if (err) {
            console.error('세션을 가져오는 중 오류 발생:', err);
            return;
        }

        if (session.isValid()) {
            // 사용자 ID 추출 (ID 토큰에서 가져옴)
            const idToken = session.getIdToken().getJwtToken();
            const decodedToken = JSON.parse(atob(idToken.split('.')[1]));
            const userId = decodedToken['cognito:username'] || decodedToken['sub'];

            console.log('WebSocket 연결을 위한 사용자 ID:', userId);

            // WebSocket 연결
            const wsUrl = `wss://fds9jyxgw7.execute-api.ap-northeast-2.amazonaws.com/prod/?userId=${userId}`;
            const ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                console.log('WebSocket 연결 성공');
            };

            ws.onmessage = (event) => {
                console.log('서버로부터 받은 메시지:', event.data);
                const message = JSON.parse(event.data);

                if (message.type === 'applicationNotification') {
                    showNotification(`
                        지원자: ${message.applicantId}<br>
                        프로젝트: ${message.projectName}<br>
                        역할: ${message.role}<br>
                    `);
                }
            };

            ws.onclose = (event) => {
                console.log('WebSocket 연결이 종료되었습니다. 코드:', event.code, '이유:', event.reason);
            };

            ws.onerror = (event) => {
                console.error('WebSocket 에러 발생:', event);
            };
        } else {
            console.error('세션이 유효하지 않습니다.');
        }
    });
}


// 알림 컨테이너 추가 (HTML에 없을 경우 추가)
document.addEventListener('DOMContentLoaded', () => {
    let notificationContainer = document.getElementById('notification-container');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        notificationContainer.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            max-width: 300px;
        `;
        document.body.appendChild(notificationContainer);
    }
});
