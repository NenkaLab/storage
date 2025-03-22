/**
 * 제스처 이벤트 테스트 모듈
 * 롱클릭, 더블클릭, 스와이프 등의 제스처 이벤트를 처리합니다.
 */
export default class GestureTest {
  /**
   * 생성자
   * @param {UIManager} ui - UI 관리자
   * @param {Utils} utils - 유틸리티 객체
   */
  constructor(ui, utils) {
    this.ui = ui;
    this.utils = utils;
    this.listenerIds = {
      longclick: null,
      doubleclick: null,
      swipe: null
    };
    
    // 스와이프 상태 추적
    this.swipeStartX = 0;
    this.swipeStartY = 0;
    this.swipeStartTime = 0;
  }
  
  /**
   * 모듈 초기화
   * 이벤트 리스너를 설정합니다.
   */
  init() {
    // 이전 리스너 제거
    this.removeEventListeners();
    
    // 롱클릭 테스트 초기화
    this.initLongClick();
    
    // 더블클릭 테스트 초기화
    this.initDoubleClick();
    
    // 스와이프 테스트 초기화
    this.initSwipe();
    
    // 파라미터 변경 이벤트 리스너
    this.setupControlEvents();
  }
  
  /**
   * 롱클릭 테스트 초기화
   */
  initLongClick() {
    const longClickArea = document.getElementById('longClickArea');
    const longClickTarget = longClickArea?.querySelector('.gesture-target');
    const logArea = document.getElementById('gestureLog');
    
    if (!longClickTarget || !logArea) {
      console.error('제스처 테스트: 롱클릭 요소를 찾을 수 없습니다.');
      return;
    }
    
    // 딜레이 값 가져오기
    const delay = parseInt(document.getElementById('longClickDelay')?.value || 500);
    
    // 롱클릭 리스너 등록
    this.listenerIds.longclick = window.unifiedPointerEvents.addEventListener(
      longClickTarget,
      'longclick',
      (event) => {
        // 시각적 피드백
        longClickTarget.classList.add('active');
        setTimeout(() => {
          longClickTarget.classList.remove('active');
        }, 300);
        
        // 로그 출력
        const message = `롱클릭 감지 - 지연: ${delay}ms, 위치: (${Math.round(event.clientX)}, ${Math.round(event.clientY)})`;
        this.utils.addLogEntry(logArea, message, 'success');
      },
      { longClickDelay: delay, preventDefault: true }
    );
  }
  
  /**
   * 더블클릭 테스트 초기화
   */
  initDoubleClick() {
    const doubleClickArea = document.getElementById('doubleClickArea');
    const doubleClickTarget = doubleClickArea?.querySelector('.gesture-target');
    const logArea = document.getElementById('gestureLog');
    
    if (!doubleClickTarget || !logArea) {
      console.error('제스처 테스트: 더블클릭 요소를 찾을 수 없습니다.');
      return;
    }
    
    // 간격 값 가져오기
    const delay = parseInt(document.getElementById('doubleClickDelay')?.value || 300);
    
    // 더블클릭 리스너 등록
    this.listenerIds.doubleclick = window.unifiedPointerEvents.addEventListener(
      doubleClickTarget,
      'doubleclick',
      (event) => {
        // 시각적 피드백
        doubleClickTarget.classList.add('active');
        setTimeout(() => {
          doubleClickTarget.classList.remove('active');
        }, 300);
        
        // 로그 출력
        const message = `더블클릭 감지 - 간격: ${event.interval}ms, 위치: (${Math.round(event.clientX)}, ${Math.round(event.clientY)})`;
        this.utils.addLogEntry(logArea, message, 'success');
      },
      { doubleClickDelay: delay, preventDefault: true }
    );
  }
  
  /**
   * 스와이프 테스트 초기화
   */
  initSwipe() {
    const swipeArea = document.getElementById('swipeArea');
    const swipeDirectionIndicator = document.getElementById('swipeDirectionIndicator');
    const logArea = document.getElementById('gestureLog');
    
    if (!swipeArea || !swipeDirectionIndicator || !logArea) {
      console.error('제스처 테스트: 스와이프 요소를 찾을 수 없습니다.');
      return;
    }
    
    // 파라미터 가져오기
    const threshold = parseInt(document.getElementById('swipeThreshold')?.value || 50);
    const timeout = parseInt(document.getElementById('swipeTimeout')?.value || 300);
    
    // 수정된 스와이프 구현 방식
    // UnifiedPointerEvents의 swipe 이벤트 대신 직접 구현
    
    // 시작 이벤트 핸들러
    const startHandler = (event) => {
      this.swipeStartX = event.clientX;
      this.swipeStartY = event.clientY;
      this.swipeStartTime = Date.now();
    };
    
    // 종료 이벤트 핸들러
    const endHandler = (event) => {
      const deltaTime = Date.now() - this.swipeStartTime;
      
      // 시간 제한 확인
      if (deltaTime > timeout) return;
      
      const deltaX = event.clientX - this.swipeStartX;
      const deltaY = event.clientY - this.swipeStartY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      // 거리 임계값 확인
      if (distance < threshold) return;
      
      // 방향 결정
      let direction;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      
      if (absX > absY) {
        direction = deltaX > 0 ? 'right' : 'left';
      } else {
        direction = deltaY > 0 ? 'down' : 'up';
      }
      
      // 방향에 따른 아이콘 회전
      let rotation = 0;
      switch (direction) {
        case 'right': rotation = 0; break;
        case 'down': rotation = 90; break;
        case 'left': rotation = 180; break;
        case 'up': rotation = 270; break;
      }
      
      // 시각적 피드백
      swipeDirectionIndicator.style.transform = `rotate(${rotation}deg)`;
      swipeDirectionIndicator.classList.remove('hidden');
      
      setTimeout(() => {
        swipeDirectionIndicator.classList.add('hidden');
      }, 1000);
      
      // 로그 출력
      const directionKo = this.utils.directionToKorean(direction);
      const speed = Math.round(distance / deltaTime * 1000);
      
      const message = `스와이프 감지 - 방향: ${directionKo}, 거리: ${Math.round(distance)}px, 속도: ${speed}px/s`;
      this.utils.addLogEntry(logArea, message, 'success');
      
      // 이벤트 객체를 확장하여 swipe 이벤트와 유사하게 만들기
      const swipeEventData = {
        direction,
        distance,
        deltaX,
        deltaY,
        duration: deltaTime,
        startX: this.swipeStartX,
        startY: this.swipeStartY
      };
      
      // swipe 이벤트 발생 (커스텀 이벤트)
      const customEvent = new CustomEvent('swipe', { 
        detail: swipeEventData,
        bubbles: true,
        cancelable: true
      });
      swipeArea.dispatchEvent(customEvent);
    };
    
    // 등록된 이전 리스너 제거
    if (this.listenerIds.swipeStart) {
      window.unifiedPointerEvents.removeEventListener(this.listenerIds.swipeStart);
    }
    
    if (this.listenerIds.swipeEnd) {
      window.unifiedPointerEvents.removeEventListener(this.listenerIds.swipeEnd);
    }
    
    // 새 리스너 등록
    this.listenerIds.swipeStart = window.unifiedPointerEvents.addEventListener(
      swipeArea,
      'start',
      startHandler,
      { preventDefault: true }
    );
    
    this.listenerIds.swipeEnd = window.unifiedPointerEvents.addEventListener(
      swipeArea,
      'end',
      endHandler,
      { preventDefault: true }
    );
    
    // 기본 swipe 이벤트도 유지 (두 가지 방식으로 검증)
    this.listenerIds.swipe = window.unifiedPointerEvents.addEventListener(
      swipeArea,
      'swipe',
      (event) => {
        // 방향에 따른 아이콘 회전
        let rotation = 0;
        switch (event.direction) {
          case 'right': rotation = 0; break;
          case 'down': rotation = 90; break;
          case 'left': rotation = 180; break;
          case 'up': rotation = 270; break;
        }
        
        // 시각적 피드백
        swipeDirectionIndicator.style.transform = `rotate(${rotation}deg)`;
        swipeDirectionIndicator.classList.remove('hidden');
        
        setTimeout(() => {
          swipeDirectionIndicator.classList.add('hidden');
        }, 1000);
        
        // 로그 출력
        const directionKo = this.utils.directionToKorean(event.direction);
        const speed = Math.round(event.distance / event.duration * 1000);
        
        const message = `기본 스와이프 감지 - 방향: ${directionKo}, 거리: ${Math.round(event.distance)}px, 속도: ${speed}px/s`;
        this.utils.addLogEntry(logArea, message, 'success');
      },
      { swipeThreshold: threshold, swipeTimeout: timeout, preventDefault: true }
    );
  }
  
  /**
   * 컨트롤 이벤트 설정
   */
  setupControlEvents() {
    // 롱클릭 지연 시간 변경 이벤트
    const longClickDelay = document.getElementById('longClickDelay');
    if (longClickDelay) {
      longClickDelay.addEventListener('input', () => {
        this.initLongClick();
      });
    }
    
    // 더블클릭 간격 변경 이벤트
    const doubleClickDelay = document.getElementById('doubleClickDelay');
    if (doubleClickDelay) {
      doubleClickDelay.addEventListener('input', () => {
        this.initDoubleClick();
      });
    }
    
    // 스와이프 임계값 변경 이벤트
    const swipeThreshold = document.getElementById('swipeThreshold');
    if (swipeThreshold) {
      swipeThreshold.addEventListener('input', () => {
        this.initSwipe();
      });
    }
    
    // 스와이프 시간 변경 이벤트
    const swipeTimeout = document.getElementById('swipeTimeout');
    if (swipeTimeout) {
      swipeTimeout.addEventListener('input', () => {
        this.initSwipe();
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
      longclick: null,
      doubleclick: null,
      swipe: null,
      swipeStart: null,
      swipeEnd: null
    };
  }
}