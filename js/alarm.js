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

  alerts.forEach(alert => {
      const messageContent = alert.messageContent || {};
      const note = messageContent.note || '내용 없음';
      const applicantId = messageContent.applicantId || '알 수 없는 사용자';
      const userId = alert.userId || '알 수 없는 ID'; // userId 활용
      const projectName = messageContent.projectName || '프로젝트 이름 없음';
      const role = messageContent.role || '역할 없음';

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
          <p><strong>User ID:</strong> ${userId}</p> <!-- userId 추가 -->
          <small><strong>시간:</strong> ${timestamp}</small>
      `;

      alertItem.addEventListener('click', () => {
          showPopup(alert);
      });

      container.appendChild(alertItem);
  });
}


function showPopup(alertData) {
  const popup = document.getElementById('application-popup');
  const popupContent = document.getElementById('popup-content');

  const messageContent = alertData.messageContent || {};
  const note = messageContent.note || '내용 없음';
  const applicantId = messageContent.applicantId || '알 수 없는 사용자';
  const projectName = messageContent.projectName || '프로젝트 이름 없음';
  const role = messageContent.role || '역할 없음';
  const userTechStack = alertData.userTechStack || '기술 스택 없음';

  popupContent.innerHTML = `
      <p><strong>프로젝트 이름:</strong> ${projectName}</p>
      <p><strong>지원자:</strong> ${applicantId}</p>
      <p><strong>지원 역할:</strong> ${role}</p>
      <p><strong>기술 스택:</strong> ${userTechStack}</p>
      <p><strong>지원 내용:</strong> ${note}</p>
      <div style="margin-top: 20px; text-align: center;">
          <button id="accept-button" style="margin-right: 10px; background-color: green; color: white; padding: 10px 20px; border: none; border-radius: 4px; font-size: 14px; cursor: pointer;">수락</button>
          <button id="reject-button" style="background-color: red; color: white; padding: 10px 20px; border: none; border-radius: 4px; font-size: 14px; cursor: pointer;">거절</button>
      </div>
  `;

  popup.style.display = 'block';

  // 수락 및 거절 이벤트 연결
  attachAcceptEvent(alertData);
  attachRejectEvent(alertData);
}


// 수락 버튼 클릭 이벤트
function attachAcceptEvent(alertData) {
  const acceptButton = document.getElementById('accept-button');
  acceptButton.onclick = async () => {
      const projectOwnerId = alertData.projectOwnerId; // 방장 ID
      const applicantId = alertData.messageContent.userId; // 지원자 ID

      const API_URL = `https://nglpet7yod.execute-api.ap-northeast-2.amazonaws.com/prod/acceptNotification`;

      try {
          const response = await fetch(API_URL, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                  projectOwnerId: projectOwnerId,
                  applicantId: applicantId,
              }),
          });

          if (!response.ok) throw new Error('지원자 수락에 실패했습니다.');

          // 성공 알림 및 UI 업데이트
          window.alert('지원자가 성공적으로 수락되었습니다!');
          document.getElementById('application-popup').style.display = 'none'; // 팝업 닫기
          fetchUserAlerts(); // 알림 목록 새로고침
      } catch (error) {
          console.error('지원자 수락 중 오류 발생:', error);
          window.alert('지원자 수락 중 문제가 발생했습니다.');
      }
  };
}


// 거절 버튼 클릭 이벤트
function attachRejectEvent(alertData) { // 'alert' 대신 'alertData'로 변경
const rejectButton = document.getElementById('reject-button');
rejectButton.onclick = async () => {
    const projectOwnerId = alertData.projectOwnerId; // 'alert' -> 'alertData'
    const timestamp = alertData.timestamp; // 'alert' -> 'alertData'

    const API_URL = `https://nglpet7yod.execute-api.ap-northeast-2.amazonaws.com/prod/deleteNotification?projectOwnerId=${projectOwnerId}&timestamp=${timestamp}`;

    try {
        const response = await fetch(API_URL, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) throw new Error('알림 삭제에 실패했습니다.');

        // JavaScript 기본 alert 함수 호출
        window.alert('알림이 성공적으로 삭제되었습니다!');
        document.getElementById('application-popup').style.display = 'none'; // 팝업 닫기
        fetchUserAlerts(); // 알림 목록 새로고침
    } catch (error) {
        console.error('알림 삭제 중 오류 발생:', error);
        window.alert('알림 삭제 중 문제가 발생했습니다.');
    }
};
}


// 팝업 닫기 이벤트
document.getElementById('close-popup').addEventListener('click', closePopup);

function closePopup() {
  const popup = document.getElementById('application-popup');
  if (popup) popup.style.display = 'none';
}
