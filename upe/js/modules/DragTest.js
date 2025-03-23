// path : js/modules/DragTest.js

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
      boundedDragStart: null,
      freeDrag: null,
      freeDragStart: null,
      dragEnd: null
    };
    this.freeDragPosition = { x: 0, y: 0 };
    this.inertiaAnimation = null;
    
    // 드래그 관련 상태 관리
    this.dragStates = {
      bounded: {
        initialElementPos: { x: 0, y: 0 },
        grabPoint: { x: 0, y: 0 },
        containerRect: null
      },
      free: {
        initialElementPos: { x: 0, y: 0 },
        grabPoint: { x: 0, y: 0 },
        containerRect: null
      }
    };
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
    // 이전 리스너 제거
    this._removeEventListeners('bounded');
    
    const boundedDraggable = document.getElementById('boundedDraggable');
    const dragBounds = document.getElementById('dragBounds');
    const logArea = document.getElementById('dragLog');
    
    if (!boundedDraggable || !dragBounds || !logArea) {
      console.error('드래그 테스트: 범위 제한 드래그 요소를 찾을 수 없습니다.');
      return;
    }
    
    // 움직일 위치 값 저장
    const movePos = { deltaX : 0, deltaY : 0 };
    
    // 범위 가져오기
    const rangeX = parseInt(document.getElementById('dragRangeX')?.value || 100);
    const rangeY = parseInt(document.getElementById('dragRangeY')?.value || 100);
    
    // 범위 시각화
    dragBounds.style.width = `${rangeX * 2}px`;
    dragBounds.style.height = `${rangeY * 2}px`;
    
    // 드래그 시작 리스너
    this.listenerIds.boundedDragStart = window.unifiedPointerEvents.addEventListener(
      boundedDraggable,
      'dragstart',
      (event) => {
        // 로그 출력
        this.utils.addLogEntry(
          logArea, 
          `범위 제한 드래그 시작 - X: ${Math.round(event.clientX)}, Y: ${Math.round(event.clientY)}`
        );
      },
      { preventDefault: true }
    );
    
    // 드래그 리스너 등록 - range 옵션 사용
    this.listenerIds.boundedDrag = window.unifiedPointerEvents.addEventListener(
      boundedDraggable,
      'drag',
      (event) => {
        
        if (!event.isOutOfBoundsX) {
          movePos.deltaX = event.deltaX;
        } else {
          movePos.deltaX = event.deltaX > 0 ? rangeX : -rangeX;
        }
        if (!event.isOutOfBoundsY) {
          movePos.deltaY = event.deltaY;
        } else {
          movePos.deltaY = event.deltaY > 0 ? rangeY : -rangeY;
        }
        
        // 요소 이동
        boundedDraggable.style.transform = `translate(${movePos.deltaX}px, ${movePos.deltaY}px)`;
        
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
    // 이전 리스너 제거
    this._removeEventListeners('free');
    
    const freeDraggable = document.getElementById('freeDraggable');
    const freeDragArea = document.getElementById('freeDragArea');
    const logArea = document.getElementById('dragLog');
    
    if (!freeDraggable || !freeDragArea || !logArea) {
      console.error('드래그 테스트: 무제한 드래그 요소를 찾을 수 없습니다.');
      return;
    }
    
    // 관성 효과 사용 여부
    const useInertia = document.getElementById('dragInertia')?.checked || false;
    
    // 컨테이너 정보 초기 저장
    this.dragStates.free.containerRect = freeDragArea.getBoundingClientRect();
        
    // dragstart 리스너 추가
    this.listenerIds.freeDragStart = window.unifiedPointerEvents.addEventListener(
      freeDraggable,
      'dragstart',
      (event) => {
        // 컨테이너 정보 실시간 업데이트
        this.dragStates.free.containerRect = freeDragArea.getBoundingClientRect();
        
        // 요소의 현재 위치 정보 가져오기
        const elementRect = freeDraggable.getBoundingClientRect();
        
        // 컨테이너 기준 요소의 초기 위치 저장 (스크롤 오프셋 고려)
        this.dragStates.free.initialElementPos = {
          x: elementRect.left - this.dragStates.free.containerRect.left,
          y: elementRect.top - this.dragStates.free.containerRect.top
        };
        
        // 요소 내에서 그랩 지점 저장 (요소 내 상대 좌표)
        this.dragStates.free.grabPoint = {
          x: event.clientX - elementRect.left,
          y: event.clientY - elementRect.top
        };
        
        // 로그 출력
        this.utils.addLogEntry(
          logArea, 
          `자유 드래그 시작 - 그랩 지점: X=${Math.round(this.dragStates.free.grabPoint.x)}px, Y=${Math.round(this.dragStates.free.grabPoint.y)}px`
        );
      },
      { preventDefault: true }
    );
        
    // 드래그 리스너 등록
    this.listenerIds.freeDrag = window.unifiedPointerEvents.addEventListener(
      freeDraggable,
      'drag',
      (event) => {
        // 컨테이너 정보 실시간 업데이트
        this.dragStates.free.containerRect = freeDragArea.getBoundingClientRect();
        
        // 새 위치 계산 (컨테이너 내 절대 위치)
        const newPosX = event.clientX - this.dragStates.free.containerRect.left - this.dragStates.free.grabPoint.x;
        const newPosY = event.clientY - this.dragStates.free.containerRect.top - this.dragStates.free.grabPoint.y;
        
        // 현재 위치 저장 (관성 효과용)
        this.freeDragPosition.x = newPosX;
        this.freeDragPosition.y = newPosY;
        
        // 요소 이동
        freeDraggable.style.position = 'absolute';
        freeDraggable.style.left = `${newPosX}px`;
        freeDraggable.style.top = `${newPosY}px`;
        freeDraggable.style.transform = 'none'; // transform 제거
        
        // 로그 출력 (이동량이 큰 경우만)
        if (Math.abs(event.deltaX) > 10 || Math.abs(event.deltaY) > 10) {
          const message = `자유 드래그 - X: ${Math.round(newPosX)}px, Y: ${Math.round(newPosY)}px`;
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
    
    // 컨테이너 참조 유지
    const freeDragArea = document.getElementById('freeDragArea');
    
    const animate = (currentTime) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;
      
      // 컨테이너 정보 실시간 업데이트 (스크롤 시에도 정확한 위치 유지)
      if (freeDragArea) {
        this.dragStates.free.containerRect = freeDragArea.getBoundingClientRect();
      }
      
      // 속도 감소
      const dampingFactor = Math.pow(friction, deltaTime / 16);
      vx *= dampingFactor;
      vy *= dampingFactor;
      
      // 위치 업데이트
      this.freeDragPosition.x += vx * deltaTime / 1000;
      this.freeDragPosition.y += vy * deltaTime / 1000;
      
      // 요소 이동 (transform 대신 left/top 사용)
      element.style.left = `${this.freeDragPosition.x}px`;
      element.style.top = `${this.freeDragPosition.y}px`;
      
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
        const boundedDragArea = document.getElementById('boundedDragArea');
        if (boundedDraggable && boundedDragArea) {
          // 현재 컨테이너 크기 가져오기
          const areaRect = boundedDragArea.getBoundingClientRect();
          const elementRect = boundedDraggable.getBoundingClientRect();
          
          // 컨테이너 중앙에 위치
          const centerX = (areaRect.width - elementRect.width) / 2;
          const centerY = (areaRect.height - elementRect.height) / 2;
          
          boundedDraggable.style.position = 'absolute';
          boundedDraggable.style.left = `${centerX}px`;
          boundedDraggable.style.top = `${centerY}px`;
          boundedDraggable.style.transform = 'none';
          boundedDraggable.style.boxShadow = '';
          
          // 드래그 상태 초기화
          this.dragStates.bounded = {
            initialElementPos: { x: centerX, y: centerY },
            grabPoint: { x: elementRect.width / 2, y: elementRect.height / 2 },
            containerRect: areaRect
          };
        }
      });
    }
    
    const resetFreeDrag = document.getElementById('resetFreeDrag');
    if (resetFreeDrag) {
      resetFreeDrag.addEventListener('click', () => {
        const freeDraggable = document.getElementById('freeDraggable');
        const freeDragArea = document.getElementById('freeDragArea');
        if (freeDraggable && freeDragArea) {
          // 현재 컨테이너 크기 가져오기
          const areaRect = freeDragArea.getBoundingClientRect();
          const elementRect = freeDraggable.getBoundingClientRect();
          
          // 컨테이너 중앙에 위치
          const centerX = (areaRect.width - elementRect.width) / 2;
          const centerY = (areaRect.height - elementRect.height) / 2;
          
          freeDraggable.style.position = 'absolute';
          freeDraggable.style.left = `${centerX}px`;
          freeDraggable.style.top = `${centerY}px`;
          freeDraggable.style.transform = 'none';
          
          // 위치 및 드래그 상태 초기화
          this.freeDragPosition = { x: centerX, y: centerY };
          this.dragStates.free = {
            initialElementPos: { x: centerX, y: centerY },
            grabPoint: { x: elementRect.width / 2, y: elementRect.height / 2 },
            containerRect: areaRect
          };
          
          this.stopInertia();
        }
      });
    }
  }
  
  /**
   * 타입지정 등록된 이벤트 리스너 제거
   */
  _removeEventListeners(type) {
    let listenerIds = {};
    if (type === 'bounded') {
      listenerIds = {
        boundedDrag : this.listenerIds.boundedDrag,
        boundedDragStart : this.listenerIds.boundedDragStart
      };
    } else {
      listenerIds = {
        freeDrag : this.listenerIds.freeDrag,
        freeDragStart : this.listenerIds.freeDragStart,
        dragEnd : this.listenerIds.dragEnd
      };
    }
    Object.keys(listenerIds).forEach(key => {
      const id = listenerIds[key];
      if (id !== null) {
        window.unifiedPointerEvents.removeEventListener(id);
        listenerIds[key] = null;
      }
    });
    
    this.listenerIds = {
      ...this.listenerIds,
      ...listenerIds
    };
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
      boundedDragStart: null,
      freeDrag: null,
      freeDragStart: null,
      dragEnd: null
    };
  }
}