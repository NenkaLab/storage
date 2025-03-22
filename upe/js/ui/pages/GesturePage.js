/**
 * 제스처 이벤트 페이지
 * 롱클릭, 더블클릭, 스와이프 등의 제스처 이벤트를 테스트합니다.
 */
import BasePage from './BasePage.js';

export default class GesturePage extends BasePage {
  constructor(ui, utils) {
    super(ui, utils);
    this.pageId = 'gesture';
    this.pageTitle = '제스처 이벤트';
  }
  
  /**
   * 페이지 콘텐츠 생성
   * @param {HTMLElement} container - 콘텐츠 컨테이너
   */
  createContent(container) {
    // 설명
    const description = document.createElement('p');
    description.textContent = '롱클릭, 더블클릭, 스와이프 등의 제스처 이벤트를 테스트하세요.';
    container.appendChild(description);
    
    // 테스트 그리드
    const testGrid = document.createElement('div');
    testGrid.className = 'test-grid';
    
    // 롱클릭 테스트
    const longClickItem = document.createElement('div');
    longClickItem.className = 'test-item';
    longClickItem.innerHTML = '<h3>롱클릭 테스트</h3>';
    
    const longClickArea = document.createElement('div');
    longClickArea.className = 'test-area';
    longClickArea.id = 'longClickArea';
    
    const longClickTarget = document.createElement('div');
    longClickTarget.className = 'gesture-target';
    longClickTarget.innerHTML = `
      <span class="material-symbols-outlined">touch_app</span>
      <span>길게 누르기</span>
    `;
    
    longClickArea.appendChild(longClickTarget);
    longClickItem.appendChild(longClickArea);
    
    // 롱클릭 컨트롤
    const longClickControl = this.createControlGroup('감지 시간(ms):');
    const longClickRangeInput = this.createRangeInput(
      'longClickDelay', 200, 2000, 500, 100, 'longClickDelayValue', 'ms'
    );
    longClickControl.appendChild(longClickRangeInput);
    longClickItem.appendChild(longClickControl);
    
    // 더블클릭 테스트
    const doubleClickItem = document.createElement('div');
    doubleClickItem.className = 'test-item';
    doubleClickItem.innerHTML = '<h3>더블클릭 테스트</h3>';
    
    const doubleClickArea = document.createElement('div');
    doubleClickArea.className = 'test-area';
    doubleClickArea.id = 'doubleClickArea';
    
    const doubleClickTarget = document.createElement('div');
    doubleClickTarget.className = 'gesture-target';
    doubleClickTarget.innerHTML = `
      <span class="material-symbols-outlined">touch_app</span>
      <span>빠르게 두 번 누르기</span>
    `;
    
    doubleClickArea.appendChild(doubleClickTarget);
    doubleClickItem.appendChild(doubleClickArea);
    
    // 더블클릭 컨트롤
    const doubleClickControl = this.createControlGroup('감지 간격(ms):');
    const doubleClickRangeInput = this.createRangeInput(
      'doubleClickDelay', 100, 1000, 300, 50, 'doubleClickDelayValue', 'ms'
    );
    doubleClickControl.appendChild(doubleClickRangeInput);
    doubleClickItem.appendChild(doubleClickControl);
    
    // 스와이프 테스트
    const swipeItem = document.createElement('div');
    swipeItem.className = 'test-item span-2';
    swipeItem.innerHTML = '<h3>스와이프 테스트</h3>';
    
    const swipeArea = document.createElement('div');
    swipeArea.className = 'test-area';
    swipeArea.id = 'swipeArea';
    
    const swipeInstruction = document.createElement('div');
    swipeInstruction.className = 'swipe-instruction';
    swipeInstruction.textContent = '이 영역에서 원하는 방향으로 스와이프하세요';
    
    const swipeIndicator = document.createElement('div');
    swipeIndicator.className = 'swipe-direction-indicator hidden';
    swipeIndicator.id = 'swipeDirectionIndicator';
    swipeIndicator.innerHTML = '<span class="material-symbols-outlined">arrow_right_alt</span>';
    
    swipeArea.appendChild(swipeInstruction);
    swipeArea.appendChild(swipeIndicator);
    swipeItem.appendChild(swipeArea);
    
    // 스와이프 임계값 컨트롤
    const swipeThresholdControl = this.createControlGroup('감지 임계값(px):');
    const swipeThresholdInput = this.createRangeInput(
      'swipeThreshold', 10, 200, 50, 5, 'swipeThresholdValue', 'px'
    );
    swipeThresholdControl.appendChild(swipeThresholdInput);
    swipeItem.appendChild(swipeThresholdControl);
    
    // 스와이프 시간 컨트롤
    const swipeTimeoutControl = this.createControlGroup('감지 시간(ms):');
    const swipeTimeoutInput = this.createRangeInput(
      'swipeTimeout', 100, 1000, 300, 50, 'swipeTimeoutValue', 'ms'
    );
    swipeTimeoutControl.appendChild(swipeTimeoutInput);
    swipeItem.appendChild(swipeTimeoutControl);
    
    // 테스트 아이템 추가
    testGrid.appendChild(longClickItem);
    testGrid.appendChild(doubleClickItem);
    testGrid.appendChild(swipeItem);
    
    container.appendChild(testGrid);
    
    // 컨트롤 패널
    const controlPanel = this.createControlPanel();
    const clearButton = this.createButton('clearGestureLog', '로그 지우기');
    controlPanel.appendChild(clearButton);
    container.appendChild(controlPanel);
    
    // 로그 영역
    const logContainer = document.createElement('div');
    logContainer.className = 'log-container';
    
    const logTitle = document.createElement('h3');
    logTitle.textContent = '제스처 로그';
    
    const logArea = document.createElement('div');
    logArea.className = 'log-area';
    logArea.id = 'gestureLog';
    
    logContainer.appendChild(logTitle);
    logContainer.appendChild(logArea);
    
    container.appendChild(logContainer);
    
    // 로그 지우기 버튼 이벤트
    clearButton.addEventListener('click', () => {
      logArea.innerHTML = '';
    });
  }
}