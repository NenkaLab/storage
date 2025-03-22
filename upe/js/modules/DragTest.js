/**
 * 드래그 이벤트 테스트 모듈
 * 범위 제한 및 무제한 드래그 이벤트를 처리합니다.
 */
export default class DragTest {
  /**
   * 생성자
   * @param {UIManager} ui - UI 관리자
   * @param {Utils} utils - 유틸리티 객체
   */
  constructor(ui, utils) {
    this.ui = ui;
    this.utils = utils;
    this.listenerIds = {
      boundedDrag: null,
      freeDrag: null,
      dragEnd: null
    };
    this.freeDragPosition = { x: 0, y: 0 };
    this.inertiaAnimation = null;
  }
  
  /**
   * 모듈 초기화
   * 이벤트 리스너를 설정합니다.
   */
  init() {
    // 이전 리스너 제거
    this.removeEventListeners();
    
    // 관성 효과 중지
    this.stopInertia();
    
    // 범위 제한 드래그 초기화
    this.initBoundedDrag();
    
    // 무제한 드래그 초기화
    this.initFreeDrag();
    
    // 파라미터 변경 이벤트 리스너
    this.setupControlEvents();
  }
  
  /**
   * 범위 제한 드래그 초기화
   */
  initBoundedDrag() {
    const boundedDraggable = document.getElementById('boundedDraggable');
    const dragBounds = document.getElementById('dragBounds');
    const logArea = document.getElementById('dragLog');
    
    if (!boundedDraggable || !dragBounds || !logArea) {
      console.error('드래그 테스트: 범위 제한 드래그 요소를 찾을 수 없습니다.');
      return;
    }
    
    // 범위 가져오기
    const rangeX = parseInt(document.getElementById('dragRangeX')?.value || 100);
    const rangeY = parseInt(document.getElementById('dragRangeY')?.value || 100);
    
    // 범위 시각화
    dragBounds.style.width = `${rangeX * 2}px`;
    dragBounds.style.height = `${rangeY * 2}px`;
    
    // 드래그 리스너 등록
    this.listenerIds.boundedDrag = window.unifiedPointerEvents.addEventListener(
      boundedDraggable,
      'drag',
      (event) => {
        // 요소 이동
        boundedDraggable.style.transform = `translate(calc(-50% + ${event.deltaX}px), calc(-50% + ${event.deltaY}px))`;
        
        // 범위 벗어남 표시
        if (event.isOutOfBounds) {
          boundedDraggable.style.boxShadow = '0 0 0 2px var(--error)';
        } else {
          boundedDraggable.style.boxShadow = '';
        }
        
        // 로그 출력 (이동량이 큰 경우만)
        if (Math.abs(event.deltaX) > 5 || Math.abs(event.deltaY) > 5) {
          const message = `제한 드래그 - X: ${Math.round(event.deltaX)}px, Y: ${Math.round(event.deltaY)}px${event.isOutOfBounds ? ' (범위 초과)' : ''}`;
          this.utils.addLogEntry(logArea, message);
        }
      },
      { 
        range: { x: [-rangeX, rangeX], y: [-rangeY, rangeY] }, 
        keepState: true,
        preventDefault: true
      }
    );
  }
  
  /**
   * 무제한 드래그 초기화
   */
  initFreeDrag() {
    const freeDraggable = document.getElementById('freeDraggable');
    const logArea = document.getElementById('dragLog');
    
    if (!freeDraggable || !logArea) {
      console.error('드래그 테스트: 무제한 드래그 요소를 찾을 수 없습니다.');
      return;
    }
    
    // 관성 효과 사용 여부
    const useInertia = document.getElementById('dragInertia')?.checked || false;
    
    // 드래그 리스너 등록
    this.listenerIds.freeDrag = window.unifiedPointerEvents.addEventListener(
      freeDraggable,
      'drag',
      (event) => {
        // 현재 위치 업데이트
        this.freeDragPosition.x = event.deltaX;
        this.freeDragPosition.y = event.deltaY;
        
        // 요소 이동
        freeDraggable.style.transform = `translate(calc(-50% + ${this.freeDragPosition.x}px), calc(-50% + ${this.freeDragPosition.y}px))`;
        
        // 로그 출력 (이동량이 큰 경우만)
        if (Math.abs(event.deltaX) > 10 || Math.abs(event.deltaY) > 10) {
          const message = `자유 드래그 - X: ${Math.round(event.deltaX)}px, Y: ${Math.round(event.deltaY)}px`;
          this.utils.addLogEntry(logArea, message);
        }
      },
      { preventDefault: true }
    );
    
    // 드래그 종료 리스너 (관성 효과)
    this.listenerIds.dragEnd = window.unifiedPointerEvents.addEventListener(
      freeDraggable,
      'dragend',
      (event) => {
        // 관성 효과를 사용하지 않을 경우
        if (!useInertia) return;
        
        // 드래그 속도 계산
        const duration = event.originalEvent.timeStamp - event.startTime;
        const velocityX = (event.endX - event.startX) / duration * 100;
        const velocityY = (event.endY - event.startY) / duration * 100;
        
        // 속도가 너무 작을 경우 무시
        if (Math.abs(velocityX) < 10 && Math.abs(velocityY) < 10) return;
        
        // 로그 출력
        const message = `드래그 종료 - 속도: X=${velocityX.toFixed(2)}, Y=${velocityY.toFixed(2)}`;
        this.utils.addLogEntry(logArea, message, 'info');
        
        // 관성 효과 시작
        this.applyInertia(freeDraggable, velocityX, velocityY);
      },
      { preventDefault: true }
    );
  }
  
  /**
   * 관성 효과 적용
   * @param {HTMLElement} element - 대상 요소
   * @param {number} velocityX - X축 속도
   * @param {number} velocityY - Y축 속도
   */
  applyInertia(element, velocityX, velocityY) {
    // 이전 관성 효과 중지
    this.stopInertia();
    
    let vx = velocityX;
    let vy = velocityY;
    const friction = 0.95; // 마찰 계수
    let lastTime = performance.now();
    
    const animate = (currentTime) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;
      
      // 속도 감소
      const dampingFactor = Math.pow(friction, deltaTime / 16);
      vx *= dampingFactor;
      vy *= dampingFactor;
      
      // 위치 업데이트
      this.freeDragPosition.x += vx * deltaTime / 1000;
      this.freeDragPosition.y += vy * deltaTime / 1000;
      
      // 요소 이동
      element.style.transform = `translate(calc(-50% + ${this.freeDragPosition.x}px), calc(-50% + ${this.freeDragPosition.y}px))`;
      
      // 속도가 충분히 작아지면 정지
      if (Math.abs(vx) < 0.5 && Math.abs(vy) < 0.5) {
        this.inertiaAnimation = null;
        return;
      }
      
      this.inertiaAnimation = requestAnimationFrame(animate);
    };
    
    this.inertiaAnimation = requestAnimationFrame(animate);
  }
  
  /**
   * 관성 효과 중지
   */
  stopInertia() {
    if (this.inertiaAnimation) {
      cancelAnimationFrame(this.inertiaAnimation);
      this.inertiaAnimation = null;
    }
  }
  
  /**
   * 컨트롤 이벤트 설정
   */
  setupControlEvents() {
    // X축 범위 변경 이벤트
    const dragRangeX = document.getElementById('dragRangeX');
    if (dragRangeX) {
      dragRangeX.addEventListener('input', () => {
        this.initBoundedDrag();
      });
    }
    
    // Y축 범위 변경 이벤트
    const dragRangeY = document.getElementById('dragRangeY');
    if (dragRangeY) {
      dragRangeY.addEventListener('input', () => {
        this.initBoundedDrag();
      });
    }
    
    // 관성 효과 변경 이벤트
    const dragInertia = document.getElementById('dragInertia');
    if (dragInertia) {
      dragInertia.addEventListener('change', () => {
        this.initFreeDrag();
      });
    }
    
    // 위치 초기화 버튼 이벤트
    const resetBoundedDrag = document.getElementById('resetBoundedDrag');
    if (resetBoundedDrag) {
      resetBoundedDrag.addEventListener('click', () => {
        const boundedDraggable = document.getElementById('boundedDraggable');
        if (boundedDraggable) {
          boundedDraggable.style.transform = 'translate(-50%, -50%)';
          boundedDraggable.style.boxShadow = '';
        }
      });
    }
    
    const resetFreeDrag = document.getElementById('resetFreeDrag');
    if (resetFreeDrag) {
      resetFreeDrag.addEventListener('click', () => {
        const freeDraggable = document.getElementById('freeDraggable');
        if (freeDraggable) {
          freeDraggable.style.transform = 'translate(-50%, -50%)';
          this.freeDragPosition = { x: 0, y: 0 };
          this.stopInertia();
        }
      });
    }
  }
  
  /**
   * 등록된 이벤트 리스너 제거
   */
  removeEventListeners() {
    Object.values(this.listenerIds).forEach(id => {
      if (id !== null) {
        window.unifiedPointerEvents.removeEventListener(id);
      }
    });
    
    this.listenerIds = {
      boundedDrag: null,
      freeDrag: null,
      dragEnd: null
    };
  }
}