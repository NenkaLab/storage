/**
 * 드로잉 캔버스 페이지
 * 포인터 이동을 추적하고 그림을 그릴 수 있는 캔버스를 제공합니다.
 */
import BasePage from './BasePage.js';

export default class DrawPage extends BasePage {
  constructor(ui, utils) {
    super(ui, utils);
    this.pageId = 'draw';
    this.pageTitle = '드로잉 캔버스';
  }
  
  /**
   * 페이지 콘텐츠 생성
   * @param {HTMLElement} container - 콘텐츠 컨테이너
   */
  createContent(container) {
    // 설명
    const description = document.createElement('p');
    description.textContent = '캔버스에서 포인터 이동을 추적하고 그림을 그려보세요.';
    container.appendChild(description);
    
    // 드로잉 컨테이너
    const drawingContainer = document.createElement('div');
    drawingContainer.className = 'drawing-container';
    
    // 캔버스
    const canvas = document.createElement('canvas');
    canvas.id = 'drawingCanvas';
    canvas.width = 800;
    canvas.height = 400;
    
    drawingContainer.appendChild(canvas);
    
    // 드로잉 컨트롤
    const drawingControls = document.createElement('div');
    drawingControls.className = 'drawing-controls';
    
    // 선 두께 컨트롤
    const lineWidthGroup = this.createControlGroup('선 두께:');
    const lineWidthInput = this.createRangeInput(
      'lineWidth', 1, 50, 5, 1, 'lineWidthValue', 'px'
    );
    lineWidthGroup.appendChild(lineWidthInput);
    drawingControls.appendChild(lineWidthGroup);
    
    // 선 색상 컨트롤
    const lineColorGroup = this.createControlGroup('선 색상:');
    const lineColorInput = document.createElement('input');
    lineColorInput.type = 'color';
    lineColorInput.id = 'lineColor';
    lineColorInput.value = '#3366ff';
    lineColorGroup.appendChild(lineColorInput);
    drawingControls.appendChild(lineColorGroup);
    
    // 도구 선택 컨트롤
    const toolGroup = this.createControlGroup('도구:');
    const toolRadio = this.createRadioGroup('drawTool', [
      { value: 'pen', label: '펜', checked: true },
      { value: 'eraser', label: '지우개' }
    ]);
    toolGroup.appendChild(toolRadio);
    drawingControls.appendChild(toolGroup);
    
    // 압력 감지 체크박스
    const pressureGroup = this.createControlGroup();
    const pressureCheckbox = this.createCheckbox('usePressure', '압력 감지 사용', true);
    pressureGroup.appendChild(pressureCheckbox);
    drawingControls.appendChild(pressureGroup);
    
    // 캔버스 지우기 버튼
    const clearCanvasBtn = this.createButton('clearCanvas', '캔버스 지우기');
    drawingControls.appendChild(clearCanvasBtn);
    
    drawingContainer.appendChild(drawingControls);
    container.appendChild(drawingContainer);
    
    // 포인터 정보 표시
    const pointerInfoContainer = document.createElement('div');
    pointerInfoContainer.className = 'pointer-info-container';
    
    const pointerInfoTitle = document.createElement('h3');
    pointerInfoTitle.textContent = '포인터 정보';
    
    const pointerInfo = document.createElement('div');
    pointerInfo.className = 'pointer-info';
    pointerInfo.id = 'pointerInfo';
    
    // 위치 정보
    const positionInfo = document.createElement('div');
    positionInfo.className = 'info-item';
    positionInfo.innerHTML = '<span class="info-label">위치:</span><span class="info-value" id="pointerPosition">x: 0, y: 0</span>';
    pointerInfo.appendChild(positionInfo);
    
    // 포인터 유형 정보
    const typeInfo = document.createElement('div');
    typeInfo.className = 'info-item';
    typeInfo.innerHTML = '<span class="info-label">포인터 유형:</span><span class="info-value" id="pointerType">없음</span>';
    pointerInfo.appendChild(typeInfo);
    
    // 압력 정보
    const pressureInfo = document.createElement('div');
    pressureInfo.className = 'info-item';
    pressureInfo.innerHTML = '<span class="info-label">압력:</span><span class="info-value" id="pointerPressure">0</span>';
    pointerInfo.appendChild(pressureInfo);
    
    pointerInfoContainer.appendChild(pointerInfoTitle);
    pointerInfoContainer.appendChild(pointerInfo);
    
    container.appendChild(pointerInfoContainer);
  }
}