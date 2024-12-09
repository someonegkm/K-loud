// WebSocket 연결
let ws;

function connectWebSocket(userPool) {
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
        const userId = cognitoUser.getUsername();
        console.log('User ID:', userId);

        // WebSocket 연결
        const wsUrl = `wss://tt2qh0upm2.execute-api.ap-northeast-2.amazonaws.com/prod/?userId=${userId}`;
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