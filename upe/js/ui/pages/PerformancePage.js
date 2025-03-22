/**
 * 성능 테스트 페이지
 * 이벤트 처리 성능 및 메모리 사용량을 테스트합니다.
 */
import BasePage from './BasePage.js';

export default class PerformancePage extends BasePage {
  constructor(ui, utils) {
    super(ui, utils);
    this.pageId = 'performance';
    this.pageTitle = '성능 테스트';
  }
  
  /**
   * 페이지 콘텐츠 생성
   * @param {HTMLElement} container - 콘텐츠 컨테이너
   */
  createContent(container) {
    // 설명
    const description = document.createElement('p');
    description.textContent = '이벤트 처리 성능 및 메모리 사용량을 테스트합니다.';
    container.appendChild(description);
    
    // 성능 테스트 컨테이너
    const performanceContainer = document.createElement('div');
    performanceContainer.className = 'performance-container';
    
    // 성능 지표
    const metricsContainer = document.createElement('div');
    metricsContainer.className = 'performance-metrics';
    
    // 리스너 수 카드
    const listenerCard = document.createElement('div');
    listenerCard.className = 'metric-card';
    listenerCard.innerHTML = `
      <h3>활성 리스너</h3>
      <div class="metric-value" id="listenerCount">0</div>
    `;
    metricsContainer.appendChild(listenerCard);
    
    // 이벤트 처리 시간 카드
    const processingCard = document.createElement('div');
    processingCard.className = 'metric-card';
    processingCard.innerHTML = `
      <h3>이벤트 처리 시간</h3>
      <div class="metric-value" id="processingTime">0ms</div>
    `;
    metricsContainer.appendChild(processingCard);
    
    // 메모리 사용량 카드
    const memoryCard = document.createElement('div');
    memoryCard.className = 'metric-card';
    memoryCard.innerHTML = `
      <h3>메모리 사용량</h3>
      <div class="metric-value" id="memoryUsage">측정 불가</div>
    `;
    metricsContainer.appendChild(memoryCard);
    
    performanceContainer.appendChild(metricsContainer);
    
    // 성능 테스트 컨트롤
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'performance-controls';
    
    // 리스너 수 입력
    const listenerGroup = this.createControlGroup('생성할 리스너 수:');
    const listenerInput = document.createElement('input');
    listenerInput.type = 'number';
    listenerInput.id = 'listenerAmount';
    listenerInput.min = '1';
    listenerInput.max = '1000';
    listenerInput.value = '100';
    listenerGroup.appendChild(listenerInput);
    controlsContainer.appendChild(listenerGroup);
    
    // 버튼 그룹
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'performance-buttons';
    
    // 리스너 생성 버튼
    const createBtn = this.createButton('createListeners', '리스너 생성');
    buttonsContainer.appendChild(createBtn);
    
    // 리스너 제거 버튼
    const removeBtn = this.createButton('removeListeners', '리스너 제거', 'secondary');
    buttonsContainer.appendChild(removeBtn);
    
    // 스트레스 테스트 버튼
    const stressBtn = this.createButton('stressTest', '스트레스 테스트');
    buttonsContainer.appendChild(stressBtn);
    
    controlsContainer.appendChild(buttonsContainer);
    performanceContainer.appendChild(controlsContainer);
    
    // 스트레스 테스트 영역
    const stressTestArea = document.createElement('div');
    stressTestArea.className = 'stress-test-area';
    stressTestArea.id = 'stressTestArea';
    
    const stressTestTarget = document.createElement('div');
    stressTestTarget.className = 'stress-test-target';
    stressTestTarget.id = 'stressTestTarget';
    stressTestTarget.textContent = '스트레스 테스트 영역';
    
    const stressTestStatus = document.createElement('div');
    stressTestStatus.className = 'stress-test-status';
    stressTestStatus.id = 'stressTestStatus';
    stressTestStatus.textContent = '상태: 대기 중';
    
    stressTestArea.appendChild(stressTestTarget);
    stressTestArea.appendChild(stressTestStatus);
    
    performanceContainer.appendChild(stressTestArea);
    
    container.appendChild(performanceContainer);
    
    // 로그 영역
    const logContainer = document.createElement('div');
    logContainer.className = 'log-container';
    
    const logTitle = document.createElement('h3');
    logTitle.textContent = '성능 로그';
    
    const logArea = document.createElement('div');
    logArea.className = 'log-area';
    logArea.id = 'performanceLog';
    
    logContainer.appendChild(logTitle);
    logContainer.appendChild(logArea);
    
    container.appendChild(logContainer);
  }
}