/**
 * 클릭, 터치, 펜 입력을 통합적으로 처리하는 개선된 이벤트 매니저
 * 모든 입력 방식에 대해 일관된 이벤트 핸들링을 제공합니다.
 * 롱클릭, 더블클릭, 스와이프, 드래그 기능을 지원합니다.
 * setPointerCapture/releasePointerCapture API를 활용하여 향상된 제어 기능을 제공합니다.
 */
class UnifiedPointerEvents {
  constructor() {
    // 이벤트 리스너 관리
    this.eventListeners = new Map(); // id -> 리스너 정보
    this.gestureStates = new Map();  // id -> 제스처 상태
    this.dragStates = new Map();     // id -> 드래그 상태
    this.capturedPointers = new Map(); // pointerId -> {element, listenerId}
    this.listenerCounter = 0;
    
    // 활성 포인터 추적
    this._activePointers = new Map(); // 포인터ID -> 리스너ID
    
    // 전역 이벤트 핸들러
    this._globalMoveHandler = this._handleGlobalMove.bind(this);
    this._globalEndHandler = this._handleGlobalEnd.bind(this);
    this._globalCancelHandler = this._handleGlobalCancel.bind(this);
    this._gotPointerCaptureHandler = this._handleGotPointerCapture.bind(this);
    this._lostPointerCaptureHandler = this._handleLostPointerCapture.bind(this);
    
    // 전역 핸들러 등록 상태
    this._hasRegisteredGlobalHandlers = false;
    this._globalHandlerCount = 0;
    
    // 디버그 모드 (콘솔 로그 활성화/비활성화)
    this.debugMode = false;
    
    // 기본 설정값
    this.defaults = {
      longClickDelay: 500,
      doubleClickDelay: 300,
      swipeThreshold: 50,
      swipeTimeout: 300,
      usePointerCapture: true, // setPointerCapture 사용 여부 기본값
      touchOffsetX: 0,         // 터치 이벤트의 X축 오프셋
      touchOffsetY: -20        // 터치 이벤트의 Y축 오프셋 (위쪽으로 20px)
    };
    
    // 이벤트 매핑
    this._eventMapping = {
      mouse: {
        'start': 'mousedown',
        'move': 'mousemove',
        'end': 'mouseup',
        'cancel': 'mouseleave'
      },
      touch: {
        'start': 'touchstart',
        'move': 'touchmove',
        'end': 'touchend',
        'cancel': 'touchcancel'
      },
      pointer: {
        'start': 'pointerdown',
        'move': 'pointermove',
        'end': 'pointerup',
        'cancel': 'pointercancel',
        'gotcapture': 'gotpointercapture',
        'lostcapture': 'lostpointercapture'
      }
    };
    
    // 지원하는 이벤트 타입
    this._validEventTypes = new Set([
      'start', 'move', 'end', 'cancel', 
      'longclick', 'doubleclick', 'swipe', 
      'dragstart', 'drag', 'dragend',
      'gotcapture', 'lostcapture'
    ]);
  }

  /**
   * 내부 로깅을 위한 디버그 메서드
   * @private
   */
  _debug(...args) {
    if (this.debugMode) {
      console.log('[UnifiedPointerEvents]', ...args);
    }
  }

  /**
   * 요소에 통합 포인터 이벤트 리스너를 추가합니다.
   * @param {HTMLElement} element - 이벤트 리스너를 추가할 요소
   * @param {string} eventType - 이벤트 유형
   * @param {Function} callback - 이벤트 발생 시 호출될 콜백 함수
   * @param {Object} options - 이벤트 리스너 옵션
   * @returns {number} 이벤트 리스너 식별자
   */
  addEventListener(element, eventType, callback, options = {}) {
    if (!element || !eventType || !callback) {
      throw new Error('필수 매개변수가 누락되었습니다: element, eventType, callback');
    }

    if (!this._validEventTypes.has(eventType)) {
      throw new Error(`지원되지 않는 이벤트 유형입니다: ${eventType}`);
    }

    const listenerId = this.listenerCounter++;
    const listenerInfo = { 
      element, 
      eventType, 
      callback, 
      options, 
      nativeListeners: [] 
    };

    // 제스처 이벤트와 드래그 이벤트는 다른 방식으로 처리
    if (['longclick', 'doubleclick', 'swipe'].includes(eventType)) {
      this._setupGestureEvents(element, eventType, callback, options, listenerId);
    } 
    else if (['dragstart', 'drag', 'dragend'].includes(eventType)) {
      this._setupDragEvents(element, eventType, callback, options, listenerId);
    } 
    else if (['gotcapture', 'lostcapture'].includes(eventType)) {
      this._setupCaptureEvents(element, eventType, callback, options, listenerId, listenerInfo);
    }
    else {
      // 기본 이벤트 핸들러 설정
      this._setupBasicEvents(element, eventType, callback, options, listenerId, listenerInfo);
    }

    this.eventListeners.set(listenerId, listenerInfo);
    return listenerId;
  }

  /**
   * 기본 이벤트 리스너를 설정합니다.
   * @private
   */
  _setupBasicEvents(element, eventType, callback, options, listenerId, listenerInfo) {
    const hasPointerEvents = 'PointerEvent' in window;
    
    // 이벤트 핸들러
    const handleEvent = (event) => {
      // 입력 장치 필터링
      if (eventType === 'start') {
        if ((options.penOnly && event.pointerType !== 'pen') ||
            (options.touchOnly && event.pointerType !== 'touch') ||
            (options.mouseOnly && event.pointerType !== 'mouse')) {
          return;
        }
      }
      
      if (options.preventDefault) {
        event.preventDefault();
      }
      
      callback(this._createUnifiedEvent(event, eventType));
    };
    
    if (hasPointerEvents) {
      const nativeEventType = this._eventMapping.pointer[eventType];
      element.addEventListener(nativeEventType, handleEvent, {
        ...options,
        passive: options.preventDefault ? false : options.passive
      });
      
      listenerInfo.nativeListeners.push({ 
        type: nativeEventType, 
        handler: handleEvent, 
        element 
      });
    } else {
      // 폴백: 마우스와 터치 이벤트
      this._setupFallbackEvents(element, eventType, callback, options, listenerInfo);
    }
  }

  /**
   * 포인터 캡처 이벤트 리스너를 설정합니다.
   * @private
   */
  _setupCaptureEvents(element, eventType, callback, options, listenerId, listenerInfo) {
    if (!('PointerEvent' in window)) {
      this._debug('이 브라우저는 포인터 캡처 이벤트를 지원하지 않습니다');
      return;
    }
    
    const captureEventType = eventType === 'gotcapture' 
      ? 'gotpointercapture' 
      : 'lostpointercapture';
    
    const captureHandler = (event) => {
      if (options.preventDefault) {
        event.preventDefault();
      }
      
      callback(this._createUnifiedEvent(event, eventType));
    };
    
    element.addEventListener(captureEventType, captureHandler, {
      ...options,
      passive: options.preventDefault ? false : options.passive
    });
    
    listenerInfo.nativeListeners.push({ 
      type: captureEventType, 
      handler: captureHandler, 
      element 
    });
  }

  /**
   * 폴백 이벤트 (마우스/터치)를 설정합니다.
   * @private
   */
  _setupFallbackEvents(element, eventType, callback, options, listenerInfo) {
    const mouseEventType = this._eventMapping.mouse[eventType];
    const touchEventType = this._eventMapping.touch[eventType];
    
    // 터치 이벤트 처리 플래그
    let isHandledByTouch = false;
    
    // 마우스 핸들러
    const mouseHandler = (event) => {
      if (isHandledByTouch || options.touchOnly || options.penOnly) {
        isHandledByTouch = false;
        return;
      }
      
      if (options.preventDefault) {
        event.preventDefault();
      }
      
      callback(this._createUnifiedEvent(event, eventType));
    };
    
    // 터치 핸들러
    const touchHandler = (event) => {
      if (options.mouseOnly) return;
      
      if (eventType === 'start') {
        isHandledByTouch = true;
      }
      
      if (options.preventDefault) {
        event.preventDefault();
      }
      
      callback(this._createUnifiedEvent(event, eventType));
    };
    
    // 이벤트 리스너 등록 시 passive 옵션 설정
    const listenerOptions = {
      ...options,
      passive: options.preventDefault ? false : options.passive
    };
    
    element.addEventListener(mouseEventType, mouseHandler, listenerOptions);
    element.addEventListener(touchEventType, touchHandler, listenerOptions);
    
    listenerInfo.nativeListeners.push(
      { type: mouseEventType, handler: mouseHandler, element },
      { type: touchEventType, handler: touchHandler, element }
    );
  }

  /**
   * 통합된 이벤트 객체를 생성합니다.
   * @private
   */
  _createUnifiedEvent(originalEvent, eventType, additionalData = {}) {
    // 이벤트 데이터 추출
    let pointerType, pointerId, clientX, clientY, pageX, pageY, isPrimary, pressure;
    
    if (originalEvent.type.startsWith('touch') && originalEvent.touches) {
      pointerType = 'touch';
      const touch = originalEvent.type === 'touchend' || originalEvent.type === 'touchcancel' 
        ? (originalEvent.changedTouches[0] || {}) 
        : (originalEvent.touches[0] || {});
      
      pointerId = touch.identifier || 1;
      clientX = touch.clientX || 0;
      clientY = touch.clientY || 0;
      // 터치 객체에서 직접 pageX/Y 가져오기
      pageX = touch.pageX || clientX;
      pageY = touch.pageY || clientY;
      isPrimary = true;
      pressure = touch.force || 0;
      
      // 터치 오프셋 적용
      clientY += this.defaults.touchOffsetY;
      clientX += this.defaults.touchOffsetX;
      pageY += this.defaults.touchOffsetY;
      pageX += this.defaults.touchOffsetX;
    } 
    else if (originalEvent.type.startsWith('pointer') || originalEvent.type.startsWith('got') || originalEvent.type.startsWith('lost')) {
      pointerType = originalEvent.pointerType || 'mouse';
      pointerId = originalEvent.pointerId || 1;
      clientX = originalEvent.clientX || 0;
      clientY = originalEvent.clientY || 0;
      pageX = originalEvent.pageX || clientX;
      pageY = originalEvent.pageY || clientY;
      isPrimary = originalEvent.isPrimary !== undefined ? originalEvent.isPrimary : true;
      pressure = originalEvent.pressure || 0;
      
      // 터치 타입에만 오프셋 적용
      if (pointerType === 'touch') {
        clientY += this.defaults.touchOffsetY;
        clientX += this.defaults.touchOffsetX;
        pageY += this.defaults.touchOffsetY;
        pageX += this.defaults.touchOffsetX;
      }
    } 
    else {
      // 마우스 이벤트
      pointerType = 'mouse';
      pointerId = 1;
      clientX = originalEvent.clientX || 0;
      clientY = originalEvent.clientY || 0;
      pageX = originalEvent.pageX || clientX;
      pageY = originalEvent.pageY || clientY;
      isPrimary = true;
      pressure = originalEvent.buttons ? 0.5 : 0;
    }

    // 통합 이벤트 객체 생성
    const unifiedEvent = {
      originalEvent,
      type: eventType,
      pointerType,
      pointerId,
      clientX,
      clientY,
      pageX,
      pageY,
      isPrimary,
      pressure,
      preventDefault: () => originalEvent.preventDefault(),
      stopPropagation: () => originalEvent.stopPropagation(),
      stopImmediatePropagation: originalEvent.stopImmediatePropagation 
        ? () => originalEvent.stopImmediatePropagation() 
        : () => originalEvent.stopPropagation(),
      // 포인터 캡처 메서드 추가
      setPointerCapture: (element) => this._setPointerCapture(element, pointerId, unifiedEvent),
      releasePointerCapture: (element) => this._releasePointerCapture(element, pointerId, unifiedEvent)
    };
    
    // 추가 데이터 병합
    for (const key in additionalData) {
      unifiedEvent[key] = additionalData[key];
    }
    
    return unifiedEvent;
  }

  /**
   * 제스처 이벤트를 설정합니다.
   * @private
   */
  _setupGestureEvents(element, eventType, callback, options, listenerId) {
    // 기본 옵션과 사용자 옵션 병합
    const longClickDelay = options.longClickDelay || this.defaults.longClickDelay;
    const doubleClickDelay = options.doubleClickDelay || this.defaults.doubleClickDelay;
    const swipeThreshold = options.swipeThreshold || this.defaults.swipeThreshold;
    const swipeTimeout = options.swipeTimeout || this.defaults.swipeTimeout;
    const preventDefault = options.preventDefault || false;
    const usePointerCapture = options.usePointerCapture !== undefined 
      ? options.usePointerCapture 
      : this.defaults.usePointerCapture;
    
    // 제스처 상태 초기화
    const gestureState = {
      element,
      eventType,
      timerId: null,
      lastTapTime: 0,
      startX: 0,
      startY: 0,
      startTime: 0,
      active: false,
      usePointerCapture,
      // 롱클릭 구분을 위한 플래그 추가
      longClickTriggered: false,
      endHandlersRegistered: false
    };
    
    this.gestureStates.set(listenerId, gestureState);
    
    // 시작 이벤트 핸들러
    const startHandler = (event) => {
      if (preventDefault) {
        event.preventDefault();
      }
      
      const clientX = event.clientX || (event.touches && event.touches[0] ? event.touches[0].clientX : 0);
      const clientY = event.clientY || (event.touches && event.touches[0] ? event.touches[0].clientY : 0);
      const pointerId = event.pointerId || (event.touches && event.touches[0] ? event.touches[0].identifier : 1);
      
      gestureState.active = true;
      gestureState.startX = clientX;
      gestureState.startY = clientY;
      gestureState.startTime = Date.now();
      gestureState.longClickTriggered = false; // 롱클릭 플래그 초기화
      
      // 포인터 ID와 리스너 ID 매핑
      this._activePointers.set(pointerId, listenerId);
      
      // 포인터 캡처 설정 (지원되는 경우)
      if (usePointerCapture && 'setPointerCapture' in element && pointerId !== undefined) {
        this._debug(`제스처 이벤트에 대한 포인터 캡처 설정: pointerId=${pointerId}`);
        try {
          element.setPointerCapture(pointerId);
          this.capturedPointers.set(pointerId, { element, listenerId });
        } catch (e) {
          this._debug('포인터 캡처 설정 실패:', e.message);
        }
      }
      
      if (eventType === 'longclick') {
        clearTimeout(gestureState.timerId);
        
        // 롱클릭 핸들러 - 지연 후 실행
        gestureState.timerId = setTimeout(() => {
          if (gestureState.active && !gestureState.longClickTriggered) {
            gestureState.longClickTriggered = true; // 롱클릭 발생 표시
            
            const additionalData = {
              duration: longClickDelay,
              startX: gestureState.startX,
              startY: gestureState.startY
            };
            callback(this._createUnifiedEvent(event, 'longclick', additionalData));
            
            // 롱클릭 후 포인터 캡처 해제
            if (usePointerCapture && 'releasePointerCapture' in element && pointerId !== undefined) {
              this._releasePointerCaptureIfExists(element, pointerId);
            }
          }
        }, longClickDelay);
        
        // 롱클릭과 일반 클릭 구분을 위한 종료 핸들러
        if (!gestureState.endHandlersRegistered) {
          const endHandler = (e) => {
            if (gestureState.active) {
              const clickDuration = Date.now() - gestureState.startTime;
              
              // 짧은 클릭인 경우 롱클릭 취소
              if (clickDuration < longClickDelay) {
                clearTimeout(gestureState.timerId);
                this._debug('일반 클릭 감지됨, 롱클릭 취소');
              }
              
              gestureState.active = false;
              
              // 포인터 캡처 해제
              if (usePointerCapture && 'releasePointerCapture' in element && pointerId !== undefined) {
                this._releasePointerCaptureIfExists(element, pointerId);
              }
            }
          };
          
          // 요소에 직접 종료 핸들러 등록
          const hasPointerEvents = 'PointerEvent' in window;
          if (hasPointerEvents) {
            element.addEventListener('pointerup', endHandler);
            element.addEventListener('pointercancel', endHandler);
            
            // 이벤트 핸들러 추적을 위해 리스너 정보에 추가
            const listenerInfo = this.eventListeners.get(listenerId) || 
              { element, eventType, callback, options, nativeListeners: [] };
            
            listenerInfo.nativeListeners.push(
              { type: 'pointerup', handler: endHandler, element },
              { type: 'pointercancel', handler: endHandler, element }
            );
            
            this.eventListeners.set(listenerId, listenerInfo);
          } else {
            element.addEventListener('mouseup', endHandler);
            element.addEventListener('mouseleave', endHandler);
            element.addEventListener('touchend', endHandler);
            element.addEventListener('touchcancel', endHandler);
            
            // 이벤트 핸들러 추적을 위해 리스너 정보에 추가
            const listenerInfo = this.eventListeners.get(listenerId) || 
              { element, eventType, callback, options, nativeListeners: [] };
            
            listenerInfo.nativeListeners.push(
              { type: 'mouseup', handler: endHandler, element },
              { type: 'mouseleave', handler: endHandler, element },
              { type: 'touchend', handler: endHandler, element },
              { type: 'touchcancel', handler: endHandler, element }
            );
            
            this.eventListeners.set(listenerId, listenerInfo);
          }
          
          gestureState.endHandlersRegistered = true;
        }
      }
      
      if (eventType === 'doubleclick') {
        const now = Date.now();
        const timeSinceLastTap = now - gestureState.lastTapTime;
        
        if (timeSinceLastTap < doubleClickDelay) {
          const additionalData = {
            interval: timeSinceLastTap,
            startX: gestureState.startX,
            startY: gestureState.startY
          };
          callback(this._createUnifiedEvent(event, 'doubleclick', additionalData));
          gestureState.lastTapTime = 0;
        } else {
          gestureState.lastTapTime = now;
        }
      }
      
      // 전역 이벤트 리스너 등록
      this._registerGlobalHandlersIfNeeded();
    };
    
    // 로컬 핸들러 등록
    const hasPointerEvents = 'PointerEvent' in window;
    const startEventType = hasPointerEvents 
      ? this._eventMapping.pointer.start 
      : this._eventMapping.touch.start;
    
    const listenerOptions = {
      ...options,
      passive: options.preventDefault ? false : options.passive
    };
    
    element.addEventListener(startEventType, startHandler, listenerOptions);
    
    // 이벤트 리스너 정보 저장
    const listenerInfo = this.eventListeners.get(listenerId) || 
      { element, eventType, callback, options, nativeListeners: [] };
    
    listenerInfo.nativeListeners.push({ type: startEventType, handler: startHandler, element });
    
    // 포인터 캡처 이벤트 리스너 추가
    if (hasPointerEvents && usePointerCapture) {
      element.addEventListener('gotpointercapture', this._gotPointerCaptureHandler);
      element.addEventListener('lostpointercapture', this._lostPointerCaptureHandler);
      
      listenerInfo.nativeListeners.push(
        { type: 'gotpointercapture', handler: this._gotPointerCaptureHandler, element },
        { type: 'lostpointercapture', handler: this._lostPointerCaptureHandler, element }
      );
    }
    
    if (!hasPointerEvents) {
      // 터치가 없는 환경에서 마우스 이벤트 추가
      const mouseStartType = this._eventMapping.mouse.start;
      element.addEventListener(mouseStartType, startHandler, listenerOptions);
      listenerInfo.nativeListeners.push({ type: mouseStartType, handler: startHandler, element });
    }
    
    this.eventListeners.set(listenerId, listenerInfo);
  }

  /**
   * 드래그 이벤트를 설정합니다.
   * @private
   */
  _setupDragEvents(element, eventType, callback, options, listenerId) {
    // 옵션 설정
    const preventDefault = options.preventDefault || false;
    const range = options.range || null;
    const keepState = options.keepState !== false;
    const usePointerCapture = options.usePointerCapture !== undefined 
      ? options.usePointerCapture 
      : this.defaults.usePointerCapture;
    
    // 드래그 상태 초기화
    const dragState = {
      element,
      eventType,
      active: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      range,
      keepState,
      usePointerCapture,
      capturedPointer: null,
      elementRect: null // 요소의 경계 정보 추가
    };
    
    this.dragStates.set(listenerId, dragState);
    
    // 드래그 시작 핸들러
    const dragStartHandler = (event) => {
      if (preventDefault) {
        event.preventDefault();
      }
      
      const clientX = event.clientX || (event.touches && event.touches[0] ? event.touches[0].clientX : 0);
      const clientY = event.clientY || (event.touches && event.touches[0] ? event.touches[0].clientY : 0);
      const pointerId = event.pointerId || (event.touches && event.touches[0] ? event.touches[0].identifier : 1);
      
      // 요소의 경계 정보 저장 (상대 위치 계산을 위해)
      dragState.elementRect = element.getBoundingClientRect();
      
      dragState.active = true;
      dragState.startX = clientX;
      dragState.startY = clientY;
      dragState.currentX = clientX;
      dragState.currentY = clientY;
      dragState.capturedPointer = pointerId;
      
      // 포인터 ID와 리스너 ID 매핑
      this._activePointers.set(pointerId, listenerId);
      
      // 포인터 캡처 설정 (지원되는 경우)
      if (usePointerCapture && 'setPointerCapture' in element && pointerId !== undefined) {
        this._debug(`드래그 이벤트에 대한 포인터 캡처 설정: pointerId=${pointerId}`);
        try {
          element.setPointerCapture(pointerId);
          this.capturedPointers.set(pointerId, { element, listenerId });
        } catch (e) {
          this._debug('포인터 캡처 설정 실패:', e.message);
        }
      }
      
      if (eventType === 'dragstart') {
        const additionalData = {
          startX: dragState.startX,
          startY: dragState.startY,
          deltaX: 0,
          deltaY: 0
        };
        callback(this._createUnifiedEvent(event, 'dragstart', additionalData));
      }
      
      // 전역 이벤트 리스너 등록
      this._registerGlobalHandlersIfNeeded();
    };
    
    // 로컬 핸들러 등록
    const hasPointerEvents = 'PointerEvent' in window;
    const startEventType = hasPointerEvents 
      ? this._eventMapping.pointer.start 
      : this._eventMapping.touch.start;
    
    const listenerOptions = {
      ...options,
      passive: options.preventDefault ? false : options.passive
    };
    
    element.addEventListener(startEventType, dragStartHandler, listenerOptions);
    
    // 이벤트 리스너 정보 저장
    const listenerInfo = this.eventListeners.get(listenerId) || 
      { element, eventType, callback, options, nativeListeners: [] };
    
    listenerInfo.nativeListeners.push({ type: startEventType, handler: dragStartHandler, element });
    
    // 포인터 캡처를 사용하는 경우 이동 이벤트를 직접 요소에 등록
    if (hasPointerEvents && usePointerCapture && eventType === 'drag') {
      const moveHandler = (event) => {
        if (!dragState.active) return;
        
        const pointerId = event.pointerId;
        if (pointerId !== dragState.capturedPointer) return;
        
        if (preventDefault) {
          event.preventDefault();
        }
        
        const clientX = event.clientX;
        const clientY = event.clientY;
        
        // 현재 위치 업데이트
        dragState.currentX = clientX;
        dragState.currentY = clientY;
        
        // 델타 계산
        const deltaX = clientX - dragState.startX;
        const deltaY = clientY - dragState.startY;
        
        // 범위 제한 확인
        let constrainedDeltaX = deltaX;
        let constrainedDeltaY = deltaY;
        let isOutOfBounds = false;
        
        if (dragState.range && dragState.range !== 'infinite') {
          if (dragState.range.x) {
            const [minX, maxX] = dragState.range.x;
            if (deltaX < minX) {
              constrainedDeltaX = minX;
              isOutOfBounds = true;
            } else if (deltaX > maxX) {
              constrainedDeltaX = maxX;
              isOutOfBounds = true;
            }
          }
          
          if (dragState.range.y) {
            const [minY, maxY] = dragState.range.y;
            if (deltaY < minY) {
              constrainedDeltaY = minY;
              isOutOfBounds = true;
            } else if (deltaY > maxY) {
              constrainedDeltaY = maxY;
              isOutOfBounds = true;
            }
          }
        }
        
        const additionalData = {
          startX: dragState.startX,
          startY: dragState.startY,
          currentX: dragState.currentX,
          currentY: dragState.currentY,
          deltaX: constrainedDeltaX,
          deltaY: constrainedDeltaY,
          rawDeltaX: deltaX,
          rawDeltaY: deltaY,
          isOutOfBounds,
          elementRect: dragState.elementRect // 요소 경계 정보 포함
        };
        
        callback(this._createUnifiedEvent(event, 'drag', additionalData));
      };
      
      const endHandler = (event) => {
        if (!dragState.active) return;
        
        const pointerId = event.pointerId;
        if (pointerId !== dragState.capturedPointer) return;
        
        if (preventDefault) {
          event.preventDefault();
        }
        
        // 델타 계산
        const deltaX = dragState.currentX - dragState.startX;
        const deltaY = dragState.currentY - dragState.startY;
        
        // 범위 제한 확인
        let constrainedDeltaX = deltaX;
        let constrainedDeltaY = deltaY;
        let isOutOfBounds = false;
        
        if (dragState.range && dragState.range !== 'infinite') {
          if (dragState.range.x) {
            const [minX, maxX] = dragState.range.x;
            if (deltaX < minX) {
              constrainedDeltaX = minX;
              isOutOfBounds = true;
            } else if (deltaX > maxX) {
              constrainedDeltaX = maxX;
              isOutOfBounds = true;
            }
          }
          
          if (dragState.range.y) {
            const [minY, maxY] = dragState.range.y;
            if (deltaY < minY) {
              constrainedDeltaY = minY;
              isOutOfBounds = true;
            } else if (deltaY > maxY) {
              constrainedDeltaY = maxY;
              isOutOfBounds = true;
            }
          }
        }
        
        if (eventType === 'drag') {
          const additionalData = {
            startX: dragState.startX,
            startY: dragState.startY,
            endX: dragState.currentX,
            endY: dragState.currentY,
            deltaX: constrainedDeltaX,
            deltaY: constrainedDeltaY,
            rawDeltaX: deltaX,
            rawDeltaY: deltaY,
            isOutOfBounds,
            elementRect: dragState.elementRect // 요소 경계 정보 포함
          };
          
          // dragend 이벤트 발생
          const dragEndEvent = this._createUnifiedEvent(event, 'dragend', additionalData);
          
          // dragend 이벤트에 대한 콜백이 등록되어 있는지 확인
          let hasEndCallback = false;
          this.eventListeners.forEach((info, id) => {
            if (info.element === element && info.eventType === 'dragend') {
              info.callback(dragEndEvent);
              hasEndCallback = true;
            }
          });
          
          // dragend 콜백이 없으면 현재 콜백에 dragend 이벤트 전달
          if (!hasEndCallback) {
            callback(dragEndEvent);
          }
        }
        
        // 상태 초기화
        dragState.active = false;
        dragState.capturedPointer = null;
        
        // 포인터 캡처 해제
        if ('releasePointerCapture' in element) {
          this._releasePointerCaptureIfExists(element, pointerId);
        }
        
        // 활성 포인터에서 제거
        this._activePointers.delete(pointerId);
      };
      
      element.addEventListener('pointermove', moveHandler);
      element.addEventListener('pointerup', endHandler);
      element.addEventListener('pointercancel', endHandler);
      
      listenerInfo.nativeListeners.push(
        { type: 'pointermove', handler: moveHandler, element },
        { type: 'pointerup', handler: endHandler, element },
        { type: 'pointercancel', handler: endHandler, element }
      );
    }
    
    // 포인터 캡처 이벤트 리스너 추가
    if (hasPointerEvents && usePointerCapture) {
      element.addEventListener('gotpointercapture', this._gotPointerCaptureHandler);
      element.addEventListener('lostpointercapture', this._lostPointerCaptureHandler);
      
      listenerInfo.nativeListeners.push(
        { type: 'gotpointercapture', handler: this._gotPointerCaptureHandler, element },
        { type: 'lostpointercapture', handler: this._lostPointerCaptureHandler, element }
      );
    }
    
    if (!hasPointerEvents) {
      // 터치가 없는 환경에서 마우스 이벤트 추가
      const mouseStartType = this._eventMapping.mouse.start;
      element.addEventListener(mouseStartType, dragStartHandler, listenerOptions);
      listenerInfo.nativeListeners.push({ type: mouseStartType, handler: dragStartHandler, element });
    }
    
    this.eventListeners.set(listenerId, listenerInfo);
  }
  
  /**
   * 포인터 캡처를 설정합니다.
   * @private
   */
  _setPointerCapture(element, pointerId, event) {
    if (!element || !pointerId) return false;
    
    try {
      if ('setPointerCapture' in element) {
        element.setPointerCapture(pointerId);
        this._debug(`포인터 캡처 설정: pointerId=${pointerId}`);
        return true;
      }
    } catch (e) {
      this._debug('포인터 캡처 설정 실패:', e.message);
    }
    
    return false;
  }
  
  /**
   * 포인터 캡처를 해제합니다.
   * @private
   */
  _releasePointerCapture(element, pointerId, event) {
    if (!element || !pointerId) return false;
    
    try {
      if ('releasePointerCapture' in element) {
        element.releasePointerCapture(pointerId);
        this._debug(`포인터 캡처 해제: pointerId=${pointerId}`);
        
        // 캡처된 포인터 맵에서 제거
        this.capturedPointers.delete(pointerId);
        return true;
      }
    } catch (e) {
      this._debug('포인터 캡처 해제 실패:', e.message);
    }
    
    return false;
  }
  
  /**
   * 포인터 캡처가 있는 경우에만 해제합니다.
   * @private
   */
  _releasePointerCaptureIfExists(element, pointerId) {
    if (this.capturedPointers.has(pointerId)) {
      this._releasePointerCapture(element, pointerId);
    }
  }
  
  /**
   * gotpointercapture 이벤트 핸들러
   * @private
   */
  _handleGotPointerCapture(event) {
    const pointerId = event.pointerId;
    const element = event.target;
    
    this._debug(`gotpointercapture 이벤트: pointerId=${pointerId}`);
    
    this.capturedPointers.set(pointerId, { 
      element, 
      listenerId: this._activePointers.get(pointerId) 
    });
    
    // gotcapture 이벤트에 대한 콜백 호출
    this.eventListeners.forEach((info, id) => {
      if (info.element === element && info.eventType === 'gotcapture') {
        info.callback(this._createUnifiedEvent(event, 'gotcapture'));
      }
    });
  }
  
  /**
   * lostpointercapture 이벤트 핸들러
   * @private
   */
  _handleLostPointerCapture(event) {
    const pointerId = event.pointerId;
    const element = event.target;
    
    this._debug(`lostpointercapture 이벤트: pointerId=${pointerId}`);
    
    // 캡처된 포인터 맵에서 제거
    this.capturedPointers.delete(pointerId);
    
    // lostcapture 이벤트에 대한 콜백 호출
    this.eventListeners.forEach((info, id) => {
      if (info.element === element && info.eventType === 'lostcapture') {
        info.callback(this._createUnifiedEvent(event, 'lostcapture'));
      }
    });
  }
  
  /**
   * 전역 이벤트 핸들러를 등록합니다.
   * @private
   */
  _registerGlobalHandlersIfNeeded() {
    this._globalHandlerCount++;
    
    if (this._hasRegisteredGlobalHandlers) return;
    
    const hasPointerEvents = 'PointerEvent' in window;
    const options = { passive: false }; // preventDefault를 지원하기 위해 필요
    
    if (hasPointerEvents) {
      document.addEventListener('pointermove', this._globalMoveHandler, options);
      document.addEventListener('pointerup', this._globalEndHandler, options);
      document.addEventListener('pointercancel', this._globalCancelHandler, options);
    } else {
      document.addEventListener('mousemove', this._globalMoveHandler, options);
      document.addEventListener('mouseup', this._globalEndHandler, options);
      document.addEventListener('mouseleave', this._globalCancelHandler, options);
      
      document.addEventListener('touchmove', this._globalMoveHandler, options);
      document.addEventListener('touchend', this._globalEndHandler, options);
      document.addEventListener('touchcancel', this._globalCancelHandler, options);
    }
    
    this._hasRegisteredGlobalHandlers = true;
    this._debug('전역 이벤트 핸들러 등록됨');
  }
  
  /**
   * 전역 이벤트 핸들러를 제거합니다.
   * @private
   */
  _unregisterGlobalHandlersIfNeeded() {
    this._globalHandlerCount--;
    
    if (this._globalHandlerCount > 0 || !this._hasRegisteredGlobalHandlers) return;
    
    const hasPointerEvents = 'PointerEvent' in window;
    
    if (hasPointerEvents) {
      document.removeEventListener('pointermove', this._globalMoveHandler);
      document.removeEventListener('pointerup', this._globalEndHandler);
      document.removeEventListener('pointercancel', this._globalCancelHandler);
    } else {
      document.removeEventListener('mousemove', this._globalMoveHandler);
      document.removeEventListener('mouseup', this._globalEndHandler);
      document.removeEventListener('mouseleave', this._globalCancelHandler);
      
      document.removeEventListener('touchmove', this._globalMoveHandler);
      document.removeEventListener('touchend', this._globalEndHandler);
      document.removeEventListener('touchcancel', this._globalCancelHandler);
    }
    
    this._hasRegisteredGlobalHandlers = false;
    this._debug('전역 이벤트 핸들러 제거됨');
  }
  
  /**
   * 전역 이동 이벤트 핸들러.
   * @private
   */
  _handleGlobalMove(event) {
    // 이미 캡처된 포인터는 여기서 처리하지 않음 (직접 요소의 포인터 이벤트 핸들러에서 처리)
    const pointerId = event.pointerId || 
      (event.touches && event.touches[0] ? event.touches[0].identifier : 1);
    
    if (this.capturedPointers.has(pointerId)) {
      return;
    }
    
    // 활성 리스너 ID 찾기
    const listenerId = this._activePointers.get(pointerId);
    if (!listenerId) return;
    
    // 리스너 정보 가져오기
    const listenerInfo = this.eventListeners.get(listenerId);
    if (!listenerInfo) return;
    
    // 제스처 처리
    if (['longclick', 'doubleclick', 'swipe'].includes(listenerInfo.eventType)) {
      const gestureState = this.gestureStates.get(listenerId);
      if (!gestureState || !gestureState.active) return;
    }
    // 드래그 처리
    else if (['dragstart', 'drag', 'dragend'].includes(listenerInfo.eventType)) {
      const dragState = this.dragStates.get(listenerId);
      if (!dragState || !dragState.active || dragState.usePointerCapture) return;
      
      if (listenerInfo.options.preventDefault) {
        event.preventDefault();
      }
      
      // 현재 위치 업데이트
      const clientX = event.clientX || (event.touches && event.touches[0] ? event.touches[0].clientX : 0);
      const clientY = event.clientY || (event.touches && event.touches[0] ? event.touches[0].clientY : 0);
      
      dragState.currentX = clientX;
      dragState.currentY = clientY;
      
      // 델타 계산
      const deltaX = clientX - dragState.startX;
      const deltaY = clientY - dragState.startY;
      
      // 범위 제한 확인
      let constrainedDeltaX = deltaX;
      let constrainedDeltaY = deltaY;
      let isOutOfBounds = false;
      
      if (dragState.range && dragState.range !== 'infinite') {
        if (dragState.range.x) {
          const [minX, maxX] = dragState.range.x;
          if (deltaX < minX) {
            constrainedDeltaX = minX;
            isOutOfBounds = true;
          } else if (deltaX > maxX) {
            constrainedDeltaX = maxX;
            isOutOfBounds = true;
          }
        }
        
        if (dragState.range.y) {
          const [minY, maxY] = dragState.range.y;
          if (deltaY < minY) {
            constrainedDeltaY = minY;
            isOutOfBounds = true;
          } else if (deltaY > maxY) {
            constrainedDeltaY = maxY;
            isOutOfBounds = true;
          }
        }
      }
      
      // 드래그 이벤트 발생
      if (listenerInfo.eventType === 'drag' && (dragState.keepState || !isOutOfBounds)) {
        const additionalData = {
          startX: dragState.startX,
          startY: dragState.startY,
          currentX: dragState.currentX,
          currentY: dragState.currentY,
          deltaX: constrainedDeltaX,
          deltaY: constrainedDeltaY,
          rawDeltaX: deltaX,
          rawDeltaY: deltaY,
          isOutOfBounds,
          elementRect: dragState.elementRect // 요소 경계 정보 포함
        };
        listenerInfo.callback(this._createUnifiedEvent(event, 'drag', additionalData));
      }
    }
  }
  
  /**
   * 전역 종료 이벤트 핸들러.
   * @private
   */
  _handleGlobalEnd(event) {
    // 이미 캡처된 포인터는 여기서 처리하지 않음 (직접 요소의 포인터 이벤트 핸들러에서 처리)
    const pointerId = event.pointerId || 
      (event.changedTouches && event.changedTouches[0] ? event.changedTouches[0].identifier : 1);
    
    if (this.capturedPointers.has(pointerId)) {
      return;
    }
    
    // 활성 리스너 ID 찾기
    const listenerId = this._activePointers.get(pointerId);
    if (!listenerId) return;
    
    // 리스너 정보 가져오기
    const listenerInfo = this.eventListeners.get(listenerId);
    if (!listenerInfo) return;
    
    // 제스처 처리
    if (['longclick', 'doubleclick', 'swipe'].includes(listenerInfo.eventType)) {
      const gestureState = this.gestureStates.get(listenerId);
      if (!gestureState || !gestureState.active) return;
      
      if (listenerInfo.options.preventDefault) {
        event.preventDefault();
      }
      
      // 롱클릭 타이머 취소 - 클릭 종료 시 롱클릭 취소 (짧은 클릭인 경우)
      if (listenerInfo.eventType === 'longclick') {
        const clickDuration = Date.now() - gestureState.startTime;
        const longClickDelay = listenerInfo.options.longClickDelay || this.defaults.longClickDelay;
        
        if (clickDuration < longClickDelay) {
          clearTimeout(gestureState.timerId);
          this._debug('글로벌 핸들러: 일반 클릭 감지됨, 롱클릭 취소');
          gestureState.longClickTriggered = false; // 롱클릭 플래그 초기화
        }
      }
      
      // 스와이프 처리
      if (listenerInfo.eventType === 'swipe') {
        const clientX = event.clientX || 
          (event.changedTouches && event.changedTouches[0] ? event.changedTouches[0].clientX : 0);
        const clientY = event.clientY || 
          (event.changedTouches && event.changedTouches[0] ? event.changedTouches[0].clientY : 0);
        
        const endTime = Date.now();
        const deltaTime = endTime - gestureState.startTime;
        const swipeTimeout = listenerInfo.options.swipeTimeout || this.defaults.swipeTimeout;
        
        if (deltaTime < swipeTimeout) {
          const deltaX = clientX - gestureState.startX;
          const deltaY = clientY - gestureState.startY;
          const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
          const swipeThreshold = listenerInfo.options.swipeThreshold || this.defaults.swipeThreshold;
          
          if (distance > swipeThreshold) {
            // 스와이프 방향 결정
            let direction = '';
            const absX = Math.abs(deltaX);
            const absY = Math.abs(deltaY);
            
            if (absX > absY) {
              direction = deltaX > 0 ? 'right' : 'left';
            } else {
              direction = deltaY > 0 ? 'down' : 'up';
            }
            
            const additionalData = {
              direction,
              distance,
              deltaX,
              deltaY,
              duration: deltaTime,
              startX: gestureState.startX,
              startY: gestureState.startY
            };
            
            listenerInfo.callback(this._createUnifiedEvent(event, 'swipe', additionalData));
          }
        }
      }
      
      gestureState.active = false;
    }
    // 드래그 처리
    else if (['dragstart', 'drag', 'dragend'].includes(listenerInfo.eventType)) {
      const dragState = this.dragStates.get(listenerId);
      if (!dragState || !dragState.active || dragState.usePointerCapture) return;
      
      if (listenerInfo.options.preventDefault) {
        event.preventDefault();
      }
      
      // 델타 계산
      const deltaX = dragState.currentX - dragState.startX;
      const deltaY = dragState.currentY - dragState.startY;
      
      // 범위 제한 확인
      let constrainedDeltaX = deltaX;
      let constrainedDeltaY = deltaY;
      let isOutOfBounds = false;
      
      if (dragState.range && dragState.range !== 'infinite') {
        if (dragState.range.x) {
          const [minX, maxX] = dragState.range.x;
          if (deltaX < minX) {
            constrainedDeltaX = minX;
            isOutOfBounds = true;
          } else if (deltaX > maxX) {
            constrainedDeltaX = maxX;
            isOutOfBounds = true;
          }
        }
        
        if (dragState.range.y) {
          const [minY, maxY] = dragState.range.y;
          if (deltaY < minY) {
            constrainedDeltaY = minY;
            isOutOfBounds = true;
          } else if (deltaY > maxY) {
            constrainedDeltaY = maxY;
            isOutOfBounds = true;
          }
        }
      }
      
      if (listenerInfo.eventType === 'dragend') {
        const additionalData = {
          startX: dragState.startX,
          startY: dragState.startY,
          endX: dragState.currentX,
          endY: dragState.currentY,
          deltaX: constrainedDeltaX,
          deltaY: constrainedDeltaY,
          rawDeltaX: deltaX,
          rawDeltaY: deltaY,
          isOutOfBounds,
          elementRect: dragState.elementRect // 요소 경계 정보 포함
        };
        listenerInfo.callback(this._createUnifiedEvent(event, 'dragend', additionalData));
      }
      
      dragState.active = false;
    }
    
    // 활성 포인터에서 제거
    this._activePointers.delete(pointerId);
  }
  
  /**
   * 전역 취소 이벤트 핸들러.
   * @private
   */
  _handleGlobalCancel(event) {
    // 이미 캡처된 포인터는 여기서 처리하지 않음 (직접 요소의 포인터 이벤트 핸들러에서 처리)
    const pointerId = event.pointerId || 
      (event.changedTouches && event.changedTouches[0] ? event.changedTouches[0].identifier : 1);
    
    if (this.capturedPointers.has(pointerId)) {
      const captureInfo = this.capturedPointers.get(pointerId);
      if (captureInfo && captureInfo.element) {
        this._releasePointerCapture(captureInfo.element, pointerId);
      }
    }
    
    // 활성 리스너 ID 찾기
    const listenerId = this._activePointers.get(pointerId);
    if (!listenerId) return;
    
    // 제스처 상태 초기화
    const gestureState = this.gestureStates.get(listenerId);
    if (gestureState) {
      if (gestureState.timerId) {
        clearTimeout(gestureState.timerId);
      }
      gestureState.active = false;
      gestureState.longClickTriggered = false; // 롱클릭 플래그 초기화
    }
    
    // 드래그 상태 초기화
    const dragState = this.dragStates.get(listenerId);
    if (dragState) {
      dragState.active = false;
    }
    
    // 활성 포인터에서 제거
    this._activePointers.delete(pointerId);
  }

  /**
   * 통합 포인터 이벤트 리스너를 제거합니다.
   * @param {number} listenerId - addEventListener로 반환된 리스너 식별자
   * @returns {boolean} 제거 성공 여부
   */
  removeEventListener(listenerId) {
    const listenerInfo = this.eventListeners.get(listenerId);
    if (!listenerInfo) {
      return false;
    }

    // 네이티브 이벤트 리스너 제거
    listenerInfo.nativeListeners.forEach(({ type, handler, element = listenerInfo.element }) => {
      element.removeEventListener(type, handler, listenerInfo.options);
    });

    // 제스처 상태 정리
    const gestureState = this.gestureStates.get(listenerId);
    if (gestureState && gestureState.timerId) {
      clearTimeout(gestureState.timerId);
    }
    
    // 드래그 상태 정리
    const dragState = this.dragStates.get(listenerId);
    if (dragState && dragState.active) {
      // 캡처된 포인터 해제
      if (dragState.capturedPointer && listenerInfo.element) {
        this._releasePointerCaptureIfExists(listenerInfo.element, dragState.capturedPointer);
      }
    }
    
    // 맵에서 제거
    this.gestureStates.delete(listenerId);
    this.dragStates.delete(listenerId);
    
    // 활성 포인터에서 이 리스너 관련 항목 모두 제거
    for (const [pointerId, id] of this._activePointers.entries()) {
      if (id === listenerId) {
        this._activePointers.delete(pointerId);
      }
    }
    
    // 이벤트 리스너 맵에서 제거
    this.eventListeners.delete(listenerId);
    
    // 전역 핸들러 카운트 감소 및 필요시 제거
    this._globalHandlerCount--;
    if (this._globalHandlerCount <= 0) {
      this._unregisterGlobalHandlersIfNeeded();
    }
    
    return true;
  }

  /**
   * 요소에 등록된 모든 이벤트 리스너를 제거합니다.
   * @param {HTMLElement} element - 이벤트 리스너를 제거할 요소
   */
  removeAllEventListeners(element) {
    // 제거할 리스너 ID 목록 수집
    const listenerIdsToRemove = [];
    
    this.eventListeners.forEach((listenerInfo, listenerId) => {
      if (listenerInfo.element === element) {
        listenerIdsToRemove.push(listenerId);
      }
    });
    
    // 수집된 리스너 제거
    listenerIdsToRemove.forEach(id => this.removeEventListener(id));
  }
  
  /**
   * 모든 이벤트 리스너를 제거하고 리소스를 정리합니다.
   */
  dispose() {
    // 모든 리스너 제거
    this.eventListeners.forEach((_, listenerId) => {
      this.removeEventListener(listenerId);
    });
    
    // 전역 이벤트 핸들러 제거
    if (this._hasRegisteredGlobalHandlers) {
      this._unregisterGlobalHandlersIfNeeded();
    }
    
    // 맵 비우기
    this.eventListeners.clear();
    this.gestureStates.clear();
    this.dragStates.clear();
    this._activePointers.clear();
    this.capturedPointers.clear();
    this._globalHandlerCount = 0;
  }
  
  /**
   * 현재 활성 리스너 수를 반환합니다.
   */
  getActiveListenerCount() {
    return this.eventListeners.size;
  }
  
  /**
   * 캡처된 포인터 수를 반환합니다.
   */
  getCapturedPointerCount() {
    return this.capturedPointers.size;
  }
  
  /**
   * 디버그 모드를 활성화/비활성화합니다.
   * @param {boolean} enabled - 활성화 여부
   */
  setDebugMode(enabled) {
    this.debugMode = !!enabled;
    return this;
  }
}

// 단일 인스턴스 생성 및 내보내기
const unifiedPointerEvents = new UnifiedPointerEvents();

// 모듈로 내보내기
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = unifiedPointerEvents;
} else {
  window.unifiedPointerEvents = unifiedPointerEvents;
}