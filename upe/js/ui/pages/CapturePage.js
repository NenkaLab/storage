/**
 * 포인터 캡처 페이지
 * setPointerCapture API를 테스트합니다.
 */
import BasePage from './BasePage.js';

export default class CapturePage extends BasePage {
  constructor(ui, utils) {
    super(ui, utils);
    this.pageId = 'capture';
    this.pageTitle = '포인터 캡처';
  }
  
  /**
   * 페이지 콘텐츠 생성
   * @param {HTMLElement} container - 콘텐츠 컨테이너
   */
  createContent(container) {
    // 설명
    const description = document.createElement('p');
    description.textContent = 'setPointerCapture와 releasePointerCapture API 기능을 테스트합니다.';
    container.appendChild(description);
    
    // 캡처 테스트 컨테이너
    const captureTestContainer = document.createElement('div');
    captureTestContainer.className = 'capture-test-container';
    
    // 캡처 영역
    const captureArea = document.createElement('div');
    captureArea.className = 'capture-area';
    captureArea.id = 'captureArea';
    
    // 캡처 지침
    const captureInstruction = document.createElement('div');
    captureInstruction.className = 'capture-instruction';
    captureInstruction.textContent = '이 영역 밖으로 포인터가 나가도 이벤트가 계속 추적됩니다';
    
    // 캡처 요소
    const captureElement = document.createElement('div');
    captureElement.className = 'capture-element';
    captureElement.id = 'captureElement';
    captureElement.innerHTML = `
      <span class="material-symbols-outlined">touch_app</span>
      <span>여기를 드래그</span>
    `;
    
    // 캡처 상태
    const captureStatus = document.createElement('div');
    captureStatus.className = 'capture-status';
    captureStatus.id = 'captureStatus';
    captureStatus.textContent = '포인터 캡처: 비활성';
    
    captureArea.appendChild(captureInstruction);
    captureArea.appendChild(captureElement);
    captureArea.appendChild(captureStatus);
    
    captureTestContainer.appendChild(captureArea);
    
    // 컨트롤 패널
    const controlPanel = this.createControlPanel();
    
    // 포인터 캡처 체크박스
    const captureCheckbox = this.createCheckbox('usePointerCapture', '포인터 캡처 사용', true);
    controlPanel.appendChild(captureCheckbox);
    
    // 캡처 이벤트 표시 체크박스
    const eventsCheckbox = this.createCheckbox('showCaptureEvents', '캡처 이벤트 표시', true);
    controlPanel.appendChild(eventsCheckbox);
    
    // 로그 지우기 버튼
    const clearButton = this.createButton('clearCaptureLog', '로그 지우기');
    controlPanel.appendChild(clearButton);
    
    captureTestContainer.appendChild(controlPanel);
    
    // 로그 영역
    const logContainer = document.createElement('div');
    logContainer.className = 'log-container';
    
    const logTitle = document.createElement('h3');
    logTitle.textContent = '캡처 이벤트 로그';
    
    const logArea = document.createElement('div');
    logArea.className = 'log-area';
    logArea.id = 'captureLog';
    
    logContainer.appendChild(logTitle);
    logContainer.appendChild(logArea);
    
    captureTestContainer.appendChild(logContainer);
    
    container.appendChild(captureTestContainer);
    
    // 로그 지우기 버튼 이벤트
    clearButton.addEventListener('click', () => {
      logArea.innerHTML = '';
    });
  }
}