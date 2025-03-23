/**
 * 클릭, 터치, 펜 입력을 통합적으로 처리하는 개선된 이벤트 매니저
 * 모든 입력 방식에 대해 일관된 이벤트 핸들링을 제공합니다.
 * 롱클릭, 더블클릭, 스와이프, 드래그, 플링, 회전, 핀치줌 기능을 지원합니다.
 * setPointerCapture/releasePointerCapture API를 활용하여 향상된 제어 기능을 제공합니다.
 * version 1.3.1
 */
class UnifiedPointerEvents {
  constructor() {
    // 이벤트 리스너 관리
    this.eventListeners = new Map(); // id -> 리스너 정보
    this.listenerCounter = 0;
    
    // 디버그 모드 (콘솔 로그 활성화/비활성화)
    this.debugMode = false;
    
    // 기본 설정값
    this.defaults = {
      longClickDelay: 500,
      doubleClickDelay: 300,
      swipeThreshold: 50,
      swipeTimeout: 300,
      flingMinVelocity: 600,   // 플링 최소 속도 (px/s)
      flingDecay: 0.95,        // 플링 감속 계수
      usePointerCapture: true, // setPointerCapture 사용 여부 기본값
      touchOffsetX: 0,         // 터치 이벤트의 X축 오프셋
      touchOffsetY: -20,       // 터치 이벤트의 Y축 오프셋 (위쪽으로 20px)
      rotateStepDeg: 5,        // 회전 단계 (도)
      pinchZoomStep: 0.05,     // 핀치줌 단계
      minScale: 0.1,           // 최소 배율
      maxScale: 10.0,          // 최대 배율
      touchFingerDistance: 30  // 멀티터치 최소 거리(px)
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
      'longclick', 'doubleclick', 'swipe', 'fling',
      'dragstart', 'drag', 'dragend',
      'gotcapture', 'lostcapture',
      'rotate', 'pinchzoom' // 제스처 이벤트
    ]);
    
    // 활성 멀티터치 추적
    this._activeTouches = new Map(); // touchId -> touchInfo
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
    
    // 요소, 이벤트 타입, 콜백 함수 조합이 이미 등록되어 있는지 확인
    let existingListenerId = this._findExistingListener(element, eventType, callback);
    if (existingListenerId !== null) {
      this._debug(`중복 이벤트 리스너 감지: element=${element}, eventType=${eventType}, 기존 리스너 ID 반환: ${existingListenerId}`);
      return existingListenerId;
    }

    const listenerId = this.listenerCounter++;
    const listenerInfo = { 
      element, 
      eventType, 
      callback, 
      options, 
      nativeListeners: [],
      state: {} // 이벤트 상태를 저장할 객체 (리스너별 독립 상태)
    };

    // 제스처 이벤트와 드래그 이벤트는 다른 방식으로 처리
    if (['longclick', 'doubleclick', 'swipe', 'fling', 'rotate', 'pinchzoom'].includes(eventType)) {
      this._setupGestureEvents(element, eventType, callback, options, listenerId, listenerInfo);
    } 
    else if (['dragstart', 'drag', 'dragend'].includes(eventType)) {
      this._setupDragEvents(element, eventType, callback, options, listenerId, listenerInfo);
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
   * 이미 등록된 동일한 리스너가 있는지 확인합니다.
   * @private
   * @param {HTMLElement} element - 이벤트 대상 요소
   * @param {string} eventType - 이벤트 유형
   * @param {Function} callback - 콜백 함수
   * @returns {number|null} 기존 리스너 ID 또는 없으면 null
   */
  _findExistingListener(element, eventType, callback) {
    // 모든 리스너를 순회하며 동일한 조합이 있는지 확인
    for (const [id, info] of this.eventListeners.entries()) {
      if (info.element === element && 
          info.eventType === eventType && 
          info.callback === callback) {
        return id;
      }
    }
    return null;
  }

  /**
   * 이벤트 리스너 등록 헬퍼 함수
   * @private
   * @param {HTMLElement} element - 이벤트 대상 요소
   * @param {boolean} hasPointerEvents - 포인터 이벤트 지원 여부
   * @param {Array} eventMappings - 이벤트 매핑 배열 [{type, handler}]
   * @param {Object} options - 이벤트 리스너 옵션
   * @param {Object} listenerInfo - 리스너 정보
   */
  _registerEventListeners(element, hasPointerEvents, eventMappings, options, listenerInfo) {
    if (hasPointerEvents) {
      eventMappings.forEach(mapping => {
        const pointerType = this._eventMapping.pointer[mapping.type] || mapping.type;
        element.addEventListener(pointerType, mapping.handler, options);
        listenerInfo.nativeListeners.push({
          type: pointerType,
          handler: mapping.handler,
          element,
          options
        });
      });
    } else {
      eventMappings.forEach(mapping => {
        // 터치 이벤트
        const touchType = this._eventMapping.touch[mapping.type] || mapping.type;
        element.addEventListener(touchType, mapping.handler, options);
        listenerInfo.nativeListeners.push({
          type: touchType,
          handler: mapping.handler,
          element,
          options
        });
        
        // 마우스 이벤트
        const mouseType = this._eventMapping.mouse[mapping.type] || mapping.type;
        element.addEventListener(mouseType, mapping.handler, options);
        listenerInfo.nativeListeners.push({
          type: mouseType,
          handler: mapping.handler,
          element,
          options
        });
      });
    }
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
    
    // 리스너 옵션 설정
    const listenerOptions = {
      ...options,
      passive: options.preventDefault ? false : options.passive
    };
    
    // 이벤트 리스너 등록 헬퍼 사용
    this._registerEventListeners(
      element, 
      hasPointerEvents, 
      [{ type: eventType, handler: handleEvent }], 
      listenerOptions, 
      listenerInfo
    );
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
    
    const listenerOptions = {
      ...options,
      passive: options.preventDefault ? false : options.passive
    };
    
    element.addEventListener(captureEventType, captureHandler, listenerOptions);
    
    listenerInfo.nativeListeners.push({ 
      type: captureEventType, 
      handler: captureHandler, 
      element,
      options: listenerOptions
    });
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
    else if (originalEvent.type === 'wheel') {
      // 휠 이벤트 처리
      pointerType = 'mouse';
      pointerId = 1;
      clientX = originalEvent.clientX || 0;
      clientY = originalEvent.clientY || 0;
      pageX = originalEvent.pageX || clientX;
      pageY = originalEvent.pageY || clientY;
      isPrimary = true;
      pressure = 0;
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
  _setupGestureEvents(element, eventType, callback, options, listenerId, listenerInfo) {
    // 기본 옵션과 사용자 옵션 병합
    const longClickDelay = options.longClickDelay || this.defaults.longClickDelay;
    const doubleClickDelay = options.doubleClickDelay || this.defaults.doubleClickDelay;
    const swipeThreshold = options.swipeThreshold || this.defaults.swipeThreshold;
    const swipeTimeout = options.swipeTimeout || this.defaults.swipeTimeout;
    const flingMinVelocity = options.flingMinVelocity || this.defaults.flingMinVelocity;
    const flingDecay = options.flingDecay || this.defaults.flingDecay;
    const rotateStepDeg = options.rotateStepDeg || this.defaults.rotateStepDeg;
    const pinchZoomStep = options.pinchZoomStep || this.defaults.pinchZoomStep;
    const preventDefault = options.preventDefault || false;
    const usePointerCapture = options.usePointerCapture !== undefined 
      ? options.usePointerCapture 
      : this.defaults.usePointerCapture;
    
    // 제스처 상태 초기화 - 리스너 정보 내에 상태 저장
    const state = listenerInfo.state;
    state.timerId = null;
    state.lastTapTime = 0;
    state.startX = 0;
    state.startY = 0;
    state.startTime = 0;
    state.active = false;
    state.usePointerCapture = usePointerCapture;
    state.longClickTriggered = false;
    state.gestureCompleted = false;
    state.endHandlersRegistered = false;
    state.currentPointerId = null;
    state.swipeTracking = {
      active: false,
      startX: 0,
      startY: 0,
      startTime: 0,
      currentX: 0,
      currentY: 0,
      pointerId: null
    };
    state.flingTracking = {
      active: false,
      points: [],  // 속도 계산을 위한 최근 포인트 기록
      velocityX: 0,
      velocityY: 0,
      pointerId: null
    };
    
    // rotate와 pinchzoom을 위한 상태 초기화
    state.rotateTracking = {
      active: false,
      startAngle: 0,
      currentAngle: 0,
      rotation: 0,
      pointerId: null,
      centerX: 0,
      centerY: 0,
      penInitialRotation: 0,
      // 멀티터치 회전을 위한 추가 상태
      touch1: { id: null, startX: 0, startY: 0, currentX: 0, currentY: 0 },
      touch2: { id: null, startX: 0, startY: 0, currentX: 0, currentY: 0 },
      initialAngle: 0,
      lastAngle: 0,
      totalRotation: 0
    };
    
    state.pinchZoomTracking = {
      active: false,
      startDistance: 0,
      currentDistance: 0,
      pointerId1: null,
      pointerId2: null,
      scale: 1.0,
      // 멀티터치 핀치줌을 위한 추가 상태
      touch1: { id: null, startX: 0, startY: 0, currentX: 0, currentY: 0 },
      touch2: { id: null, startX: 0, startY: 0, currentX: 0, currentY: 0 },
      initialDistance: 0,
      lastDistance: 0,
      totalScale: 1.0
    };

    // 리스너 옵션 설정
    const listenerOptions = {
      ...options,
      passive: options.preventDefault ? false : options.passive
    };

    // 이벤트 핸들러 설정
    if (eventType === 'longclick') {
      this._setupLongClickEvents(element, callback, listenerOptions, listenerId, listenerInfo, longClickDelay);
    } 
    else if (eventType === 'doubleclick') {
      this._setupDoubleClickEvents(element, callback, listenerOptions, listenerId, listenerInfo, doubleClickDelay);
    } 
    else if (eventType === 'swipe') {
      this._setupSwipeEvents(element, callback, listenerOptions, listenerId, listenerInfo, swipeThreshold, swipeTimeout);
    }
    else if (eventType === 'fling') {
      this._setupFlingEvents(element, callback, listenerOptions, listenerId, listenerInfo, flingMinVelocity, flingDecay);
    }
    else if (eventType === 'rotate') {
      this._setupRotateEvents(element, callback, listenerOptions, listenerId, listenerInfo, rotateStepDeg);
    }
    else if (eventType === 'pinchzoom') {
      this._setupPinchZoomEvents(element, callback, listenerOptions, listenerId, listenerInfo, pinchZoomStep);
    }
  }

  /**
   * 롱클릭 이벤트 설정
   * @private
   */
  _setupLongClickEvents(element, callback, options, listenerId, listenerInfo, longClickDelay) {
    const state = listenerInfo.state;
    const hasPointerEvents = 'PointerEvent' in window;
    
    // 시작 이벤트 핸들러
    const startHandler = (event) => {
      if (options.preventDefault) {
        event.preventDefault();
      }
      
      const clientX = event.clientX || (event.touches && event.touches[0] ? event.touches[0].clientX : 0);
      const clientY = event.clientY || (event.touches && event.touches[0] ? event.touches[0].clientY : 0);
      const pointerId = event.pointerId || (event.touches && event.touches[0] ? event.touches[0].identifier : 1);
      
      // 이미 같은 포인터로 처리 중인 제스처가 있으면 무시
      if (state.currentPointerId === pointerId && state.active) {
        this._debug('같은 포인터 ID로 이미 처리 중인 제스처가 있습니다');
        return;
      }
      
      // 이미 완료된 제스처가 있고 활성 상태가 아니면 재설정 허용
      if (state.gestureCompleted && !state.active) {
        this._debug('이전 제스처 완료 상태 초기화');
        state.gestureCompleted = false;
      }
      
      // 새 제스처 시작
      state.active = true;
      state.startX = clientX;
      state.startY = clientY;
      state.startTime = Date.now();
      state.longClickTriggered = false; // 롱클릭 플래그 초기화
      state.currentPointerId = pointerId;
      
      // 포인터 캡처 설정 (지원되는 경우)
      if (state.usePointerCapture && 'setPointerCapture' in element && pointerId !== undefined) {
        this._debug(`제스처 이벤트에 대한 포인터 캡처 설정: pointerId=${pointerId}`);
        try {
          element.setPointerCapture(pointerId);
        } catch (e) {
          this._debug('포인터 캡처 설정 실패:', e.message);
        }
      }
      
      // 이전 타이머가 있다면 취소
      if (state.timerId) {
        clearTimeout(state.timerId);
        state.timerId = null;
      }
      
      // 롱클릭 핸들러 - 지연 후 실행
      state.timerId = setTimeout(() => {
        // 중요한 수정: 이미 완료된 경우, 또는 활성 상태가 아닌 경우, 또는 포인터가 변경된 경우 무시
        if (!state.active || state.longClickTriggered || 
            state.gestureCompleted || state.currentPointerId !== pointerId) {
          this._debug('롱클릭 타이머 무시 - 이미 처리됨 또는 상태 변경됨');
          return;
        }
        
        state.longClickTriggered = true; // 롱클릭 발생 표시
        state.gestureCompleted = true; // 제스처 완료 표시
        
        const additionalData = {
          duration: longClickDelay,
          startX: state.startX,
          startY: state.startY
        };
        
        // 롱클릭 이벤트 발생
        this._debug('롱클릭 이벤트 발생');
        callback(this._createUnifiedEvent(event, 'longclick', additionalData));
      }, longClickDelay);
    };
    
    // 종료 이벤트 핸들러
    const endHandler = (event) => {
      const endPointerId = event.pointerId || (event.changedTouches && event.changedTouches[0] ? event.changedTouches[0].identifier : 1);
      
      // 현재 처리 중인 포인터와 다른 포인터의 종료 이벤트는 무시
      if (state.currentPointerId !== endPointerId) {
        return;
      }
      
      if (state.active) {
        const clickDuration = Date.now() - state.startTime;
        
        // 짧은 클릭인 경우 롱클릭 취소
        if (clickDuration < longClickDelay && state.timerId) {
          clearTimeout(state.timerId);
          state.timerId = null;
          this._debug('일반 클릭 감지됨, 롱클릭 취소');
        }
        
        // 제스처 상태 초기화
        state.active = false;
        
        // 포인터 캡처 해제
        if (state.usePointerCapture && 'releasePointerCapture' in element && endPointerId !== undefined) {
          try {
            element.releasePointerCapture(endPointerId);
          } catch (e) {
            this._debug('포인터 캡처 해제 실패:', e.message);
          }
        }
        
        // 약간의 지연 후에만 제스처 상태 완전 초기화
        setTimeout(() => {
          state.currentPointerId = null; // 포인터 ID 초기화
          
          // 롱클릭이 발생했었으면 상태 초기화
          if (state.longClickTriggered) {
            state.longClickTriggered = false;
            state.gestureCompleted = false;
            this._debug('롱클릭 후 제스처 상태 초기화됨');
          }
        }, 300); // 약간 더 긴 지연으로 우발적 재실행 방지
      }
    };
    
    // 취소 이벤트 핸들러
    const cancelHandler = (event) => {
      // 현재 처리 중인 포인터 ID와 일치하는 경우에만 처리
      if (state.currentPointerId === event.pointerId || event.pointerId === undefined) {
        if (state.timerId) {
          clearTimeout(state.timerId);
          state.timerId = null;
        }
        
        state.active = false;
        
        // 포인터 ID는 즉시 초기화
        state.currentPointerId = null;
        
        // 롱클릭 발생 여부와 관계없이 모든 상태 초기화
        setTimeout(() => {
          state.longClickTriggered = false;
          state.gestureCompleted = false;
          this._debug('취소로 인한 롱클릭 상태 초기화');
        }, 100);
      }
    };
    
    // 이벤트 리스너 등록 (헬퍼 함수 사용)
    this._registerEventListeners(
      element, 
      hasPointerEvents, 
      [
        { type: 'start', handler: startHandler },
        { type: 'end', handler: endHandler },
        { type: 'cancel', handler: cancelHandler }
      ], 
      options, 
      listenerInfo
    );
    
    // 포인터 이벤트일 경우 pointerleave 이벤트도 등록
    if (hasPointerEvents) {
      element.addEventListener('pointerleave', cancelHandler, options);
      listenerInfo.nativeListeners.push({
        type: 'pointerleave',
        handler: cancelHandler,
        element,
        options
      });
    }
  }

  /**
   * 더블클릭 이벤트 설정
   * @private
   */
  _setupDoubleClickEvents(element, callback, options, listenerId, listenerInfo, doubleClickDelay) {
    const state = listenerInfo.state;
    const hasPointerEvents = 'PointerEvent' in window;
    
    // 시작 이벤트 핸들러
    const startHandler = (event) => {
      if (options.preventDefault) {
        event.preventDefault();
      }
      
      const clientX = event.clientX || (event.touches && event.touches[0] ? event.touches[0].clientX : 0);
      const clientY = event.clientY || (event.touches && event.touches[0] ? event.touches[0].clientY : 0);
      const pointerId = event.pointerId || (event.touches && event.touches[0] ? event.touches[0].identifier : 1);
      
      // 이미 같은 포인터로 처리 중인 제스처가 있으면 무시
      if (state.currentPointerId === pointerId && state.active) {
        this._debug('같은 포인터 ID로 이미 처리 중인 제스처가 있습니다');
        return;
      }
      
      const now = Date.now();
      const timeSinceLastTap = now - state.lastTapTime;
      
      // 더블클릭 감지 - 지연 시간 내에 두 번째 탭이 있고 아직 완료되지 않은 경우
      if (timeSinceLastTap < doubleClickDelay && !state.gestureCompleted) {
        const additionalData = {
          interval: timeSinceLastTap,
          startX: state.startX,
          startY: state.startY
        };
        
        // 더블클릭 감지 및 완료 표시 
        state.gestureCompleted = true;
        this._debug('더블클릭 이벤트 발생');
        callback(this._createUnifiedEvent(event, 'doubleclick', additionalData));
        state.lastTapTime = 0; // 탭 타임 초기화
        
        // 제스처 상태 초기화
        setTimeout(() => {
          state.active = false;
          state.gestureCompleted = false;
          state.currentPointerId = null; // 포인터 ID 초기화
          this._debug('더블클릭 후 제스처 상태 초기화됨');
        }, 300); // 약간 더 긴 지연으로 우발적 재실행 방지
      } else {
        // 첫 번째 탭 기록
        state.active = true;
        state.startX = clientX;
        state.startY = clientY;
        state.lastTapTime = now;
        state.currentPointerId = pointerId;
        
        // 포인터 캡처 설정 (지원되는 경우)
        if (state.usePointerCapture && 'setPointerCapture' in element && pointerId !== undefined) {
          this._debug(`더블클릭 이벤트에 대한 포인터 캡처 설정: pointerId=${pointerId}`);
          try {
            element.setPointerCapture(pointerId);
          } catch (e) {
            this._debug('포인터 캡처 설정 실패:', e.message);
          }
        }
      }
    };
    
    // 종료 이벤트 핸들러
    const endHandler = (event) => {
      const endPointerId = event.pointerId || (event.changedTouches && event.changedTouches[0] ? event.changedTouches[0].identifier : 1);
      
      // 현재 처리 중인 포인터와 다른 포인터의 종료 이벤트는 무시
      if (state.currentPointerId !== endPointerId) {
        return;
      }
      
      if (state.active) {
        // 제스처 상태 초기화
        state.active = false;
        
        // 포인터 캡처 해제
        if (state.usePointerCapture && 'releasePointerCapture' in element && endPointerId !== undefined) {
          try {
            element.releasePointerCapture(endPointerId);
          } catch (e) {
            this._debug('포인터 캡처 해제 실패:', e.message);
          }
        }
        
        // 더블클릭 시간이 초과되면 상태 재설정 (첫 번째 클릭 후 일정 시간 지났을 때)
        setTimeout(() => {
          if (Date.now() - state.lastTapTime > doubleClickDelay) {
            state.currentPointerId = null; // 포인터 ID 초기화
            state.lastTapTime = 0;
            state.gestureCompleted = false;
            this._debug('더블클릭 시간 초과, 상태 재설정됨');
          }
        }, doubleClickDelay + 50);
      }
    };
    
    // 취소 이벤트 핸들러
    const cancelHandler = (event) => {
      // 현재 처리 중인 포인터 ID와 일치하는 경우에만 처리
      if (state.currentPointerId === event.pointerId || event.pointerId === undefined) {
        state.active = false;
        state.currentPointerId = null;
        
        // 더블클릭 타이밍 초기화 안 함 (다음 클릭에서 더블클릭으로 인식할 수 있도록)
      }
    };
    
    // 이벤트 리스너 등록 (헬퍼 함수 사용)
    this._registerEventListeners(
      element, 
      hasPointerEvents, 
      [
        { type: 'start', handler: startHandler },
        { type: 'end', handler: endHandler },
        { type: 'cancel', handler: cancelHandler }
      ], 
      options, 
      listenerInfo
    );
    
    // 포인터 이벤트일 경우 pointerleave 이벤트도 등록
    if (hasPointerEvents) {
      element.addEventListener('pointerleave', cancelHandler, options);
      listenerInfo.nativeListeners.push({
        type: 'pointerleave',
        handler: cancelHandler,
        element,
        options
      });
    }
  }

  /**
   * 스와이프 이벤트 설정
   * @private
   */
  _setupSwipeEvents(element, callback, options, listenerId, listenerInfo, swipeThreshold, swipeTimeout) {
    const state = listenerInfo.state;
    const swipeTracking = state.swipeTracking;
    const hasPointerEvents = 'PointerEvent' in window;
    
    // 시작 이벤트 핸들러
    const startHandler = (event) => {
      if (options.preventDefault) {
        event.preventDefault();
      }
      
      const clientX = event.clientX || (event.touches && event.touches[0] ? event.touches[0].clientX : 0);
      const clientY = event.clientY || (event.touches && event.touches[0] ? event.touches[0].clientY : 0);
      const pointerId = event.pointerId || (event.touches && event.touches[0] ? event.touches[0].identifier : 1);
      
      // 이미 같은 포인터로 처리 중인 제스처가 있으면 무시
      if (state.currentPointerId === pointerId && state.active) {
        this._debug('같은 포인터 ID로 이미 처리 중인 스와이프가 있습니다');
        return;
      }
      
      // 새로운 스와이프 시작
      state.active = true;
      state.gestureCompleted = false; // 제스처 완료 플래그 초기화
      state.currentPointerId = pointerId; // 현재 처리 중인 포인터 ID 저장
      
      swipeTracking.active = true;
      swipeTracking.pointerId = pointerId;
      swipeTracking.startX = clientX;
      swipeTracking.startY = clientY;
      swipeTracking.currentX = clientX;
      swipeTracking.currentY = clientY;
      swipeTracking.startTime = Date.now();
      
      this._debug(`스와이프 시작: ID=${pointerId}, X=${swipeTracking.startX}, Y=${swipeTracking.startY}`);
      
      // 포인터 캡처 설정 (지원되는 경우)
      if (state.usePointerCapture && 'setPointerCapture' in element && pointerId !== undefined) {
        this._debug(`스와이프 이벤트에 대한 포인터 캡처 설정: pointerId=${pointerId}`);
        try {
          element.setPointerCapture(pointerId);
        } catch (e) {
          this._debug('포인터 캡처 설정 실패:', e.message);
        }
      }
    };
    
    // 이동 이벤트 핸들러
    const moveHandler = (event) => {
      const clientX = event.clientX || (event.touches && event.touches[0] ? event.touches[0].clientX : 0);
      const clientY = event.clientY || (event.touches && event.touches[0] ? event.touches[0].clientY : 0);
      const pointerId = event.pointerId || (event.touches && event.touches[0] ? event.touches[0].identifier : 1);
      
      // 현재 추적 중인 포인터 ID가 다르면 무시
      if (swipeTracking.pointerId !== pointerId) {
        return;
      }
      
      if (!swipeTracking.active || state.gestureCompleted) return;
      
      swipeTracking.currentX = clientX;
      swipeTracking.currentY = clientY;
    };
    
    // 종료 이벤트 핸들러
    const endHandler = (event) => {
      const eventPointerId = event.pointerId || (event.changedTouches && event.changedTouches[0] ? event.changedTouches[0].identifier : 1);
      
      // 현재 추적 중인 포인터 ID가 다르면 무시
      if (swipeTracking.pointerId !== eventPointerId) {
        return;
      }
      
      if (!swipeTracking.active || state.gestureCompleted) return;
      
      const now = Date.now();
      const deltaTime = now - swipeTracking.startTime;
      
      // 포인터 캡처 해제
      if (state.usePointerCapture && 'releasePointerCapture' in element && eventPointerId !== undefined) {
        try {
          element.releasePointerCapture(eventPointerId);
        } catch (e) {
          this._debug('포인터 캡처 해제 실패:', e.message);
        }
      }
      
      // 시간 제한 확인
      if (deltaTime <= swipeTimeout) {
        const deltaX = swipeTracking.currentX - swipeTracking.startX;
        const deltaY = swipeTracking.currentY - swipeTracking.startY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // 거리 임계값 확인
        if (distance >= swipeThreshold) {
          // 방향 결정
          let direction;
          const absX = Math.abs(deltaX);
          const absY = Math.abs(deltaY);
          
          if (absX > absY) {
            direction = deltaX > 0 ? 'right' : 'left';
          } else {
            direction = deltaY > 0 ? 'down' : 'up';
          }
          
          // 스와이프 감지 시 완료 상태로 표시
          state.gestureCompleted = true;
          
          // 스와이프 이벤트 발생
          const additionalData = {
            direction,
            distance,
            deltaX,
            deltaY,
            duration: deltaTime,
            speed: distance / deltaTime,
            startX: swipeTracking.startX,
            startY: swipeTracking.startY,
            endX: swipeTracking.currentX,
            endY: swipeTracking.currentY
          };
          
          this._debug(`스와이프 감지: 방향=${direction}, 거리=${Math.round(distance)}, 속도=${Math.round(distance/deltaTime*1000)}px/s`);
          callback(this._createUnifiedEvent(event, 'swipe', additionalData));
        }
      }
      
      // 스와이프 상태 초기화
      swipeTracking.active = false;
      swipeTracking.pointerId = null;
      state.active = false;
      state.currentPointerId = null;
      
      // 일정 시간 후에 제스처 완료 상태 재설정
      setTimeout(() => {
        state.gestureCompleted = false;
        this._debug('스와이프 후 제스처 상태 재설정됨');
      }, 300); // 약간 더 긴 지연으로 우발적 재실행 방지
    };
    
    // 취소 이벤트 핸들러
    const cancelHandler = (event) => {
      const eventPointerId = event.pointerId || (event.changedTouches && event.changedTouches[0] ? event.changedTouches[0].identifier : 1);
      
      // 현재 추적 중인 포인터 ID가 다르면 무시
      if (swipeTracking.pointerId !== eventPointerId) {
        return;
      }
      
      // 포인터 캡처 해제
      if (state.usePointerCapture && 'releasePointerCapture' in element && eventPointerId !== undefined) {
        try {
          element.releasePointerCapture(eventPointerId);
        } catch (e) {
          this._debug('포인터 캡처 해제 실패:', e.message);
        }
      }
      
      swipeTracking.active = false;
      swipeTracking.pointerId = null;
      state.active = false;
      state.currentPointerId = null;
      
      // 취소 시에도 제스처 완료 상태 재설정
      setTimeout(() => {
        state.gestureCompleted = false;
        this._debug('스와이프 취소 후 제스처 상태 재설정됨');
      }, 300);
    };
    
    // 이벤트 리스너 등록 (헬퍼 함수 사용)
    this._registerEventListeners(
      element, 
      hasPointerEvents, 
      [
        { type: 'start', handler: startHandler },
        { type: 'move', handler: moveHandler },
        { type: 'end', handler: endHandler },
        { type: 'cancel', handler: cancelHandler }
      ], 
      options, 
      listenerInfo
    );
    
    // 포인터 이벤트일 경우 pointerleave 이벤트도 등록
    if (hasPointerEvents) {
      element.addEventListener('pointerleave', cancelHandler, options);
      listenerInfo.nativeListeners.push({
        type: 'pointerleave',
        handler: cancelHandler,
        element,
        options
      });
    }
  }

  /**
   * 플링 이벤트 설정
   * 포인터를 빠르게 움직인 후 떼면 발생하는 이벤트
   * @private
   */
  _setupFlingEvents(element, callback, options, listenerId, listenerInfo, flingMinVelocity, flingDecay) {
    const state = listenerInfo.state;
    const flingTracking = state.flingTracking;
    const hasPointerEvents = 'PointerEvent' in window;
    
    // 속도 계산을 위한 이동 포인트 최대 개수
    const MAX_VELOCITY_POINTS = 5;
    
    // 시작 이벤트 핸들러
    const startHandler = (event) => {
      if (options.preventDefault) {
        event.preventDefault();
      }
      
      const clientX = event.clientX || (event.touches && event.touches[0] ? event.touches[0].clientX : 0);
      const clientY = event.clientY || (event.touches && event.touches[0] ? event.touches[0].clientY : 0);
      const pointerId = event.pointerId || (event.touches && event.touches[0] ? event.touches[0].identifier : 1);
      const timestamp = Date.now();
      
      // 이미 같은 포인터로 처리 중인 제스처가 있으면 무시
      if (state.currentPointerId === pointerId && state.active) {
        this._debug('같은 포인터 ID로 이미 처리 중인 플링 제스처가 있습니다');
        return;
      }
      
      // 새로운 플링 추적 시작
      state.active = true;
      state.gestureCompleted = false;
      state.currentPointerId = pointerId;
      
      flingTracking.active = true;
      flingTracking.pointerId = pointerId;
      flingTracking.points = [{ x: clientX, y: clientY, timestamp }];
      flingTracking.velocityX = 0;
      flingTracking.velocityY = 0;
      
      this._debug(`플링 추적 시작: ID=${pointerId}, X=${clientX}, Y=${clientY}`);
      
      // 포인터 캡처 설정 (지원되는 경우)
      if (state.usePointerCapture && 'setPointerCapture' in element && pointerId !== undefined) {
        this._debug(`플링 이벤트에 대한 포인터 캡처 설정: pointerId=${pointerId}`);
        try {
          element.setPointerCapture(pointerId);
        } catch (e) {
          this._debug('포인터 캡처 설정 실패:', e.message);
        }
      }
    };
    
    // 이동 이벤트 핸들러
    const moveHandler = (event) => {
      const clientX = event.clientX || (event.touches && event.touches[0] ? event.touches[0].clientX : 0);
      const clientY = event.clientY || (event.touches && event.touches[0] ? event.touches[0].clientY : 0);
      const pointerId = event.pointerId || (event.touches && event.touches[0] ? event.touches[0].identifier : 1);
      const timestamp = Date.now();
      
      // 현재 추적 중인 포인터 ID가 다르면 무시
      if (flingTracking.pointerId !== pointerId) {
        return;
      }
      
      if (!flingTracking.active || state.gestureCompleted) return;
      
      // 이동 포인트 추적 (가장 최근 포인트만 유지)
      flingTracking.points.push({ x: clientX, y: clientY, timestamp });
      
      // 최대 개수 유지
      if (flingTracking.points.length > MAX_VELOCITY_POINTS) {
        flingTracking.points.shift();
      }
    };
    
    // 종료 이벤트 핸들러
    const endHandler = (event) => {
      const eventPointerId = event.pointerId || (event.changedTouches && event.changedTouches[0] ? event.changedTouches[0].identifier : 1);
      
      // 현재 추적 중인 포인터 ID가 다르면 무시
      if (flingTracking.pointerId !== eventPointerId) {
        return;
      }
      
      if (!flingTracking.active || state.gestureCompleted) return;
      
      // 포인터 캡처 해제
      if (state.usePointerCapture && 'releasePointerCapture' in element && eventPointerId !== undefined) {
        try {
          element.releasePointerCapture(eventPointerId);
        } catch (e) {
          this._debug('포인터 캡처 해제 실패:', e.message);
        }
      }
      
      // 속도 계산
      if (flingTracking.points.length >= 2) {
        const lastPoint = flingTracking.points[flingTracking.points.length - 1];
        const firstPoint = flingTracking.points[0];
        
        const deltaX = lastPoint.x - firstPoint.x;
        const deltaY = lastPoint.y - firstPoint.y;
        const deltaTime = (lastPoint.timestamp - firstPoint.timestamp) / 1000; // 초 단위로 변환
        
        if (deltaTime > 0) {
          // 속도 계산 (픽셀/초)
          flingTracking.velocityX = deltaX / deltaTime;
          flingTracking.velocityY = deltaY / deltaTime;
          
          // 속도의 크기 계산
          const velocity = Math.sqrt(flingTracking.velocityX * flingTracking.velocityX + 
                                    flingTracking.velocityY * flingTracking.velocityY);
          
          this._debug(`플링 속도 계산: ${Math.round(velocity)}px/s (X: ${Math.round(flingTracking.velocityX)}, Y: ${Math.round(flingTracking.velocityY)})`);
          
          // 최소 속도 이상인 경우 플링 이벤트 발생
          if (velocity >= flingMinVelocity) {
            // 방향 결정
            let direction;
            const absVelocityX = Math.abs(flingTracking.velocityX);
            const absVelocityY = Math.abs(flingTracking.velocityY);
            
            if (absVelocityX > absVelocityY) {
              direction = flingTracking.velocityX > 0 ? 'right' : 'left';
            } else {
              direction = flingTracking.velocityY > 0 ? 'down' : 'up';
            }
            
            // 플링 감지 시 완료 상태로 표시
            state.gestureCompleted = true;
            
            // 플링 이벤트 발생
            const additionalData = {
              direction,
              velocity,
              velocityX: flingTracking.velocityX,
              velocityY: flingTracking.velocityY,
              decay: flingDecay, // 감속 계수
              startPoint: firstPoint,
              endPoint: lastPoint,
              deltaTime,
              // 플링 후 위치 예측 값 (특정 시간 후의 위치 추정)
              // 예: 0.5초 후 위치 = 현재위치 + 속도*시간*감속계수
              predictPosition: (time) => {
                const dampingFactor = Math.pow(flingDecay, time * 60); // 60fps 기준 감쇠 계수
                return {
                  x: lastPoint.x + flingTracking.velocityX * time * dampingFactor,
                  y: lastPoint.y + flingTracking.velocityY * time * dampingFactor
                };
              }
            };
            
            this._debug(`플링 감지: 방향=${direction}, 속도=${Math.round(velocity)}px/s`);
            callback(this._createUnifiedEvent(event, 'fling', additionalData));
          }
        }
      }
      
      // 플링 상태 초기화
      flingTracking.active = false;
      flingTracking.pointerId = null;
      flingTracking.points = [];
      state.active = false;
      state.currentPointerId = null;
      
      // 일정 시간 후에 제스처 완료 상태 재설정
      setTimeout(() => {
        state.gestureCompleted = false;
        this._debug('플링 후 제스처 상태 재설정됨');
      }, 300);
    };
    
    // 취소 이벤트 핸들러
    const cancelHandler = (event) => {
      const eventPointerId = event.pointerId || (event.changedTouches && event.changedTouches[0] ? event.changedTouches[0].identifier : 1);
      
      // 현재 추적 중인 포인터 ID가 다르면 무시
      if (flingTracking.pointerId !== eventPointerId) {
        return;
      }
      
      // 포인터 캡처 해제
      if (state.usePointerCapture && 'releasePointerCapture' in element && eventPointerId !== undefined) {
        try {
          element.releasePointerCapture(eventPointerId);
        } catch (e) {
          this._debug('포인터 캡처 해제 실패:', e.message);
        }
      }
      
      flingTracking.active = false;
      flingTracking.pointerId = null;
      flingTracking.points = [];
      state.active = false;
      state.currentPointerId = null;
      
      // 취소 시에도 제스처 완료 상태 재설정
      setTimeout(() => {
        state.gestureCompleted = false;
        this._debug('플링 취소 후 제스처 상태 재설정됨');
      }, 300);
    };
    
    // 이벤트 리스너 등록 (헬퍼 함수 사용)
    this._registerEventListeners(
      element, 
      hasPointerEvents, 
      [
        { type: 'start', handler: startHandler },
        { type: 'move', handler: moveHandler },
        { type: 'end', handler: endHandler },
        { type: 'cancel', handler: cancelHandler }
      ], 
      options, 
      listenerInfo
    );
    
    // 포인터 이벤트일 경우 pointerleave 이벤트도 등록
    if (hasPointerEvents) {
      element.addEventListener('pointerleave', cancelHandler, options);
      listenerInfo.nativeListeners.push({
        type: 'pointerleave',
        handler: cancelHandler,
        element,
        options
      });
    }
  }

  /**
   * 회전 제스처 이벤트 설정
   * - 마우스: Ctrl + 휠로 회전
   * - 펜: 펜 회전 감지 (지원 시)
   * - 터치: 두 손가락 회전 (추가됨)
   * @private
   */
  _setupRotateEvents(element, callback, options, listenerId, listenerInfo, rotateStepDeg) {
    const state = listenerInfo.state;
    const rotateTracking = state.rotateTracking;
    const hasPointerEvents = 'PointerEvent' in window;
    
    // 터치 이벤트 지원 여부 확인
    const hasTouchEvents = 'ontouchstart' in window;
    const touchFingerDistance = this.defaults.touchFingerDistance;
    
    // 마우스 휠 이벤트 핸들러 (Ctrl + 휠)
    const wheelHandler = (event) => {
      // Ctrl 키를 누른 상태에서만 회전 처리
      if (!event.ctrlKey || event.altKey) return;
      
      if (options.preventDefault) {
        event.preventDefault();
      }
      
      // 회전 각도 계산 (휠 델타에 비례)
      const delta = event.deltaY || event.detail || event.wheelDelta;
      const rotationDelta = delta > 0 ? -rotateStepDeg : rotateStepDeg; // 휠 방향에 따라 회전 방향 결정
      
      // 현재 각도 업데이트
      rotateTracking.rotation += rotationDelta;
      rotateTracking.currentAngle = (rotateTracking.currentAngle + rotationDelta) % 360;
      
      // 각도 정규화 (0-360)
      if (rotateTracking.currentAngle < 0) rotateTracking.currentAngle += 360;
      
      // 회전 이벤트 발생
      const additionalData = {
        angle: rotateTracking.currentAngle,
        rotation: rotateTracking.rotation,
        deltaAngle: rotationDelta,
        center: {
          x: event.clientX,
          y: event.clientY
        },
        source: 'mouse',
        isWheel: true
      };
      
      this._debug(`마우스 회전 감지: 각도=${rotateTracking.currentAngle.toFixed(2)}°, 델타=${rotationDelta}°`);
      callback(this._createUnifiedEvent(event, 'rotate', additionalData));
    };
    
    // 펜 회전 이벤트 핸들러 (포인터 이벤트 지원 시)
    const penRotationHandler = (event) => {
      // 펜 이벤트만 처리
      if (event.pointerType !== 'pen') return;
      
      // 펜 회전 정보가 있는지 확인
      if (typeof event.rotation !== 'number' && 
          typeof event.tiltX !== 'number' && 
          typeof event.tiltY !== 'number') {
        return;
      }
      
      if (options.preventDefault) {
        event.preventDefault();
      }
      
      let currentRotation = 0;
      
      // rotation 속성이 있으면 직접 사용
      if (typeof event.rotation === 'number') {
        currentRotation = event.rotation;
      } 
      // twist를 사용하여 각도 추정
      else if (typeof event.twist === 'number' && event.twist !== 0) {
        currentRotation = event.twist;
      } 
      // tiltX와 tiltY를 사용하여 각도 추정
      else if (typeof event.tiltX === 'number' && typeof event.tiltY === 'number') {
        currentRotation = Math.atan2(event.tiltY, event.tiltX) * 180 / Math.PI;
      }
      
      // 초기 회전 저장 (첫 번째 이벤트)
      if (!rotateTracking.active) {
        rotateTracking.active = true;
        rotateTracking.pointerId = event.pointerId;
        rotateTracking.penInitialRotation = currentRotation;
        rotateTracking.startAngle = 0;
        rotateTracking.currentAngle = 0;
        return;
      }
      
      // 다른 포인터는 무시
      if (rotateTracking.pointerId !== event.pointerId) return;
      
      // 회전 각도 변화량 계산
      const deltaRotation = currentRotation - rotateTracking.penInitialRotation;
      
      // 변화가 너무 작으면 무시
      if (Math.abs(deltaRotation) < 1) return;
      
      // 회전 각도 업데이트
      rotateTracking.currentAngle = (rotateTracking.startAngle + deltaRotation) % 360;
      rotateTracking.rotation += deltaRotation;
      rotateTracking.penInitialRotation = currentRotation;
      rotateTracking.startAngle = rotateTracking.currentAngle;
      
      // 각도 정규화 (0-360)
      if (rotateTracking.currentAngle < 0) rotateTracking.currentAngle += 360;
      
      // 회전 이벤트 발생
      const additionalData = {
        angle: rotateTracking.currentAngle,
        rotation: rotateTracking.rotation,
        deltaAngle: deltaRotation,
        center: {
          x: event.clientX,
          y: event.clientY
        },
        source: 'pen',
        penRotation: currentRotation,
        penTiltX: event.tiltX,
        penTiltY: event.tiltY,
        penTwist: event.twist
      };
      
      this._debug(`펜 회전 감지: 각도=${rotateTracking.currentAngle.toFixed(2)}°, 델타=${deltaRotation.toFixed(2)}°`);
      callback(this._createUnifiedEvent(event, 'rotate', additionalData));
    };
    
    // 펜 포인터 종료 핸들러
    const penEndHandler = (event) => {
      if (event.pointerType !== 'pen') return;
      
      if (rotateTracking.pointerId === event.pointerId) {
        rotateTracking.active = false;
        rotateTracking.pointerId = null;
      }
    };
    
    // 터치 이벤트 핸들러 (두 손가락 회전)
    const touchStartHandler = (event) => {
      if (event.touches.length !== 2) return;
      
      if (options.preventDefault) {
        event.preventDefault();
      }
      
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      
      // 두 손가락 사이의 거리 계산
      const dx = touch2.clientX - touch1.clientX;
      const dy = touch2.clientY - touch1.clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // 손가락 사이의 거리가 충분한지 확인
      if (distance < touchFingerDistance) {
        return;
      }
      
      // 회전 추적 초기화
      rotateTracking.active = true;
      rotateTracking.touch1 = {
        id: touch1.identifier,
        startX: touch1.clientX,
        startY: touch1.clientY,
        currentX: touch1.clientX,
        currentY: touch1.clientY
      };
      
      rotateTracking.touch2 = {
        id: touch2.identifier,
        startX: touch2.clientX,
        startY: touch2.clientY,
        currentX: touch2.clientX,
        currentY: touch2.clientY
      };
      
      // 중심점 계산
      rotateTracking.centerX = (touch1.clientX + touch2.clientX) / 2;
      rotateTracking.centerY = (touch1.clientY + touch2.clientY) / 2;
      
      // 초기 각도 계산
      rotateTracking.initialAngle = Math.atan2(
        touch2.clientY - touch1.clientY,
        touch2.clientX - touch1.clientX
      ) * 180 / Math.PI;
      
      rotateTracking.lastAngle = rotateTracking.initialAngle;
      rotateTracking.totalRotation = 0;
      
      this._debug(`터치 회전 시작: 초기 각도=${rotateTracking.initialAngle.toFixed(2)}°, 중심=(${rotateTracking.centerX.toFixed(0)}, ${rotateTracking.centerY.toFixed(0)})`);
    };
    
    const touchMoveHandler = (event) => {
      if (!rotateTracking.active || event.touches.length !== 2) return;
      
      if (options.preventDefault) {
        event.preventDefault();
      }
      
      // 터치 식별
      let touch1, touch2;
      const t1 = event.touches[0];
      const t2 = event.touches[1];
      
      // 터치 정렬 (ID 순서대로)
      if (t1.identifier === rotateTracking.touch1.id && 
          t2.identifier === rotateTracking.touch2.id) {
        touch1 = t1;
        touch2 = t2;
      } else if (t1.identifier === rotateTracking.touch2.id && 
                t2.identifier === rotateTracking.touch1.id) {
        touch1 = t2;
        touch2 = t1;
      } else {
        // 식별된 터치가 아니면 무시
        return;
      }
      
      // 현재 위치 업데이트
      rotateTracking.touch1.currentX = touch1.clientX;
      rotateTracking.touch1.currentY = touch1.clientY;
      rotateTracking.touch2.currentX = touch2.clientX;
      rotateTracking.touch2.currentY = touch2.clientY;
      
      // 중심점 업데이트
      const newCenterX = (touch1.clientX + touch2.clientX) / 2;
      const newCenterY = (touch1.clientY + touch2.clientY) / 2;
      
      // 현재 각도 계산
      const currentAngle = Math.atan2(
        touch2.clientY - touch1.clientY,
        touch2.clientX - touch1.clientX
      ) * 180 / Math.PI;
      
      // 각도 변화 계산 (최단 경로)
      let deltaAngle = currentAngle - rotateTracking.lastAngle;
      
      // 최단 경로로 회전하기 위한 조정
      if (deltaAngle > 180) {
        deltaAngle -= 360;
      } else if (deltaAngle < -180) {
        deltaAngle += 360;
      }
      
      // 변화가 너무 작으면 무시
      if (Math.abs(deltaAngle) < 1) return;
      
      // 총 회전 각도 업데이트
      rotateTracking.totalRotation += deltaAngle;
      rotateTracking.lastAngle = currentAngle;
      
      // 회전 이벤트 발생
      const additionalData = {
        angle: currentAngle,
        rotation: rotateTracking.totalRotation,
        deltaAngle: deltaAngle,
        center: {
          x: newCenterX,
          y: newCenterY
        },
        source: 'touch',
        touches: [
          { x: touch1.clientX, y: touch1.clientY, id: touch1.identifier },
          { x: touch2.clientX, y: touch2.clientY, id: touch2.identifier }
        ]
      };
      
      this._debug(`터치 회전 감지: 각도=${currentAngle.toFixed(2)}°, 델타=${deltaAngle.toFixed(2)}°, 총=${rotateTracking.totalRotation.toFixed(2)}°`);
      callback(this._createUnifiedEvent(event, 'rotate', additionalData));
    };
    
    const touchEndHandler = (event) => {
      if (!rotateTracking.active) return;
      
      // 터치 개수 확인
      if (event.touches.length < 2) {
        rotateTracking.active = false;
        this._debug('터치 회전 종료: 터치 손실');
      }
    };
    
    // 휠 이벤트 등록 (마우스 회전)
    element.addEventListener('wheel', wheelHandler, options);
    listenerInfo.nativeListeners.push({
      type: 'wheel',
      handler: wheelHandler,
      element,
      options
    });
    
    // 펜 회전 이벤트 등록 (포인터 이벤트 지원 시)
    if (hasPointerEvents) {
      element.addEventListener('pointerdown', penRotationHandler, options);
      element.addEventListener('pointermove', penRotationHandler, options);
      element.addEventListener('pointerup', penEndHandler, options);
      element.addEventListener('pointercancel', penEndHandler, options);
      element.addEventListener('pointerleave', penEndHandler, options);
      
      listenerInfo.nativeListeners.push(
        { type: 'pointerdown', handler: penRotationHandler, element, options },
        { type: 'pointermove', handler: penRotationHandler, element, options },
        { type: 'pointerup', handler: penEndHandler, element, options },
        { type: 'pointercancel', handler: penEndHandler, element, options },
        { type: 'pointerleave', handler: penEndHandler, element, options }
      );
    }
    
    // 터치 회전 이벤트 등록 (터치 이벤트 지원 시)
    if (hasTouchEvents) {
      element.addEventListener('touchstart', touchStartHandler, options);
      element.addEventListener('touchmove', touchMoveHandler, options);
      element.addEventListener('touchend', touchEndHandler, options);
      element.addEventListener('touchcancel', touchEndHandler, options);
      
      listenerInfo.nativeListeners.push(
        { type: 'touchstart', handler: touchStartHandler, element, options },
        { type: 'touchmove', handler: touchMoveHandler, element, options },
        { type: 'touchend', handler: touchEndHandler, element, options },
        { type: 'touchcancel', handler: touchEndHandler, element, options }
      );
    }
  }

  /**
   * 핀치줌 제스처 이벤트 설정
   * - 마우스: Ctrl+Alt+휠로 줌
   * - 터치: 두 손가락 핀치줌 (추가됨)
   * @private
   */
  _setupPinchZoomEvents(element, callback, options, listenerId, listenerInfo, pinchZoomStep) {
    const state = listenerInfo.state;
    const pinchZoomTracking = state.pinchZoomTracking;
    
    // 터치 이벤트 지원 여부 확인
    const hasTouchEvents = 'ontouchstart' in window;
    const touchFingerDistance = this.defaults.touchFingerDistance;
    
    // 마우스 휠 이벤트 핸들러 (Ctrl+Alt+휠)
    const wheelHandler = (event) => {
      // Ctrl+Alt 키를 누른 상태에서만 핀치줌 처리
      if (!(event.ctrlKey && event.altKey)) return;
      
      if (options.preventDefault) {
        event.preventDefault();
      }
      
      // 줌 배율 계산 (휠 델타에 비례)
      const delta = event.deltaY || event.detail || event.wheelDelta;
      const zoomDelta = delta > 0 ? (1 - pinchZoomStep) : (1 + pinchZoomStep); // 휠 방향에 따라 줌 방향 결정
      
      // 현재 배율 업데이트
      pinchZoomTracking.scale *= zoomDelta;
      
      // 최소/최대 배율 제한
      pinchZoomTracking.scale = Math.max(
        this.defaults.minScale, 
        Math.min(this.defaults.maxScale, pinchZoomTracking.scale)
      );
      
      // 핀치줌 이벤트 발생
      const additionalData = {
        scale: pinchZoomTracking.scale,
        deltaScale: zoomDelta,
        center: {
          x: event.clientX,
          y: event.clientY
        },
        source: 'mouse',
        isWheel: true
      };
      
      this._debug(`마우스 핀치줌 감지: 배율=${pinchZoomTracking.scale.toFixed(2)}, 델타=${zoomDelta.toFixed(2)}`);
      callback(this._createUnifiedEvent(event, 'pinchzoom', additionalData));
    };
    
    // 터치 핀치줌 이벤트 핸들러
    const touchStartHandler = (event) => {
      if (event.touches.length !== 2) return;
      
      if (options.preventDefault) {
        event.preventDefault();
      }
      
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      
      // 두 손가락 사이의 거리 계산
      const dx = touch2.clientX - touch1.clientX;
      const dy = touch2.clientY - touch1.clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // 손가락 사이의 거리가 충분한지 확인
      if (distance < touchFingerDistance) {
        return;
      }
      
      // 핀치줌 추적 초기화
      pinchZoomTracking.active = true;
      pinchZoomTracking.touch1 = {
        id: touch1.identifier,
        startX: touch1.clientX,
        startY: touch1.clientY,
        currentX: touch1.clientX,
        currentY: touch1.clientY
      };
      
      pinchZoomTracking.touch2 = {
        id: touch2.identifier,
        startX: touch2.clientX,
        startY: touch2.clientY,
        currentX: touch2.clientX,
        currentY: touch2.clientY
      };
      
      // 중심점 계산
      const centerX = (touch1.clientX + touch2.clientX) / 2;
      const centerY = (touch1.clientY + touch2.clientY) / 2;
      
      // 초기 거리 계산
      pinchZoomTracking.initialDistance = distance;
      pinchZoomTracking.lastDistance = distance;
      pinchZoomTracking.totalScale = 1.0;
      
      this._debug(`터치 핀치줌 시작: 초기 거리=${distance.toFixed(2)}px, 중심=(${centerX.toFixed(0)}, ${centerY.toFixed(0)})`);
    };
    
    const touchMoveHandler = (event) => {
      if (!pinchZoomTracking.active || event.touches.length !== 2) return;
      
      if (options.preventDefault) {
        event.preventDefault();
      }
      
      // 터치 식별
      let touch1, touch2;
      const t1 = event.touches[0];
      const t2 = event.touches[1];
      
      // 터치 정렬 (ID 순서대로)
      if (t1.identifier === pinchZoomTracking.touch1.id && 
          t2.identifier === pinchZoomTracking.touch2.id) {
        touch1 = t1;
        touch2 = t2;
      } else if (t1.identifier === pinchZoomTracking.touch2.id && 
                t2.identifier === pinchZoomTracking.touch1.id) {
        touch1 = t2;
        touch2 = t1;
      } else {
        // 식별된 터치가 아니면 무시
        return;
      }
      
      // 현재 위치 업데이트
      pinchZoomTracking.touch1.currentX = touch1.clientX;
      pinchZoomTracking.touch1.currentY = touch1.clientY;
      pinchZoomTracking.touch2.currentX = touch2.clientX;
      pinchZoomTracking.touch2.currentY = touch2.clientY;
      
      // 중심점 계산
      const centerX = (touch1.clientX + touch2.clientX) / 2;
      const centerY = (touch1.clientY + touch2.clientY) / 2;
      
      // 현재 거리 계산
      const dx = touch2.clientX - touch1.clientX;
      const dy = touch2.clientY - touch1.clientY;
      const currentDistance = Math.sqrt(dx * dx + dy * dy);
      
      // 배율 변화 계산
      const scaleFactor = currentDistance / pinchZoomTracking.lastDistance;
      
      // 변화가 너무 작거나 너무 크면 무시
      if (scaleFactor < 0.9 || scaleFactor > 1.1) {
        pinchZoomTracking.lastDistance = currentDistance;
        return;
      }
      
      // 총 배율 업데이트
      pinchZoomTracking.totalScale *= scaleFactor;
      
      // 최소/최대 배율 제한
      pinchZoomTracking.totalScale = Math.max(
        this.defaults.minScale, 
        Math.min(this.defaults.maxScale, pinchZoomTracking.totalScale)
      );
      
      // 마지막 거리 업데이트
      pinchZoomTracking.lastDistance = currentDistance;
      
      // 핀치줌 이벤트 발생
      const additionalData = {
        scale: pinchZoomTracking.totalScale,
        deltaScale: scaleFactor,
        initialDistance: pinchZoomTracking.initialDistance,
        currentDistance: currentDistance,
        center: {
          x: centerX,
          y: centerY
        },
        source: 'touch',
        touches: [
          { x: touch1.clientX, y: touch1.clientY, id: touch1.identifier },
          { x: touch2.clientX, y: touch2.clientY, id: touch2.identifier }
        ]
      };
      
      this._debug(`터치 핀치줌 감지: 배율=${pinchZoomTracking.totalScale.toFixed(2)}, 델타=${scaleFactor.toFixed(2)}, 거리=${currentDistance.toFixed(2)}px`);
      callback(this._createUnifiedEvent(event, 'pinchzoom', additionalData));
    };
    
    const touchEndHandler = (event) => {
      if (!pinchZoomTracking.active) return;
      
      // 터치 개수 확인
      if (event.touches.length < 2) {
        pinchZoomTracking.active = false;
        this._debug('터치 핀치줌 종료: 터치 손실');
      }
    };
    
    // 휠 이벤트 등록 (마우스 핀치줌)
    element.addEventListener('wheel', wheelHandler, options);
    listenerInfo.nativeListeners.push({
      type: 'wheel',
      handler: wheelHandler,
      element,
      options
    });
    
    // 터치 핀치줌 이벤트 등록
    if (hasTouchEvents) {
      element.addEventListener('touchstart', touchStartHandler, options);
      element.addEventListener('touchmove', touchMoveHandler, options);
      element.addEventListener('touchend', touchEndHandler, options);
      element.addEventListener('touchcancel', touchEndHandler, options);
      
      listenerInfo.nativeListeners.push(
        { type: 'touchstart', handler: touchStartHandler, element, options },
        { type: 'touchmove', handler: touchMoveHandler, element, options },
        { type: 'touchend', handler: touchEndHandler, element, options },
        { type: 'touchcancel', handler: touchEndHandler, element, options }
      );
    }
  }

  /**
   * 드래그 이벤트를 설정합니다.
   * @private
   */
  _setupDragEvents(element, eventType, callback, options, listenerId, listenerInfo) {
    // 옵션 설정
    const preventDefault = options.preventDefault || false;
    const range = options.range || null;
    const keepState = options.keepState !== false;
    const usePointerCapture = options.usePointerCapture !== undefined 
      ? options.usePointerCapture 
      : this.defaults.usePointerCapture;
    
    // 상태 초기화 - 리스너 정보 내에 상태 저장
    const state = listenerInfo.state;
    state.active = false;
    state.startX = 0;
    state.startY = 0;
    state.currentX = 0;
    state.currentY = 0;
    state.range = range;
    state.keepState = keepState;
    state.usePointerCapture = usePointerCapture;
    state.capturedPointer = null;
    state.elementRect = null;
    
    // 리스너 옵션 설정
    const listenerOptions = {
      ...options,
      passive: options.preventDefault ? false : options.passive
    };
    
    // 이벤트 핸들러 설정
    if (eventType === 'dragstart') {
      this._setupDragStartEvents(element, callback, listenerOptions, listenerId, listenerInfo);
    } 
    else if (eventType === 'drag') {
      this._setupDragMoveEvents(element, callback, listenerOptions, listenerId, listenerInfo);
    } 
    else if (eventType === 'dragend') {
      this._setupDragEndEvents(element, callback, listenerOptions, listenerId, listenerInfo);
    }
  }

  /**
   * 드래그 시작 이벤트 설정
   * @private
   */
  _setupDragStartEvents(element, callback, options, listenerId, listenerInfo) {
    const state = listenerInfo.state;
    const hasPointerEvents = 'PointerEvent' in window;
    
    // 드래그 시작 핸들러
    const dragStartHandler = (event) => {
      if (options.preventDefault) {
        event.preventDefault();
      }
      
      const clientX = event.clientX || (event.touches && event.touches[0] ? event.touches[0].clientX : 0);
      const clientY = event.clientY || (event.touches && event.touches[0] ? event.touches[0].clientY : 0);
      const pointerId = event.pointerId || (event.touches && event.touches[0] ? event.touches[0].identifier : 1);
      
      // 이미 드래그 중이면 무시
      if (state.active && state.capturedPointer === pointerId) {
        return;
      }
      
      // 요소의 경계 정보 저장 (상대 위치 계산을 위해)
      state.elementRect = element.getBoundingClientRect();
      
      // 상태 초기화
      state.active = true;
      state.startX = clientX;
      state.startY = clientY;
      state.currentX = clientX;
      state.currentY = clientY;
      state.capturedPointer = pointerId;
      
      // 포인터 캡처 설정 (지원되는 경우)
      if (state.usePointerCapture && 'setPointerCapture' in element && pointerId !== undefined) {
        this._debug(`드래그 이벤트에 대한 포인터 캡처 설정: pointerId=${pointerId}`);
        try {
          element.setPointerCapture(pointerId);
        } catch (e) {
          this._debug('포인터 캡처 설정 실패:', e.message);
        }
      }
      
      // 드래그 시작 이벤트 발생
      const additionalData = {
        startX: state.startX,
        startY: state.startY,
        deltaX: 0,
        deltaY: 0,
        elementRect: state.elementRect
      };
      
      callback(this._createUnifiedEvent(event, 'dragstart', additionalData));
    };
    
    // 이벤트 리스너 등록 (헬퍼 함수 사용)
    this._registerEventListeners(
      element, 
      hasPointerEvents, 
      [{ type: 'start', handler: dragStartHandler }], 
      options, 
      listenerInfo
    );
  }

  /**
   * 드래그 이동 이벤트 설정
   * @private
   */
  _setupDragMoveEvents(element, callback, options, listenerId, listenerInfo) {
  const state = listenerInfo.state;
  const hasPointerEvents = 'PointerEvent' in window;
  
  // 누적 이동량 추적을 위한 변수 추가
  if (!state.cumulativeDelta) {
    state.cumulativeDelta = {
      x: 0,
      y: 0
    };
  }
  
  // 드래그 시작 핸들러
  const dragStartHandler = (event) => {
    if (options.preventDefault) {
      event.preventDefault();
    }
    
    const clientX = event.clientX || (event.touches && event.touches[0] ? event.touches[0].clientX : 0);
    const clientY = event.clientY || (event.touches && event.touches[0] ? event.touches[0].clientY : 0);
    const pointerId = event.pointerId || (event.touches && event.touches[0] ? event.touches[0].identifier : 1);
    
    // 이미 드래그 중이면 무시
    if (state.active && state.capturedPointer === pointerId) {
      return;
    }
    
    // 요소의 경계 정보 저장 (상대 위치 계산을 위해)
    state.elementRect = element.getBoundingClientRect();
    
    // 상태 초기화
    state.active = true;
    state.startX = clientX;
    state.startY = clientY;
    state.currentX = clientX;
    state.currentY = clientY;
    state.capturedPointer = pointerId;
    
    // 현재 드래그 이동량 초기화 (누적값은 유지)
    state.currentDeltaX = 0;
    state.currentDeltaY = 0;
    
    // 포인터 캡처 설정 (지원되는 경우)
    if (state.usePointerCapture && 'setPointerCapture' in element && pointerId !== undefined) {
      this._debug(`드래그 이벤트에 대한 포인터 캡처 설정: pointerId=${pointerId}`);
      try {
        element.setPointerCapture(pointerId);
      } catch (e) {
        this._debug('포인터 캡처 설정 실패:', e.message);
      }
    }
    
    // 드래그 관련 다른 리스너들이 드래그 시작 이벤트를 처리할 수 있도록 발생시킴
    const dragStartEvent = this._createUnifiedEvent(event, 'dragstart', {
      startX: state.startX,
      startY: state.startY,
      deltaX: state.cumulativeDelta.x,
      deltaY: state.cumulativeDelta.y,
      elementRect: state.elementRect
    });
    
    // dragstart 이벤트에 대한 콜백이 등록되어 있는지 확인
    let hasDragStartCallback = false;
    this.eventListeners.forEach((info, id) => {
      if (info.element === element && info.eventType === 'dragstart') {
        info.callback(dragStartEvent);
        hasDragStartCallback = true;
      }
    });
  };
  
  // 드래그 이동 핸들러
  const dragMoveHandler = (event) => {
    if (!state.active) return;
    const pointerId = event.pointerId || (event.touches && event.touches[0] ? event.touches[0].identifier : 1);
    
    // 다른 포인터의 이동은 무시
    if (state.capturedPointer !== pointerId) {
      return;
    }
    
    if (options.preventDefault) {
      event.preventDefault();
    }
    
    const clientX = event.clientX || (event.touches && event.touches[0] ? event.touches[0].clientX : 0);
    const clientY = event.clientY || (event.touches && event.touches[0] ? event.touches[0].clientY : 0);
    
    // 현재 위치 업데이트
    state.currentX = clientX;
    state.currentY = clientY;
    
    // 현재 드래그 세션의 델타 계산
    state.currentDeltaX = clientX - state.startX;
    state.currentDeltaY = clientY - state.startY;
    
    // 누적 + 현재 델타 계산
    const totalDeltaX = state.cumulativeDelta.x + state.currentDeltaX;
    const totalDeltaY = state.cumulativeDelta.y + state.currentDeltaY;
    
    // 범위 제한 확인
    let constrainedDeltaX = totalDeltaX;
    let constrainedDeltaY = totalDeltaY;
    let isOutOfBounds = false;
    let isOutOfBoundsX = false;  // X축 범위 초과 여부
    let isOutOfBoundsY = false;  // Y축 범위 초과 여부
    
    if (state.range && state.range !== 'infinite') {
      if (state.range.x) {
        const [minX, maxX] = state.range.x;
        if (totalDeltaX < minX) {
          constrainedDeltaX = minX;
          isOutOfBounds = true;
          isOutOfBoundsX = true;  // X축 범위 초과
        } else if (totalDeltaX > maxX) {
          constrainedDeltaX = maxX;
          isOutOfBounds = true;
          isOutOfBoundsX = true;  // X축 범위 초과
        }
      }
      
      if (state.range.y) {
        const [minY, maxY] = state.range.y;
        if (totalDeltaY < minY) {
          constrainedDeltaY = minY;
          isOutOfBounds = true;
          isOutOfBoundsY = true;  // Y축 범위 초과
        } else if (totalDeltaY > maxY) {
          constrainedDeltaY = maxY;
          isOutOfBounds = true;
          isOutOfBoundsY = true;  // Y축 범위 초과
        }
      }
    }
    
    // 드래그 이벤트 발생
    const additionalData = {
      startX: state.startX,
      startY: state.startY,
      currentX: state.currentX,
      currentY: state.currentY,
      deltaX: totalDeltaX,              // 누적 + 현재 델타
      deltaY: totalDeltaY,              // 누적 + 현재 델타
      constrainedDeltaX: constrainedDeltaX,  // 범위 제한 적용된 델타
      constrainedDeltaY: constrainedDeltaY,  // 범위 제한 적용된 델타
      currentDeltaX: state.currentDeltaX,    // 현재 드래그 세션의 델타
      currentDeltaY: state.currentDeltaY,    // 현재 드래그 세션의 델타
      isOutOfBounds,
      isOutOfBoundsX,  // X축 범위 초과 여부 전달
      isOutOfBoundsY,  // Y축 범위 초과 여부 전달
      elementRect: state.elementRect // 요소 경계 정보 포함
    };
    
    callback(this._createUnifiedEvent(event, 'drag', additionalData));
  };
  
  // 드래그 종료 핸들러
  const dragEndHandler = (event) => {
    if (!state.active) return;
    
    const pointerId = event.pointerId || (event.changedTouches && event.changedTouches[0] ? event.changedTouches[0].identifier : 1);
    
    // 다른 포인터의 이벤트는 무시
    if (state.capturedPointer !== pointerId) {
      return;
    }
    
    if (options.preventDefault) {
      event.preventDefault();
    }
    
    // keepState 옵션이 활성화된 경우, 누적 델타 업데이트
    if (options.keepState) {
      // 현재 드래그 세션의 델타를 누적
      state.cumulativeDelta.x += state.currentDeltaX;
      state.cumulativeDelta.y += state.currentDeltaY;
      
      // 범위 제한 적용
      if (state.range && state.range !== 'infinite') {
        if (state.range.x) {
          const [minX, maxX] = state.range.x;
          state.cumulativeDelta.x = Math.max(minX, Math.min(maxX, state.cumulativeDelta.x));
        }
        
        if (state.range.y) {
          const [minY, maxY] = state.range.y;
          state.cumulativeDelta.y = Math.max(minY, Math.min(maxY, state.cumulativeDelta.y));
        }
      }
    } else {
      // keepState가 false인 경우 누적 델타 초기화
      state.cumulativeDelta = { x: 0, y: 0 };
    }
    
    // dragend 이벤트 발생
    const dragEndEvent = this._createUnifiedEvent(event, 'dragend', {
      startX: state.startX,
      startY: state.startY,
      endX: state.currentX,
      endY: state.currentY,
      deltaX: state.cumulativeDelta.x,
      deltaY: state.cumulativeDelta.y,
      currentDeltaX: state.currentDeltaX,
      currentDeltaY: state.currentDeltaY,
      isOutOfBounds: false,
      elementRect: state.elementRect // 요소 경계 정보 포함
    });
    
    // dragend 이벤트에 대한 콜백이 등록되어 있는지 확인
    let hasEndCallback = false;
    this.eventListeners.forEach((info, id) => {
      if (info.element === element && info.eventType === 'dragend') {
        info.callback(dragEndEvent);
        hasEndCallback = true;
      }
    });
    
    // 상태 초기화 (누적 델타 제외)
    state.active = false;
    state.capturedPointer = null;
    
    // 포인터 캡처 해제
    if (state.usePointerCapture && 'releasePointerCapture' in element) {
      try {
        element.releasePointerCapture(pointerId);
      } catch (e) {
        this._debug('포인터 캡처 해제 실패:', e.message);
      }
    }
  };
  
  // 드래그 취소 핸들러
  const dragCancelHandler = (event) => {
    if (!state.active) return;
    
    const pointerId = event.pointerId || (event.changedTouches && event.changedTouches[0] ? event.changedTouches[0].identifier : 1);
    
    // 다른 포인터의 이벤트는 무시
    if (state.capturedPointer !== pointerId) {
      return;
    }
    
    // 상태 초기화 (누적 델타는 유지)
    state.active = false;
    state.capturedPointer = null;
    
    // 포인터 캡처 해제
    if (state.usePointerCapture && 'releasePointerCapture' in element) {
      try {
        element.releasePointerCapture(pointerId);
      } catch (e) {
        this._debug('포인터 캡처 해제 실패:', e.message);
      }
    }
  };
  
  // 이벤트 리스너 등록 (헬퍼 함수 사용)
  this._registerEventListeners(
    element, 
    hasPointerEvents, 
    [
      { type: 'start', handler: dragStartHandler },
      { type: 'move', handler: dragMoveHandler },
      { type: 'end', handler: dragEndHandler },
      { type: 'cancel', handler: dragCancelHandler }
    ], 
    options, 
    listenerInfo
  );
  
  // 포인터 이벤트일 경우 pointerleave 이벤트도 등록
  if (hasPointerEvents) {
    element.addEventListener('pointerleave', dragCancelHandler, options);
    listenerInfo.nativeListeners.push({
      type: 'pointerleave',
      handler: dragCancelHandler,
      element,
      options
    });
  }
}

  /**
   * 드래그 종료 이벤트 설정
   * @private
   */
  _setupDragEndEvents(element, callback, options, listenerId, listenerInfo) {
    // dragend 이벤트는 dragstart와 drag 이벤트에서 내부적으로 발생시키기 때문에
    // 여기서는 별도의 리스너를 등록하지 않고, dragstart나 drag가 발생할 때 함께 처리됨
    // 하지만 사용자가 직접 dragend만 등록한 경우를 위해 최소한의 placeholder 등록
    const state = listenerInfo.state;
    
    // 상태 저장만 하고, 실제 이벤트 리스너는 등록하지 않음
    // 실제 dragend 발생은 dragstart나 drag에서 처리
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
        return true;
      }
    } catch (e) {
      this._debug('포인터 캡처 해제 실패:', e.message);
    }
    
    return false;
  }
  
  /**
   * 터치 ID를 추적합니다.
   * @private
   * @param {number} touchId - 터치 식별자
   * @param {Object} touchInfo - 터치 정보
   */
  _trackTouch(touchId, touchInfo) {
    this._activeTouches.set(touchId, { 
      ...touchInfo, 
      timestamp: Date.now() 
    });
  }
  
  /**
   * 터치 추적을 중지합니다.
   * @private
   * @param {number} touchId - 터치 식별자
   */
  _untrackTouch(touchId) {
    this._activeTouches.delete(touchId);
  }
  
  /**
   * 활성 터치 개수를 반환합니다.
   * @private
   * @returns {number} 활성 터치 개수
   */
  _getActiveTouchCount() {
    return this._activeTouches.size;
  }
  
  /**
   * 통합 포인터 이벤트 리스너를 제거합니다.
   * @param {number} listenerId - addEventListener로 반환된 리스너 식별자
   * @returns {boolean} 제거 성공 여부
   */
  removeEventListener(listenerId) {
    const listenerInfo = this.eventListeners.get(listenerId);
    if (!listenerInfo) {
      this._debug(`리스너 제거 실패: ID ${listenerId}에 해당하는 리스너를 찾을 수 없습니다.`);
      return false;
    }

    try {
      // 네이티브 이벤트 리스너 제거
      this._debug(`리스너 제거 시작: ID=${listenerId}, 유형=${listenerInfo.eventType}, 요소=${listenerInfo.element}`);
      
      // 각 네이티브 리스너에 대해 개별적으로 처리
      if (Array.isArray(listenerInfo.nativeListeners)) {
        listenerInfo.nativeListeners.forEach(({ type, handler, element, options }) => {
          if (element && typeof element.removeEventListener === 'function') {
            try {
              // handler가 정의되어 있는지 확인
              if (typeof handler === 'function') {
                // 이벤트 리스너 제거
                element.removeEventListener(type, handler, options || {});
                this._debug(`- 네이티브 리스너 제거 성공: 요소=${element.tagName || element}, 유형=${type}`);
              } else {
                this._debug(`- 핸들러 함수 없음: 요소=${element.tagName || element}, 유형=${type}`);
              }
            } catch (removeError) {
              this._debug(`- 네이티브 리스너 제거 중 예외 발생: ${removeError.message}`);
            }
          } else {
            this._debug(`- 유효하지 않은 요소 또는 removeEventListener 메서드 없음`);
          }
        });
      } else {
        this._debug(`- nativeListeners 배열이 존재하지 않음`);
      }

      // 상태 정리
      const state = listenerInfo.state;
      if (state) {
        // 타이머 정리
        if (state.timerId) {
          clearTimeout(state.timerId);
          state.timerId = null;
        }
        
        // 포인터 캡처 해제
        if (state.capturedPointer && listenerInfo.element && 'releasePointerCapture' in listenerInfo.element) {
          try {
            listenerInfo.element.releasePointerCapture(state.capturedPointer);
            this._debug(`- 캡처된 포인터 해제: ID=${state.capturedPointer}`);
          } catch (e) {
            this._debug(`- 포인터 캡처 해제 실패: ${e.message}`);
          }
        }
      }
      
      // 이벤트 리스너 맵에서 제거
      this.eventListeners.delete(listenerId);
      
      this._debug(`리스너 제거 완료: ID=${listenerId}`);
      return true;
    } catch (error) {
      this._debug(`리스너 제거 중 오류: ID=${listenerId}, 오류=${error.message}`);
      // 오류가 발생해도 맵에서 항목 제거 시도
      try {
        this.eventListeners.delete(listenerId);
      } catch (cleanupError) {
        this._debug(`- 상태 정리 중 추가 오류: ${cleanupError.message}`);
      }
      return false;
    }
  }

  /**
   * 요소에 등록된 모든 이벤트 리스너를 제거합니다.
   * @param {HTMLElement} element - 이벤트 리스너를 제거할 요소
   * @returns {number} 제거된 리스너 수
   */
  removeAllEventListeners(element) {
    if (!element) return 0;
    
    // 제거할 리스너 ID 목록 수집
    const listenerIdsToRemove = [];
    
    this.eventListeners.forEach((listenerInfo, listenerId) => {
      if (listenerInfo.element === element) {
        listenerIdsToRemove.push(listenerId);
      }
    });
    
    // 수집한 ID 목록 로깅
    this._debug(`요소의 모든 리스너 제거 시작: 요소=${element.tagName || element}, ID 수=${listenerIdsToRemove.length}`);
    
    // 직접 네이티브 이벤트 리스너 제거 시도 (강제 정리)
    try {
      // 모든 가능한 이벤트 유형에 대해 정리 시도
      const allPossibleEvents = [
        'pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'pointerleave',
        'gotpointercapture', 'lostpointercapture',
        'mousedown', 'mousemove', 'mouseup', 'mouseleave',
        'touchstart', 'touchmove', 'touchend', 'touchcancel',
        'wheel' // 회전, 핀치줌 이벤트를 위한 wheel 이벤트 추가
      ];
      
      // 기존 모든 핸들러를 가져와서 제거 시도
      this.eventListeners.forEach((info, id) => {
        if (info.element === element && Array.isArray(info.nativeListeners)) {
          info.nativeListeners.forEach(({ type, handler, options }) => {
            if (typeof handler === 'function') {
              try {
                element.removeEventListener(type, handler, options || {});
                this._debug(`- 직접 네이티브 리스너 제거: 유형=${type}`);
              } catch (err) {
                this._debug(`- 직접 제거 시도 중 오류: ${err.message}`);
              }
            }
          });
        }
      });
    } catch (err) {
      this._debug(`직접 리스너 제거 중 오류: ${err.message}`);
    }
    
    // 수집된 리스너 제거
    let successCount = 0;
    for (const id of listenerIdsToRemove) {
      if (this.removeEventListener(id)) {
        successCount++;
      }
    }
    
    this._debug(`요소의 모든 리스너 제거 완료: 요소=${element.tagName || element}, 성공=${successCount}/${listenerIdsToRemove.length}`);
    return successCount;
  }
  
  /**
   * 모든 이벤트 리스너를 제거하고 리소스를 정리합니다.
   */
  dispose() {
    // 모든 리스너 제거
    this.eventListeners.forEach((_, listenerId) => {
      this.removeEventListener(listenerId);
    });
    
    // 맵 비우기
    this.eventListeners.clear();
    this._activeTouches.clear();
    
    this._debug('모든 리소스 정리 완료');
  }
  
  /**
   * 현재 활성 리스너 수를 반환합니다.
   * @returns {number} 활성 리스너 수
   */
  getActiveListenerCount() {
    return this.eventListeners.size;
  }
  
  /**
   * 디버그 모드를 활성화/비활성화합니다.
   * @param {boolean} enabled - 활성화 여부
   * @returns {UnifiedPointerEvents} 메서드 체이닝을 위한 인스턴스 반환
   */
  setDebugMode(enabled) {
    this.debugMode = !!enabled;
    this._debug(`디버그 모드 ${enabled ? '활성화' : '비활성화'}`);
    return this;
  }
  
  /**
   * 현재 등록된 모든 이벤트 리스너 목록을 반환합니다.
   * @returns {Array} 리스너 정보 배열
   */
  getRegisteredListeners() {
    const listeners = [];
    this.eventListeners.forEach((info, id) => {
      listeners.push({
        id,
        element: info.element,
        eventType: info.eventType,
        options: info.options
      });
    });
    return listeners;
  }
  
  /**
   * 특정 요소에 등록된 모든 이벤트 리스너를 정리합니다.
   * @param {HTMLElement} element - 대상 요소
   * @returns {number} 제거된 리스너 수
   */
  cleanupElementListeners(element) {
    return this.removeAllEventListeners(element);
  }
  
  /**
   * 현재 리스너 상태에 대한 상세 정보를 반환합니다.
   * @returns {Object} 상태 정보
   */
  getStatus() {
    return {
      listenerCount: this.eventListeners.size,
      activeTouchCount: this._activeTouches.size
    };
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