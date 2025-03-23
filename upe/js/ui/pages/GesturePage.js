// path : js/ui/pages/GesturePage.js

/**
 * 제스처 이벤트 페이지
 * 롱클릭, 더블클릭, 스와이프, 핀치 줌, 회전, fling 스크롤 등의 제스처 이벤트를 테스트합니다.
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
    description.textContent = '롱클릭, 더블클릭, 스와이프, 핀치 줌, 회전, fling 스크롤 등의 제스처 이벤트를 테스트하세요.';
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
    
    // Fling 스크롤 테스트
    const flingScrollItem = document.createElement('div');
    flingScrollItem.className = 'test-item span-2';
    flingScrollItem.innerHTML = '<h3>Fling 스크롤 테스트</h3>';
    
    const flingScrollArea = document.createElement('div');
    flingScrollArea.className = 'test-area fling-scroll-container';
    flingScrollArea.id = 'flingScrollArea';
    
    // 스크롤 가능한 컨텐츠 영역
    const scrollContent = document.createElement('div');
    scrollContent.className = 'scroll-content';
    scrollContent.id = 'scrollContent';
    
    // 예시 콘텐츠 추가
    for (let i = 1; i <= 200; i++) {
      const item = document.createElement('div');
      item.className = 'scroll-item';
      item.textContent = `항목 ${i}`;
      scrollContent.appendChild(item);
    }
    
    // 스크롤 위치 인디케이터
    const scrollIndicator = document.createElement('div');
    scrollIndicator.className = 'scroll-indicator';
    scrollIndicator.id = 'scrollIndicator';
    
    flingScrollArea.appendChild(scrollContent);
    flingScrollArea.appendChild(scrollIndicator);
    
    // 스크롤 정보 표시 영역
    const scrollInfo = document.createElement('div');
    scrollInfo.className = 'scroll-info';
    scrollInfo.innerHTML = `
      <span>스크롤 위치: <span id="scrollPosition">0%</span></span>
      <span>스크롤 속도: <span id="scrollVelocity">0</span></span>
    `;
    
    // 리셋 버튼
    const resetScrollBtn = document.createElement('button');
    resetScrollBtn.className = 'action-btn';
    resetScrollBtn.id = 'resetScroll';
    resetScrollBtn.innerHTML = `
      <span class="material-symbols-outlined">restart_alt</span>
      <span>맨 위로</span>
    `;
    
    flingScrollItem.appendChild(flingScrollArea);
    flingScrollItem.appendChild(scrollInfo);
    flingScrollItem.appendChild(resetScrollBtn);
    
    // Pinch Zoom 테스트
    const pinchZoomItem = document.createElement('div');
    pinchZoomItem.className = 'test-item span-2';
    pinchZoomItem.innerHTML = '<h3>핀치 줌 테스트</h3>';
    
    const pinchZoomArea = document.createElement('div');
    pinchZoomArea.className = 'test-area pinch-zoom-container';
    pinchZoomArea.id = 'pinchZoomArea';
    
    // 이미지 업로드 영역
    const imageUploadContainer = document.createElement('div');
    imageUploadContainer.className = 'image-upload-container';
    
    const imageInput = document.createElement('input');
    imageInput.type = 'file';
    imageInput.id = 'imageInput';
    imageInput.accept = 'image/*';
    imageInput.className = 'hidden';
    
    const uploadLabel = document.createElement('label');
    uploadLabel.htmlFor = 'imageInput';
    uploadLabel.className = 'upload-label';
    uploadLabel.innerHTML = `
      <span class="material-symbols-outlined">upload</span>
      <span>이미지 업로드</span>
    `;
    
    const imageContainer = document.createElement('div');
    imageContainer.className = 'image-container';
    imageContainer.id = 'imageContainer';
    
    // 기본 이미지 추가 (간단한 SVG 데이터 URI)
    const svgDefaultImage = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300">
        <rect width="300" height="300" fill="#f0f0f0"/>
        <circle cx="150" cy="150" r="100" fill="#6750a4"/>
        <text x="150" y="155" font-family="Arial" font-size="14" fill="white" text-anchor="middle">핀치로 확대/축소하세요</text>
      </svg>
    `;
    
    const testImage = document.createElement('img');
    testImage.src = `data:image/svg+xml,${encodeURIComponent(svgDefaultImage)}`;
    testImage.id = 'testImage';
    testImage.className = 'test-image';
    testImage.alt = '테스트 이미지';
    
    imageContainer.appendChild(testImage);
    
    // 정보 표시 영역
    const zoomInfo = document.createElement('div');
    zoomInfo.className = 'zoom-info';
    zoomInfo.innerHTML = `
      <span>확대/축소: <span id="zoomFactor">1.0x</span></span>
    `;
    
    // 리셋 버튼
    const resetZoomBtn = document.createElement('button');
    resetZoomBtn.className = 'action-btn';
    resetZoomBtn.id = 'resetZoom';
    resetZoomBtn.innerHTML = `
      <span class="material-symbols-outlined">restart_alt</span>
      <span>리셋</span>
    `;
    
    imageUploadContainer.appendChild(imageInput);
    imageUploadContainer.appendChild(uploadLabel);
    
    pinchZoomArea.appendChild(imageUploadContainer);
    pinchZoomArea.appendChild(imageContainer);
    pinchZoomArea.appendChild(zoomInfo);
    pinchZoomArea.appendChild(resetZoomBtn);
    
    pinchZoomItem.appendChild(pinchZoomArea);
    
    // Rotate 테스트
    const rotateItem = document.createElement('div');
    rotateItem.className = 'test-item span-2';
    rotateItem.innerHTML = '<h3>회전 테스트</h3>';
    
    const rotateArea = document.createElement('div');
    rotateArea.className = 'test-area rotate-container';
    rotateArea.id = 'rotateArea';
    
    const rotateTarget = document.createElement('div');
    rotateTarget.className = 'rotate-target';
    rotateTarget.id = 'rotateTarget';
    rotateTarget.innerHTML = `
      <span class="material-symbols-outlined">multiple_stop</span>
      <span>두 손가락으로 회전하세요</span>
    `;
    
    // 회전 정보 표시 영역
    const rotateInfo = document.createElement('div');
    rotateInfo.className = 'rotate-info';
    rotateInfo.innerHTML = `
      <span>회전 각도: <span id="rotateAngle">0.0°</span></span>
    `;
    
    // 리셋 버튼
    const resetRotateBtn = document.createElement('button');
    resetRotateBtn.className = 'action-btn';
    resetRotateBtn.id = 'resetRotate';
    resetRotateBtn.innerHTML = `
      <span class="material-symbols-outlined">restart_alt</span>
      <span>리셋</span>
    `;
    
    rotateArea.appendChild(rotateTarget);
    rotateArea.appendChild(rotateInfo);
    rotateArea.appendChild(resetRotateBtn);
    
    rotateItem.appendChild(rotateArea);
    
    // 타이거 게임 - 제스처로 플레이하는 간단한 미니게임
    const tigerGameItem = document.createElement('div');
    tigerGameItem.className = 'test-item span-2';
    tigerGameItem.innerHTML = '<h3>제스처 게임</h3>';
    
    const tigerGameArea = document.createElement('div');
    tigerGameArea.className = 'test-area game-container';
    tigerGameArea.id = 'tigerGameArea';
    
    // 게임 지침
    const gameInstruction = document.createElement('div');
    gameInstruction.className = 'game-instruction';
    gameInstruction.textContent = '스와이프 또는 드래그로 타이거를 움직여 목표물을 잡으세요!';
    
    // 게임 캐릭터
    const tigerCharacter = document.createElement('div');
    tigerCharacter.className = 'game-character';
    tigerCharacter.id = 'tigerCharacter';
    tigerCharacter.innerHTML = `
      <span class="material-symbols-outlined">pets</span>
    `;
    
    // 게임 타겟
    const gameTarget = document.createElement('div');
    gameTarget.className = 'game-target';
    gameTarget.id = 'gameTarget';
    gameTarget.innerHTML = `
      <span class="material-symbols-outlined">egg</span>
    `;
    
    // 게임 상태 및 점수
    const gameStatus = document.createElement('div');
    gameStatus.className = 'game-status';
    gameStatus.innerHTML = `
      <div id="gameStatus">더블클릭으로 게임 시작!</div>
      <div class="game-score-container">점수: <span id="gameScore">0</span></div>
    `;
    
    // 리셋 버튼
    const resetGameBtn = document.createElement('button');
    resetGameBtn.className = 'action-btn';
    resetGameBtn.id = 'resetGame';
    resetGameBtn.innerHTML = `
      <span class="material-symbols-outlined">restart_alt</span>
      <span>재시작</span>
    `;
    
    tigerGameArea.appendChild(gameInstruction);
    tigerGameArea.appendChild(tigerCharacter);
    tigerGameArea.appendChild(gameTarget);
    tigerGameArea.appendChild(gameStatus);
    tigerGameArea.appendChild(resetGameBtn);
    
    tigerGameItem.appendChild(tigerGameArea);
    
    tigerGameItem.style.display = 'none';
    
    // 테스트 아이템 추가
    testGrid.appendChild(longClickItem);
    testGrid.appendChild(doubleClickItem);
    testGrid.appendChild(swipeItem);
    testGrid.appendChild(flingScrollItem);
    testGrid.appendChild(pinchZoomItem);
    testGrid.appendChild(rotateItem);
    testGrid.appendChild(tigerGameItem);
    
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