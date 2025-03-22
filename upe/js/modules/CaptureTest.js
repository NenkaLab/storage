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
    
    // 드래그 시작 리스너
    const dragStartId = window.unifiedPointerEvents.addEventListener(
      captureElement,
      'dragstart',
      (event) => {
        this.activePointerId = event.pointerId;
        
        // 로그 출력
        const message = `드래그 시작 - ID: ${this.activePointerId}, 유형: ${this.utils.pointerTypeToKorean(event.pointerType)}`;
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
        // 요소 이동
        const x = event.deltaX;
        const y = event.deltaY;
        captureElement.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
        
        // 로그 출력 (큰 변화만)
        if (Math.abs(x) % 20 < 2 || Math.abs(y) % 20 < 2) {
          const isOutside = !this.utils.isPointInElement(event.clientX, event.clientY, captureArea);
          if (showEvents) {
            const message = `드래그 중 - X: ${Math.round(x)}px, Y: ${Math.round(y)}px${isOutside ? ' (영역 밖)' : ''}`;
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
        // 로그 출력
        const message = `드래그 종료 - 최종 위치: X=${Math.round(event.deltaX)}px, Y=${Math.round(event.deltaY)}px`;
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