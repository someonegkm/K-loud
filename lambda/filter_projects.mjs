const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const USER_TABLE = process.env.USER_TABLE || 'UserProfiles_KY';
const PROJECT_TABLE = process.env.PROJECT_TABLE || 'ProjectRooms_KY';

exports.handler = async (event) => {
  // event.body로 userId를 받는다고 가정
  let body;
  if (event.body) {
    body = JSON.parse(event.body);
  } else {
    body = {};
  }

  const userId = body.userId;
  if (!userId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "userId is required" })
    };
  }

  // 유저 정보 조회
  const userRes = await dynamodb.get({
    TableName: USER_TABLE,
    Key: { UserID: userId }
  }).promise();

  const userItem = userRes.Item || {};
  const userPreferencesRaw = userItem['user-project-preference'] || '';
  const userTechStackRaw = userItem['user-techstack'] || '';

  const userPreferences = typeof userPreferencesRaw === 'string'
    ? userPreferencesRaw.split(',').map(s => s.trim()).filter(Boolean)
    : (Array.isArray(userPreferencesRaw) ? userPreferencesRaw : []);

  const userTechStack = typeof userTechStackRaw === 'string'
    ? userTechStackRaw.split(',').map(s => s.trim()).filter(Boolean)
    : (Array.isArray(userTechStackRaw) ? userTechStackRaw : []);

  // 프로젝트 전체 조회 (초기 구현: scan)
  const projectRes = await dynamodb.scan({ TableName: PROJECT_TABLE }).promise();
  const allProjects = projectRes.Items || [];

  const filteredProjects = allProjects.filter(p => {
    const p_type = p.projectType || '';
    const p_techstack = Array.isArray(p.techStack) ? p.techStack : [];
    return userPreferences.includes(p_type) && p_techstack.some(stack => userTechStack.includes(stack));
  });

  return {
    statusCode: 200,
    body: JSON.stringify(filteredProjects)
  };
};
