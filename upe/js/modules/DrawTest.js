/**
 * 드로잉 캔버스 테스트 모듈
 * 포인터 이동을 추적하고 그림을 그릴 수 있는 기능을 제공합니다.
 */
export default class DrawTest {
  /**
   * 생성자
   * @param {UIManager} ui - UI 관리자
   * @param {Utils} utils - 유틸리티 객체
   */
  constructor(ui, utils) {
    this.ui = ui;
    this.utils = utils;
    this.listenerIds = [];
    
    // 캔버스 상태
    this.isDrawing = false;
    this.lastX = 0;
    this.lastY = 0;
    this.ctx = null;
    this.canvas = null;
  }
  
  /**
   * 모듈 초기화
   * 캔버스 및 이벤트 리스너를 설정합니다.
   */
  init() {
    // 이전 리스너 제거
    this.removeEventListeners();
    
    // 캔버스 초기화
    this.initCanvas();
    
    // 이벤트 리스너 설정
    this.setupEventListeners();
    
    // 컨트롤 이벤트 설정
    this.setupControlEvents();
    
    // 윈도우 리사이즈 이벤트
    window.addEventListener('resize', this.handleResize.bind(this));
  }
  
  /**
   * 캔버스 초기화
   */
  initCanvas() {
    this.canvas = document.getElementById('drawingCanvas');
    
    if (!this.canvas) {
      console.error('드로잉 테스트: 캔버스 요소를 찾을 수 없습니다.');
      return;
    }
    
    this.ctx = this.canvas.getContext('2d');
    
    // 캔버스 리사이즈
    this.resizeCanvas();
    
    // 캔버스 초기화
    this.clearCanvas();
  }
  
  /**
   * 캔버스 리사이즈
   */
  resizeCanvas() {
    if (!this.canvas || !this.ctx) return;
    
    // 현재 캔버스 내용 저장
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = this.canvas.width;
    tempCanvas.height = this.canvas.height;
    tempCtx.drawImage(this.canvas, 0, 0);
    
    // 캔버스 크기 조정
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    
    // 컨텍스트 스케일 조정
    this.ctx.scale(dpr, dpr);
    
    // 이전 캔버스 내용 복원
    this.ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height,
                      0, 0, rect.width, rect.height);
  }
  
  /**
   * 캔버스 지우기
   */
  clearCanvas() {
    if (!this.canvas || !this.ctx) return;
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
  
  /**
   * 이벤트 리스너 설정
   */
  setupEventListeners() {
    if (!this.canvas) return;
    
    // 시작 이벤트 리스너
    const startId = window.unifiedPointerEvents.addEventListener(
      this.canvas,
      'start',
      (event) => this.handleDrawStart(event),
      { preventDefault: true }
    );
    this.listenerIds.push(startId);
    
    // 이동 이벤트 리스너
    const moveId = window.unifiedPointerEvents.addEventListener(
      this.canvas,
      'move',
      (event) => this.handleDrawMove(event),
      { preventDefault: true }
    );
    this.listenerIds.push(moveId);
    
    // 종료 이벤트 리스너
    const endId = window.unifiedPointerEvents.addEventListener(
      this.canvas,
      'end',
      (event) => this.handleDrawEnd(event),
      { preventDefault: true }
    );
    this.listenerIds.push(endId);
    
    // 취소 이벤트 리스너
    const cancelId = window.unifiedPointerEvents.addEventListener(
      this.canvas,
      'cancel',
      (event) => this.handleDrawEnd(event),
      { preventDefault: true }
    );
    this.listenerIds.push(cancelId);
  }
  
  /**
   * 컨트롤 이벤트 설정
   */
  setupControlEvents() {
    // 캔버스 지우기 버튼
    const clearCanvasBtn = document.getElementById('clearCanvas');
    if (clearCanvasBtn) {
      clearCanvasBtn.addEventListener('click', () => this.clearCanvas());
    }
  }
  
  /**
   * 드로잉 시작 핸들러
   * @param {Object} event - 통합 포인터 이벤트
   */
  handleDrawStart(event) {
    if (!this.canvas || !this.ctx) return;
    
    const rect = this.canvas.getBoundingClientRect();
    this.lastX = event.clientX - rect.left;
    this.lastY = event.clientY - rect.top;
    this.isDrawing = true;
    
    // 선 스타일 설정
    this.ctx.lineJoin = 'round';
    this.ctx.lineCap = 'round';
    this.ctx.strokeStyle = document.getElementById('lineColor')?.value || '#000000';
    
    // 도구 선택
    const tool = document.querySelector('input[name="drawTool"]:checked')?.value || 'pen';
    if (tool === 'eraser') {
      this.ctx.globalCompositeOperation = 'destination-out';
    } else {
      this.ctx.globalCompositeOperation = 'source-over';
    }
    
    // 포인터 정보 업데이트
    this.updatePointerInfo(event);
  }
  
  /**
   * 드로잉 이동 핸들러
   * @param {Object} event - 통합 포인터 이벤트
   */
  handleDrawMove(event) {
    // 포인터 정보 업데이트 (그리지 않는 중에도)
    this.updatePointerInfo(event);
    
    if (!this.isDrawing || !this.canvas || !this.ctx) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // 선 그리기
    this.ctx.beginPath();
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(x, y);
    
    // 압력 감도
    const usePressure = document.getElementById('usePressure')?.checked || false;
    if (usePressure && event.pressure > 0) {
      this.ctx.lineWidth = parseInt(document.getElementById('lineWidth')?.value || 5) * (event.pressure * 2);
    } else {
      this.ctx.lineWidth = parseInt(document.getElementById('lineWidth')?.value || 5);
    }
    
    this.ctx.stroke();
    
    this.lastX = x;
    this.lastY = y;
  }
  
  /**
   * 드로잉 종료 핸들러
   * @param {Object} event - 통합 포인터 이벤트
   */
  handleDrawEnd(event) {
    this.isDrawing = false;
    this.updatePointerInfo(event);
  }
  
  /**
   * 포인터 정보 업데이트
   * @param {Object} event - 통합 포인터 이벤트
   */
  updatePointerInfo(event) {
    const pointerPosition = document.getElementById('pointerPosition');
    const pointerType = document.getElementById('pointerType');
    const pointerPressure = document.getElementById('pointerPressure');
    
    if (pointerPosition) {
      pointerPosition.textContent = `x: ${Math.round(event.clientX)}, y: ${Math.round(event.clientY)}`;
    }
    
    if (pointerType) {
      pointerType.textContent = this.utils.pointerTypeToKorean(event.pointerType);
    }
    
    if (pointerPressure) {
      pointerPressure.textContent = event.pressure.toFixed(3);
    }
  }
  
  /**
   * 윈도우 리사이즈 핸들러
   */
  handleResize() {
    this.resizeCanvas();
  }
  
  /**
   * 등록된 이벤트 리스너 제거
   */
  removeEventListeners() {
    this.listenerIds.forEach(id => {
      window.unifiedPointerEvents.removeEventListener(id);
    });
    this.listenerIds = [];
  }
}