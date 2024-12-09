// 알림 컨테이너
const notificationsContainer = document.getElementById('notifications');

// WebSocket 메시지 수신 처리
function handleNotification(event) {
  const message = JSON.parse(event.data);

  if (message.type === 'applicationNotification') {
    displayNotification(message);
  }
}

// 알림 표시 함수
function displayNotification(message) {
  const newNotification = document.createElement('div');
  newNotification.className = 'notification';

  // 알림 내용 구성
  newNotification.innerHTML = `
    <strong>새 알림</strong><br>
    지원자: ${message.applicantId}<br>
    프로젝트: ${message.projectName}<br>
    역할: ${message.role}<br>
    지원서: ${message.note}<br>
    <button class="delete-notification">삭제</button>
    <hr>
  `;

  // 삭제 버튼 이벤트 추가
  newNotification.querySelector('.delete-notification').onclick = () => {
    newNotification.remove();
  };

  // 알림 추가
  notificationsContainer.prepend(newNotification);
}

// WebSocket 이벤트 리스너 연결 (외부에서 WebSocket 연결 시 호출 필요)
function setupNotificationListener(webSocket) {
  if (!webSocket) {
    console.error('WebSocket 인스턴스가 필요합니다.');
    return;
  }

  // 메시지 수신 이벤트에 handleNotification 연결
  webSocket.onmessage = handleNotification;
}

export { setupNotificationListener };
