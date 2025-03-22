/**
 * 드래그 이벤트 페이지
 * 범위 제한 및 무제한 드래그 이벤트를 테스트합니다.
 */
import BasePage from './BasePage.js';

export default class DragPage extends BasePage {
  constructor(ui, utils) {
    super(ui, utils);
    this.pageId = 'drag';
    this.pageTitle = '드래그 이벤트';
  }
  
  /**
   * 페이지 콘텐츠 생성
   * @param {HTMLElement} container - 콘텐츠 컨테이너
   */
  createContent(container) {
    // 설명
    const description = document.createElement('p');
    description.textContent = '범위 제한 및 무제한 드래그 기능을 테스트하세요.';
    container.appendChild(description);
    
    // 테스트 그리드
    const testGrid = document.createElement('div');
    testGrid.className = 'test-grid';
    
    // 범위 제한 드래그
    const boundedDragItem = document.createElement('div');
    boundedDragItem.className = 'test-item span-2';
    boundedDragItem.innerHTML = '<h3>범위 제한 드래그</h3>';
    
    const boundedDragArea = document.createElement('div');
    boundedDragArea.className = 'test-area bounded-drag-container';
    boundedDragArea.id = 'boundedDragArea';
    
    const dragBounds = document.createElement('div');
    dragBounds.className = 'drag-bounds';
    dragBounds.id = 'dragBounds';
    
    const boundedDraggable = document.createElement('div');
    boundedDraggable.className = 'draggable-element';
    boundedDraggable.id = 'boundedDraggable';
    boundedDraggable.innerHTML = `
      <span class="material-symbols-outlined">drag_indicator</span>
      <span>제한 드래그</span>
    `;
    
    boundedDragArea.appendChild(dragBounds);
    boundedDragArea.appendChild(boundedDraggable);
    boundedDragItem.appendChild(boundedDragArea);
    
    // X축 범위 컨트롤
    const xRangeControl = this.createControlGroup('X축 범위(px):');
    const xRangeInput = this.createRangeInput(
      'dragRangeX', 20, 200, 100, 10, 'dragRangeXValue', '±px'
    );
    xRangeControl.appendChild(xRangeInput);
    boundedDragItem.appendChild(xRangeControl);
    
    // Y축 범위 컨트롤
    const yRangeControl = this.createControlGroup('Y축 범위(px):');
    const yRangeInput = this.createRangeInput(
      'dragRangeY', 20, 200, 100, 10, 'dragRangeYValue', '±px'
    );
    yRangeControl.appendChild(yRangeInput);
    boundedDragItem.appendChild(yRangeControl);
    
    // 초기화 버튼
    const resetBoundedDragBtn = this.createButton('resetBoundedDrag', '위치 초기화');
    boundedDragItem.appendChild(resetBoundedDragBtn);
    
    // 무제한 드래그
    const freeDragItem = document.createElement('div');
    freeDragItem.className = 'test-item span-2';
    freeDragItem.innerHTML = '<h3>무제한 드래그</h3>';
    
    const freeDragArea = document.createElement('div');
    freeDragArea.className = 'test-area free-drag-container';
    freeDragArea.id = 'freeDragArea';
    
    const freeDraggable = document.createElement('div');
    freeDraggable.className = 'draggable-element';
    freeDraggable.id = 'freeDraggable';
    freeDraggable.innerHTML = `
      <span class="material-symbols-outlined">drag_indicator</span>
      <span>무제한 드래그</span>
    `;
    
    freeDragArea.appendChild(freeDraggable);
    freeDragItem.appendChild(freeDragArea);
    
    // 관성 효과 체크박스
    const inertiaControl = this.createControlGroup();
    const inertiaCheckbox = this.createCheckbox('dragInertia', '관성 효과 사용', true);
    inertiaControl.appendChild(inertiaCheckbox);
    freeDragItem.appendChild(inertiaControl);
    
    // 초기화 버튼
    const resetFreeDragBtn = this.createButton('resetFreeDrag', '위치 초기화');
    freeDragItem.appendChild(resetFreeDragBtn);
    
    // 그리드에 아이템 추가
    testGrid.appendChild(boundedDragItem);
    testGrid.appendChild(freeDragItem);
    
    container.appendChild(testGrid);
    
    // 컨트롤 패널
    const controlPanel = this.createControlPanel();
    const clearButton = this.createButton('clearDragLog', '로그 지우기');
    controlPanel.appendChild(clearButton);
    container.appendChild(controlPanel);
    
    // 로그 영역
    const logContainer = document.createElement('div');
    logContainer.className = 'log-container';
    
    const logTitle = document.createElement('h3');
    logTitle.textContent = '드래그 로그';
    
    const logArea = document.createElement('div');
    logArea.className = 'log-area';
    logArea.id = 'dragLog';
    
    logContainer.appendChild(logTitle);
    logContainer.appendChild(logArea);
    
    container.appendChild(logContainer);
    
    // 이벤트 리스너
    clearButton.addEventListener('click', () => {
      logArea.innerHTML = '';
    });
    
    resetBoundedDragBtn.addEventListener('click', () => {
      boundedDraggable.style.transform = 'translate(-50%, -50%)';
      boundedDraggable.style.boxShadow = '';
    });
    
    resetFreeDragBtn.addEventListener('click', () => {
      freeDraggable.style.transform = 'translate(-50%, -50%)';
    });
  }
}