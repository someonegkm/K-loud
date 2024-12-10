async function fetchUserAlerts() {
  const cognitoUser = userPool.getCurrentUser();

  if (!cognitoUser) {
      console.error('사용자가 로그인하지 않았습니다.');
      return;
  }

  cognitoUser.getSession(async (err, session) => {
      if (err || !session.isValid()) {
          console.error('세션이 유효하지 않습니다.');
          return;
      }

      const userId = cognitoUser.getUsername();

      const projectOwnerId = userId; // 사용자 ID 가져오기
      const API_URL = `https://nglpet7yod.execute-api.ap-northeast-2.amazonaws.com/prod/getNotifications?projectOwnerId=${projectOwnerId}`;

      try {
          const response = await fetch(API_URL, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
          });

          if (!response.ok) throw new Error('사용자 알림 데이터를 가져오지 못했습니다.');

          const alerts = await response.json();
          renderUserAlerts(alerts);
      } catch (error) {
          console.error('사용자 알림 데이터를 가져오는 중 오류 발생:', error);
      }
  });
}

function renderUserAlerts(alerts) {
  const container = document.getElementById('alert-container');
  container.innerHTML = ''; // 기존 알림 지우기

  if (alerts.length === 0) {
      container.innerHTML = '<p>새로운 알림이 없습니다.</p>';
      return;
  }

  alerts.forEach((alert, index) => {
      const messageContent = alert.messageContent || {}; // messageContent 객체 가져오기
      const note = messageContent.note || '내용 없음';
      const applicantId = messageContent.applicantId || '알 수 없는 사용자';
      const projectName = messageContent.projectName || '프로젝트 이름 없음';
      const role = messageContent.role || '역할 없음';

      // 타임스탬프를 숫자로 변환하여 Date 객체 생성
      const timestamp = new Date(Number(alert.timestamp)).toLocaleString();

      // 알림 항목 생성
      const alertItem = document.createElement('div');
      alertItem.className = 'alert-item';
      alertItem.style.border = '1px solid green';
      alertItem.style.padding = '10px';
      alertItem.style.marginBottom = '10px';
      alertItem.style.cursor = 'pointer';
      alertItem.innerHTML = `
          <p><strong>프로젝트 이름:</strong> ${projectName}</p>
          <p><strong>지원자:</strong> ${applicantId}</p>
          <p><strong>지원 역할:</strong> ${role}</p>
          <small><strong>시간:</strong> ${timestamp}</small>
      `;

      // 클릭 시 상세 지원서 팝업 표시
      alertItem.addEventListener('click', () => {
          showPopup(alert);
      });

      container.appendChild(alertItem);
  });
}

function showPopup(alert) {
  const popup = document.getElementById('application-popup');
  const popupContent = document.getElementById('popup-content');

  const messageContent = alert.messageContent || {};
  const note = messageContent.note || '내용 없음';
  const applicantId = messageContent.applicantId || '알 수 없는 사용자';
  const projectName = messageContent.projectName || '프로젝트 이름 없음';
  const role = messageContent.role || '역할 없음';

  popupContent.innerHTML = `
      <p><strong>프로젝트 이름:</strong> ${projectName}</p>
      <p><strong>지원자:</strong> ${applicantId}</p>
      <p><strong>지원 역할:</strong> ${role}</p>
      <p><strong>지원 메모:</strong> ${note}</p>
  `;

  popup.style.display = 'block';
}

// 팝업 닫기 이벤트
document.getElementById('close-popup').addEventListener('click', () => {
  const popup = document.getElementById('application-popup');
  popup.style.display = 'none';
});
