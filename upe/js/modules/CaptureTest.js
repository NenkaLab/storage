/**
 * 포인터 캡처 테스트 모듈
 * setPointerCapture와 releasePointerCapture API를 테스트합니다.
 */
export default class CaptureTest {
  /**
   * 생성자
   * @param {UIManager} ui - UI 관리자
   * @param {Utils} utils - 유틸리티 객체
   */
  constructor(ui, utils) {
    this.ui = ui;
    this.utils = utils;
    this.listenerIds = [];
    this.activePointerId = null;
    
    // 드래그 상태 관리 추가
    this.dragState = {
      initialElementPos: { x: 0, y: 0 },
      grabPoint: { x: 0, y: 0 },
      containerRect: null
    };
  }
  
  /**
   * 모듈 초기화
   * 이벤트 리스너를 설정합니다.
   */
  init() {
    // 이전 리스너 제거
    this.removeEventListeners();
    
    // 캡처 이벤트 리스너 설정
    this.setupCaptureListeners();
    
    // 컨트롤 이벤트 설정
    this.setupControlEvents();
  }
  
  /**
   * 캡처 이벤트 리스너 설정
   */
  setupCaptureListeners() {
    
    // 이전 리스너 제거
    this.removeEventListeners();
    
    const captureElement = document.getElementById('captureElement');
    const captureArea = document.getElementById('captureArea');
    const captureStatus = document.getElementById('captureStatus');
    const logArea = document.getElementById('captureLog');
    
    if (!captureElement || !captureArea || !captureStatus || !logArea) {
      console.error('캡처 테스트: 필요한 요소를 찾을 수 없습니다.');
      return;
    }
    
    // 캡처 옵션
    const usePtrCapture = document.getElementById('usePointerCapture')?.checked ?? true;
    const showEvents = document.getElementById('showCaptureEvents')?.checked ?? true;
    
    // 컨테이너 정보 저장
    this.dragState.containerRect = captureArea.getBoundingClientRect();
    
    // 초기 위치 설정
    const elementRect = captureElement.getBoundingClientRect();
    // 컨테이너 중앙 위치 계산
    const centerX = (this.dragState.containerRect.width - elementRect.width) / 2;
    const centerY = (this.dragState.containerRect.height - elementRect.height) / 2;
    
    // 스타일 초기화
    captureElement.style.position = 'absolute';
    captureElement.style.left = `${centerX}px`;
    captureElement.style.top = `${centerY}px`;
    captureElement.style.transform = 'none';
    
    // 드래그 시작 리스너
    const dragStartId = window.unifiedPointerEvents.addEventListener(
      captureElement,
      'dragstart',
      (event) => {
        this.activePointerId = event.pointerId;
        
        // 컨테이너 정보 실시간 업데이트 (스크롤 고려)
        this.dragState.containerRect = captureArea.getBoundingClientRect();
        
        // 요소의 현재 위치 정보 가져오기
        const elementRect = captureElement.getBoundingClientRect();
        
        // 요소 내에서 그랩 지점 저장 (요소 내 상대 좌표)
        this.dragState.grabPoint = {
          x: event.clientX - elementRect.left,
          y: event.clientY - elementRect.top
        };
        
        // 로그 출력
        const message = `드래그 시작 - ID: ${this.activePointerId}, 유형: ${this.utils.pointerTypeToKorean(event.pointerType)}, 그랩 지점: X=${Math.round(this.dragState.grabPoint.x)}, Y=${Math.round(this.dragState.grabPoint.y)}`;
        this.utils.addLogEntry(logArea, message, 'info');
        
        // 포인터 캡처 사용 설정
        if (usePtrCapture && 'setPointerCapture' in captureElement) {
          try {
            captureElement.setPointerCapture(this.activePointerId);
            if (showEvents) {
              this.utils.addLogEntry(logArea, `포인터 캡처 요청 - ID: ${this.activePointerId}`, 'info');
            }
          } catch (err) {
            this.utils.addLogEntry(logArea, `포인터 캡처 실패: ${err.message}`, 'error');
          }
        }
      },
      { preventDefault: true }
    );
    this.listenerIds.push(dragStartId);
    
    // 드래그 리스너
    const dragId = window.unifiedPointerEvents.addEventListener(
      captureElement,
      'drag',
      (event) => {
        // 컨테이너 정보 실시간 업데이트 (스크롤 변화 고려)
        this.dragState.containerRect = captureArea.getBoundingClientRect();
        
        // 새 위치 계산 (컨테이너 내 절대 위치)
        // 포인터 위치에서 컨테이너 오프셋과 그랩 포인트를 뺍니다
        const newPosX = event.clientX - this.dragState.containerRect.left - this.dragState.grabPoint.x;
        const newPosY = event.clientY - this.dragState.containerRect.top - this.dragState.grabPoint.y;
        
        // 요소의 크기
        const elementRect = captureElement.getBoundingClientRect();
        const elementWidth = elementRect.width;
        const elementHeight = elementRect.height;
        
        // 컨테이너 크기
        const containerWidth = this.dragState.containerRect.width;
        const containerHeight = this.dragState.containerRect.height;
        
        // 이동 가능한 최대/최소 좌표 (요소가 항상 컨테이너 내에 있도록)
        const maxX = containerWidth - elementWidth;
        const maxY = containerHeight - elementHeight;
        
        // 제한된 좌표 계산
        let limitedX = Math.max(0, Math.min(maxX, newPosX));
        let limitedY = Math.max(0, Math.min(maxY, newPosY));
        
        // 범위 초과 여부
        const isOutOfBounds = (limitedX !== newPosX || limitedY !== newPosY);
        
        // 요소 이동
        captureElement.style.position = 'absolute';
        captureElement.style.left = `${limitedX}px`;
        captureElement.style.top = `${limitedY}px`;
        captureElement.style.transform = 'none'; // transform 제거
        
        // 범위 벗어남 표시
        if (isOutOfBounds) {
          captureElement.style.boxShadow = '0 0 0 2px var(--error)';
        } else {
          captureElement.style.boxShadow = '';
        }
        
        // 로그 출력 (큰 변화만)
        if (Math.abs(event.deltaX) % 20 < 2 || Math.abs(event.deltaY) % 20 < 2) {
          const message = `드래그 중 - X: ${Math.round(limitedX)}px, Y: ${Math.round(limitedY)}px${isOutOfBounds ? ' (범위 초과)' : ''}`;
          if (showEvents) {
            this.utils.addLogEntry(logArea, message);
          }
        }
      },
      { preventDefault: true }
    );
    this.listenerIds.push(dragId);
    
    // 드래그 종료 리스너
    const dragEndId = window.unifiedPointerEvents.addEventListener(
      captureElement,
      'dragend',
      (event) => {
        // 요소의 최종 위치
        const elementRect = captureElement.getBoundingClientRect();
        const finalX = elementRect.left - this.dragState.containerRect.left;
        const finalY = elementRect.top - this.dragState.containerRect.top;
        
        // 로그 출력
        const message = `드래그 종료 - 최종 위치: X=${Math.round(finalX)}px, Y=${Math.round(finalY)}px`;
        this.utils.addLogEntry(logArea, message, 'info');
        
        // 포인터 캡처 해제
        if (usePtrCapture && 'releasePointerCapture' in captureElement && this.activePointerId) {
          try {
            captureElement.releasePointerCapture(this.activePointerId);
            if (showEvents) {
              this.utils.addLogEntry(logArea, `포인터 캡처 해제 - ID: ${this.activePointerId}`, 'info');
            }
          } catch (err) {
            this.utils.addLogEntry(logArea, `포인터 캡처 해제 실패: ${err.message}`, 'error');
          }
        }
        
        this.activePointerId = null;
      },
      { preventDefault: true }
    );
    this.listenerIds.push(dragEndId);
    
    // 캡처 이벤트 리스너 (포인터 캡처 API 이벤트)
    if (showEvents && 'PointerEvent' in window) {
      // 캡처 획득 이벤트
      const gotCaptureHandler = (event) => {
        captureStatus.textContent = '포인터 캡처: 활성';
        captureStatus.classList.add('active');
        this.utils.addLogEntry(logArea, `캡처 획득됨 - ID: ${event.pointerId}`, 'success');
      };
      
      captureElement.addEventListener('gotpointercapture', gotCaptureHandler);
      
      // 캡처 해제 이벤트
      const lostCaptureHandler = (event) => {
        captureStatus.textContent = '포인터 캡처: 비활성';
        captureStatus.classList.remove('active');
        this.utils.addLogEntry(logArea, `캡처 해제됨 - ID: ${event.pointerId}`, 'info');
      };
      
      captureElement.addEventListener('lostpointercapture', lostCaptureHandler);
      
      // 핸들러 추적
      this._captureNativeHandlers = {
        gotCapture: gotCaptureHandler,
        lostCapture: lostCaptureHandler
      };
    }
    
    // 캡처 상태 초기화
    captureStatus.textContent = '포인터 캡처: 비활성';
    captureStatus.classList.remove('active');
    
    // 로그 출력
    this.utils.addLogEntry(logArea, `포인터 캡처 ${usePtrCapture ? '활성화' : '비활성화'}됨`, 'info');
  }
  
  /**
   * 컨트롤 이벤트 설정
   */
  setupControlEvents() {
    // 포인터 캡처 사용 체크박스
    const usePointerCapture = document.getElementById('usePointerCapture');
    if (usePointerCapture) {
      usePointerCapture.addEventListener('change', () => {
        this.setupCaptureListeners();
      });
    }
    
    // 캡처 이벤트 표시 체크박스
    const showCaptureEvents = document.getElementById('showCaptureEvents');
    if (showCaptureEvents) {
      showCaptureEvents.addEventListener('change', () => {
        this.setupCaptureListeners();
      });
    }
  }
  
  /**
   * 등록된 이벤트 리스너 제거
   */
  removeEventListeners() {
    // UnifiedPointerEvents 리스너 제거
    this.listenerIds.forEach(id => {
      window.unifiedPointerEvents.removeEventListener(id);
    });
    this.listenerIds = [];
    
    // 네이티브 이벤트 리스너 제거
    const captureElement = document.getElementById('captureElement');
    if (captureElement && this._captureNativeHandlers) {
      captureElement.removeEventListener('gotpointercapture', this._captureNativeHandlers.gotCapture);
      captureElement.removeEventListener('lostpointercapture', this._captureNativeHandlers.lostCapture);
      this._captureNativeHandlers = null;
    }
  }
}