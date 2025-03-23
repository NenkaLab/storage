// path : js/modules/GestureTest.js

/**
 * 제스처 이벤트 테스트 모듈
 * 롱클릭, 더블클릭, 스와이프, 핀치 줌, 회전, fling 등의 제스처 이벤트를 처리합니다.
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
      swipe: null,
      pinchzoom: null,
      rotate: null,
      fling: null,
      dragTiger: null,
      swipeTiger: null,
      dblclickGame: null
    };
    
    // fling 스크롤 상태
    this.scrollState = {
      scrollTop: 0,
      maxScroll: 0,
      velocity: 0,
      isScrolling: false,
      animationId: null,
      pointers: new Map()
    };
    
    // 게임 상태
    this.gameState = {
      isActive: false,
      score: 0,
      tigerPosition: { x: 0, y: 0 },
      targetPosition: { x: 0, y: 0 },
      gameAreaRect: null
    };
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
    
    // Fling 스크롤 테스트 초기화
    this.initFlingScroll();
    
    // 핀치 줌 테스트 초기화
    this.initPinchZoom();
    
    // 회전 테스트 초기화
    this.initRotate();
    
    // 타이거 게임 초기화
    this.initTigerGame();
    
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
    
    // 이미 등록된 리스너 제거
    if (this.listenerIds.longclick !== null) {
      window.unifiedPointerEvents.removeEventListener(this.listenerIds.longclick);
      this.listenerIds.longclick = null;
    }
    
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
    
    // 이미 등록된 더블클릭 리스너 제거
    if (this.listenerIds.doubleclick !== null) {
      window.unifiedPointerEvents.removeEventListener(this.listenerIds.doubleclick);
      this.listenerIds.doubleclick = null;
    }
    
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
    
    // 이미 등록된 스와이프 리스너 제거
    if (this.listenerIds.swipe !== null) {
      window.unifiedPointerEvents.removeEventListener(this.listenerIds.swipe);
      this.listenerIds.swipe = null;
    }
    
    // UnifiedPointerEvents의 swipe 이벤트 사용
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
        let speed = 0;
        if (event.duration && event.duration > 0) {
          speed = Math.round(event.distance / event.duration * 1000);
        }
        
        const message = `스와이프 감지 - 방향: ${directionKo}, 거리: ${Math.round(event.distance)}px, 속도: ${speed}px/s`;
        this.utils.addLogEntry(logArea, message, 'success');
      },
      { 
        swipeThreshold: threshold, 
        swipeTimeout: timeout, 
        preventDefault: true 
      }
    );
  }
  
  /**
   * Fling 스크롤 테스트 초기화
   */
  initFlingScroll() {
    const scrollArea = document.getElementById('flingScrollArea');
    const scrollContent = document.getElementById('scrollContent');
    const scrollIndicator = document.getElementById('scrollIndicator');
    const scrollPosition = document.getElementById('scrollPosition');
    const scrollVelocity = document.getElementById('scrollVelocity');
    const resetScrollBtn = document.getElementById('resetScroll');
    const logArea = document.getElementById('gestureLog');
    
    if (!scrollArea || !scrollContent || !scrollIndicator || !scrollPosition || !scrollVelocity || !logArea) {
      console.error('제스처 테스트: 스크롤 요소를 찾을 수 없습니다.');
      return;
    }
    
    // 스크롤 상태
    const scrollState = {
      isScrolling: false,
      startY: 0,
      currentY: 0,
      scrollTop: 0,
      maxScroll: 0,
      velocity: 0,
      animationId: null,
      pointers: new Map()
    };
    
    // 스크롤 영역 초기화
    const updateMaxScroll = () => {
      scrollState.maxScroll = scrollContent.scrollHeight - scrollArea.clientHeight;
    };
    
    // 초기 최대 스크롤 값 설정
    updateMaxScroll();
    
    // 리사이즈 시 최대 스크롤 값 업데이트
    window.addEventListener('resize', updateMaxScroll);
    
    // 스크롤 위치 표시 업데이트
    const updateScrollIndicator = () => {
      const scrollPercent = scrollState.maxScroll === 0 ? 0 : (scrollState.scrollTop / scrollState.maxScroll * 100);
      scrollIndicator.style.top = `${scrollPercent}%`;
      scrollPosition.textContent = `${Math.round(scrollPercent)}%`;
    };
    
    // 콘텐츠 스크롤 적용
    const applyScroll = (scrollTop) => {
      // 범위 제한
      const limitedScroll = Math.max(0, Math.min(scrollState.maxScroll, scrollTop));
      
      // 변화가 있을 때만 적용
      if (scrollState.scrollTop !== limitedScroll) {
        scrollState.scrollTop = limitedScroll;
        scrollContent.style.transform = `translateY(-${limitedScroll}px)`;
        updateScrollIndicator();
      }
      
      return limitedScroll;
    };
    
    // 시작 이벤트 핸들러
    const startHandler = (event) => {
      // 애니메이션 중지
      if (scrollState.animationId) {
        cancelAnimationFrame(scrollState.animationId);
        scrollState.animationId = null;
      }
      
      scrollState.pointers.set(event.pointerId, {
        y: event.clientY,
        timestamp: Date.now()
      });
      
      scrollState.isScrolling = true;
      scrollState.startY = event.clientY;
      scrollState.currentY = event.clientY;
      
      // 로그 출력
      this.utils.addLogEntry(logArea, `스크롤 시작 - 위치: Y=${Math.round(scrollState.scrollTop)}px`, 'info');
    };
    
    // 이동 이벤트 핸들러
    const moveHandler = (event) => {
      if (!scrollState.isScrolling) return;
      if (!scrollState.pointers.has(event.pointerId)) return;
      
      const lastPoint = scrollState.pointers.get(event.pointerId);
      const currentTime = Date.now();
      const deltaTime = currentTime - lastPoint.timestamp;
      const deltaY = lastPoint.y - event.clientY;
      
      // 포인터 정보 업데이트
      scrollState.pointers.set(event.pointerId, {
        y: event.clientY,
        timestamp: currentTime
      });
      
      scrollState.currentY = event.clientY;
      
      // 속도 계산 (픽셀/밀리초)
      if (deltaTime > 0) {
        scrollState.velocity = deltaY / deltaTime;
      }
      
      // 스크롤 적용
      const newScrollTop = scrollState.scrollTop + deltaY;
      applyScroll(newScrollTop);
      
      // 속도 표시 업데이트
      scrollVelocity.textContent = `${Math.round(scrollState.velocity * 1000)}px/s`;
    };
    
    // 종료 이벤트 핸들러
    const endHandler = (event) => {
      if (!scrollState.isScrolling) return;
      if (!scrollState.pointers.has(event.pointerId)) return;
      
      // 마지막 포인터가 제거되면 스크롤 종료
      scrollState.pointers.delete(event.pointerId);
      if (scrollState.pointers.size === 0) {
        scrollState.isScrolling = false;
        
        // 플링 효과 적용
        if (Math.abs(scrollState.velocity) > 0.1) {
          // 로그 출력
          this.utils.addLogEntry(
            logArea, 
            `플링 감지 - 속도: ${Math.round(scrollState.velocity * 1000)}px/s`, 
            'success'
          );
          
          // 플링 애니메이션 시작
          let lastTime = Date.now();
          const animateFling = () => {
            const now = Date.now();
            const deltaTime = now - lastTime;
            lastTime = now;
            
            // 속도 감소 (마찰 효과)
            scrollState.velocity *= Math.pow(0.95, deltaTime / 16);
            
            // 속도가 매우 작으면 애니메이션 중지
            if (Math.abs(scrollState.velocity) < 0.01) {
              scrollState.velocity = 0;
              scrollState.animationId = null;
              return;
            }
            
            // 스크롤 업데이트
            const deltaScroll = scrollState.velocity * deltaTime;
            const newScrollTop = scrollState.scrollTop + deltaScroll;
            applyScroll(newScrollTop);
            
            // 스크롤이 끝에 닿으면 애니메이션 중지
            if (scrollState.scrollTop <= 0 || scrollState.scrollTop >= scrollState.maxScroll) {
              scrollState.velocity = 0;
              scrollState.animationId = null;
              return;
            }
            
            // 속도 표시 업데이트
            scrollVelocity.textContent = `${Math.round(scrollState.velocity * 1000)}px/s`;
            
            // 다음 프레임 요청
            scrollState.animationId = requestAnimationFrame(animateFling);
          };
          
          scrollState.animationId = requestAnimationFrame(animateFling);
        } else {
          // 속도가 너무 느리면 플링 없이 중지
          scrollState.velocity = 0;
          scrollVelocity.textContent = '0';
        }
      }
    };
    
    // 취소 이벤트 핸들러
    const cancelHandler = (event) => {
      scrollState.pointers.delete(event.pointerId);
      if (scrollState.pointers.size === 0) {
        scrollState.isScrolling = false;
        scrollState.velocity = 0;
        scrollVelocity.textContent = '0';
      }
    };
    
    // 휠 이벤트 핸들러
    const wheelHandler = (event) => {
      event.preventDefault();
      
      // 애니메이션 중지
      if (scrollState.animationId) {
        cancelAnimationFrame(scrollState.animationId);
        scrollState.animationId = null;
      }
      
      // deltaY가 양수면 아래로 스크롤, 음수면 위로 스크롤
      const newScrollTop = scrollState.scrollTop + event.deltaY;
      applyScroll(newScrollTop);
    };
    
    // 리셋 버튼 이벤트
    if (resetScrollBtn) {
      resetScrollBtn.addEventListener('click', () => {
        // 애니메이션 중지
        if (scrollState.animationId) {
          cancelAnimationFrame(scrollState.animationId);
          scrollState.animationId = null;
        }
        
        // 스크롤 초기화
        scrollState.scrollTop = 0;
        scrollState.velocity = 0;
        scrollContent.style.transform = 'translateY(0)';
        scrollVelocity.textContent = '0';
        updateScrollIndicator();
        
        this.utils.addLogEntry(logArea, '스크롤 리셋', 'info');
      });
    }
    
    // 이벤트 등록
    scrollArea.addEventListener('wheel', wheelHandler, { passive: false });
    
    // 터치 이벤트 설정
    window.unifiedPointerEvents.addEventListener(
      scrollArea,
      'start',
      startHandler,
      { preventDefault: true }
    );
    
    window.unifiedPointerEvents.addEventListener(
      scrollArea,
      'move',
      moveHandler,
      { preventDefault: true }
    );
    
    window.unifiedPointerEvents.addEventListener(
      scrollArea,
      'end',
      endHandler,
      { preventDefault: true }
    );
    
    window.unifiedPointerEvents.addEventListener(
      scrollArea,
      'cancel',
      cancelHandler,
      { preventDefault: true }
    );
    
    // fling 이벤트도 리스닝 (UnifiedPointerEvents 자체 기능 활용)
    this.listenerIds.fling = window.unifiedPointerEvents.addEventListener(
      scrollArea,
      'fling',
      (event) => {
        // 이미 자체 구현한 플링 효과가 있으므로 로그만 출력
        this.utils.addLogEntry(
          logArea, 
          `UnifiedPointerEvents fling 감지 - 방향: ${event.direction}, 속도: ${Math.round(event.velocity)}px/s`, 
          'success'
        );
      },
      { preventDefault: true, flingMinVelocity: 600 }
    );
  }
  
  /**
   * 핀치 줌 테스트 초기화 - UnifiedPointerEvents 사용 버전
   */
  initPinchZoom() {
    const testImage = document.getElementById('testImage');
    const zoomFactorDisplay = document.getElementById('zoomFactor');
    const resetZoomBtn = document.getElementById('resetZoom');
    const imageInput = document.getElementById('imageInput');
    const logArea = document.getElementById('gestureLog');
    
    if (!testImage || !zoomFactorDisplay || !logArea) {
      console.error('제스처 테스트: 핀치 줌 요소를 찾을 수 없습니다.');
      return;
    }
    
    // 상태 초기화
    let scale = 1.0;
    let translateX = 0;
    let translateY = 0;
    let lastDeltaX = 0;
    let lastDeltaY = 0;
    
    // 이미지 업로드 처리
    if (imageInput) {
      imageInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            testImage.src = e.target.result;
            // 이미지 로드 시 상태 초기화
            resetZoom();
          };
          reader.readAsDataURL(file);
        }
      });
    }
    
    // 핀치줌 이벤트 리스너
    if (this.listenerIds.pinchzoom !== null) {
      window.unifiedPointerEvents.removeEventListener(this.listenerIds.pinchzoom);
    }
    
    this.listenerIds.pinchzoom = window.unifiedPointerEvents.addEventListener(
      testImage,
      'pinchzoom',
      (event) => {
        // 스케일 업데이트
        scale *= event.deltaScale;
        
        // 스케일 제한 (0.5 ~ 5.0)
        scale = Math.min(Math.max(scale, 0.5), 5.0);
        
        // 변환 적용
        testImage.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
        zoomFactorDisplay.textContent = `${scale.toFixed(1)}x`;
        
        // 로그 출력
        const message = `핀치줌 감지 - 배율: ${scale.toFixed(2)}x, 중심점: (${Math.round(event.center.x)}, ${Math.round(event.center.y)})`;
        this.utils.addLogEntry(logArea, message, 'success');
      },
      { preventDefault: true }
    );
    
    // 드래그 이벤트 (이미지 이동용)
    window.unifiedPointerEvents.addEventListener(
      testImage,
      'dragstart',
      (event) => {
        lastDeltaX = 0;
        lastDeltaY = 0;
      },
      { preventDefault: true }
    );
    
    window.unifiedPointerEvents.addEventListener(
      testImage,
      'drag',
      (event) => {
        // 이전 상태와의 차이를 계산
        const deltaX = event.deltaX - lastDeltaX;
        const deltaY = event.deltaY - lastDeltaY;
        
        // 현재 위치 업데이트
        translateX += deltaX;
        translateY += deltaY;
        
        // 변환 적용
        testImage.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
        
        // 상태 업데이트
        lastDeltaX = event.deltaX;
        lastDeltaY = event.deltaY;
      },
      { preventDefault: true }
    );
    
    // 줌 리셋 함수
    const resetZoom = () => {
      scale = 1.0;
      translateX = 0;
      translateY = 0;
      testImage.style.transform = `translate(0px, 0px) scale(1)`;
      zoomFactorDisplay.textContent = '1.0x';
      this.utils.addLogEntry(logArea, '핀치 줌 리셋됨', 'info');
    };
    
    // 리셋 버튼 이벤트
    if (resetZoomBtn) {
      resetZoomBtn.addEventListener('click', resetZoom);
    }
  }
  
  /**
   * 회전 테스트 초기화 - UnifiedPointerEvents 사용 버전
   */
  initRotate() {
    const rotateTarget = document.getElementById('rotateTarget');
    const rotateAngleDisplay = document.getElementById('rotateAngle');
    const resetRotateBtn = document.getElementById('resetRotate');
    const logArea = document.getElementById('gestureLog');
    
    if (!rotateTarget || !rotateAngleDisplay || !logArea) {
      console.error('제스처 테스트: 회전 요소를 찾을 수 없습니다.');
      return;
    }
    
    // 초기 상태 설정
    let angle = 0;
    
    // 회전 이벤트 리스너
    if (this.listenerIds.rotate !== null) {
      window.unifiedPointerEvents.removeEventListener(this.listenerIds.rotate);
    }
    
    this.listenerIds.rotate = window.unifiedPointerEvents.addEventListener(
      rotateTarget,
      'rotate',
      (event) => {
        // 각도 업데이트
        angle += event.deltaAngle;
        
        // 변환 적용
        rotateTarget.style.transform = `rotate(${angle}deg)`;
        
        // 각도 정규화 (0-360)
        const normalizedAngle = ((angle % 360) + 360) % 360;
        rotateAngleDisplay.textContent = `${normalizedAngle.toFixed(1)}°`;
        
        // 로그 출력 (각도 변화가 클 때만)
        if (Math.abs(event.deltaAngle) > 1) {
          const direction = event.deltaAngle > 0 ? '시계 방향' : '반시계 방향';
          const message = `회전 감지 - ${direction} ${Math.abs(event.deltaAngle).toFixed(1)}°, 총 ${normalizedAngle.toFixed(1)}°`;
          this.utils.addLogEntry(logArea, message, 'success');
        }
      },
      { preventDefault: true }
    );
    
    // 회전 리셋 함수
    const resetRotation = () => {
      angle = 0;
      rotateTarget.style.transform = 'rotate(0deg)';
      rotateAngleDisplay.textContent = '0.0°';
      this.utils.addLogEntry(logArea, '회전 리셋됨', 'info');
    };
    
    // 리셋 버튼 이벤트
    if (resetRotateBtn) {
      resetRotateBtn.addEventListener('click', resetRotation);
    }
  }
  
  /**
   * 타이거 게임 초기화 - 제스처를 활용한 간단한 미니게임
   */
  initTigerGame() {
    const gameArea = document.getElementById('tigerGameArea');
    const tiger = document.getElementById('tigerCharacter');
    const statusDisplay = document.getElementById('gameStatus');
    const resetGameBtn = document.getElementById('resetGame');
    const scoreDisplay = document.getElementById('gameScore');
    const targetElement = document.getElementById('gameTarget');
    const logArea = document.getElementById('gestureLog');
    
    if (!gameArea || !tiger || !statusDisplay || !scoreDisplay || !targetElement || !logArea) {
      console.error('제스처 테스트: 게임 요소를 찾을 수 없습니다.');
      return;
    }
    
    // 게임 초기화
    const initGame = () => {
      this.gameState = {
        isActive: true,
        score: 0,
        tigerPosition: { x: 0, y: 0 },
        targetPosition: { x: 0, y: 0 },
        gameAreaRect: gameArea.getBoundingClientRect()
      };
      
      // 상태 초기화
      updateScore(0);
      statusDisplay.textContent = "게임 시작! 타이거를 움직여서 목표물을 잡으세요.";
      statusDisplay.style.color = 'var(--primary)';
      
      // 타이거 초기 위치 (중앙)
      this.gameState.tigerPosition = {
        x: this.gameState.gameAreaRect.width / 2 - tiger.offsetWidth / 2,
        y: this.gameState.gameAreaRect.height / 2 - tiger.offsetHeight / 2
      };
      
      tiger.style.transform = `translate(${this.gameState.tigerPosition.x}px, ${this.gameState.tigerPosition.y}px)`;
      
      // 새 목표물 생성
      createNewTarget();
      
      this.utils.addLogEntry(logArea, "타이거 게임이 시작되었습니다!", 'success');
    };
    
    // 점수 업데이트
    const updateScore = (newScore) => {
      this.gameState.score = newScore;
      scoreDisplay.textContent = newScore;
    };
    
    // 새 목표물 생성
    const createNewTarget = () => {
      // 타겟 위치 랜덤 설정 (타이거 크기 고려해서 경계 내부에 위치)
      const maxX = this.gameState.gameAreaRect.width - targetElement.offsetWidth;
      const maxY = this.gameState.gameAreaRect.height - targetElement.offsetHeight;
      
      this.gameState.targetPosition = {
        x: Math.floor(Math.random() * maxX),
        y: Math.floor(Math.random() * maxY)
      };
      
      targetElement.style.transform = `translate(${this.gameState.targetPosition.x}px, ${this.gameState.targetPosition.y}px)`;
      targetElement.style.opacity = '1';
    };
    
    // 충돌 감지
    const checkCollision = () => {
      const tigerRect = {
        left: this.gameState.tigerPosition.x,
        right: this.gameState.tigerPosition.x + tiger.offsetWidth,
        top: this.gameState.tigerPosition.y,
        bottom: this.gameState.tigerPosition.y + tiger.offsetHeight
      };
      
      const targetRect = {
        left: this.gameState.targetPosition.x,
        right: this.gameState.targetPosition.x + targetElement.offsetWidth,
        top: this.gameState.targetPosition.y,
        bottom: this.gameState.targetPosition.y + targetElement.offsetHeight
      };
      
      if (
        tigerRect.left < targetRect.right &&
        tigerRect.right > targetRect.left &&
        tigerRect.top < targetRect.bottom &&
        tigerRect.bottom > targetRect.top
      ) {
        // 충돌 발생!
        updateScore(this.gameState.score + 1);
        targetElement.style.opacity = '0'; // 목표물 일시적으로 숨김
        
        // 0.5초 후에 새 목표물 생성
        setTimeout(createNewTarget, 500);
        
        // 로그 출력
        this.utils.addLogEntry(logArea, `타이거가 목표물을 잡았습니다! 현재 점수: ${this.gameState.score}`, 'success');
        
        // 축하 메시지
        statusDisplay.textContent = "목표물을 잡았습니다!";
        statusDisplay.style.color = 'var(--success)';
        
        setTimeout(() => {
          statusDisplay.textContent = "다음 목표물을 찾으세요!";
          statusDisplay.style.color = 'var(--primary)';
        }, 1000);
      }
    };
    
    // 스와이프 핸들러 - 타이거 이동
    const handleSwipe = (event) => {
      if (!this.gameState.isActive) return;
      
      // 스와이프 방향에 따라 타이거 이동
      const moveDistance = 50; // 기본 이동 거리
      let deltaX = 0;
      let deltaY = 0;
      
      switch (event.direction) {
        case 'left': 
          deltaX = -moveDistance; 
          tiger.style.transform = `translate(${this.gameState.tigerPosition.x}px, ${this.gameState.tigerPosition.y}px) scaleX(-1)`;
          break;
        case 'right': 
          deltaX = moveDistance; 
          tiger.style.transform = `translate(${this.gameState.tigerPosition.x}px, ${this.gameState.tigerPosition.y}px) scaleX(1)`;
          break;
        case 'up': deltaY = -moveDistance; break;
        case 'down': deltaY = moveDistance; break;
      }
      
      // 새 위치 계산
      let newX = this.gameState.tigerPosition.x + deltaX;
      let newY = this.gameState.tigerPosition.y + deltaY;
      
      // 경계 검사
      const maxX = this.gameState.gameAreaRect.width - tiger.offsetWidth;
      const maxY = this.gameState.gameAreaRect.height - tiger.offsetHeight;
      
      newX = Math.max(0, Math.min(maxX, newX));
      newY = Math.max(0, Math.min(maxY, newY));
      
      // 타이거 위치 업데이트
      this.gameState.tigerPosition.x = newX;
      this.gameState.tigerPosition.y = newY;
      
      // 방향에 따라 타이거 이미지 방향 설정 (좌우 반전)
      let scaleX = deltaX < 0 ? -1 : 1;
      tiger.style.transform = `translate(${newX}px, ${newY}px) scaleX(${scaleX})`;
      
      // 충돌 확인
      checkCollision();
    };
    
    // 드래그 핸들러 - 타이거 이동
    const handleDrag = (event) => {
      if (!this.gameState.isActive) return;
      
      // 새 위치 계산
      let newX = this.gameState.tigerPosition.x + event.deltaX;
      let newY = this.gameState.tigerPosition.y + event.deltaY;
      
      // 경계 검사
      const maxX = this.gameState.gameAreaRect.width - tiger.offsetWidth;
      const maxY = this.gameState.gameAreaRect.height - tiger.offsetHeight;
      
      newX = Math.max(0, Math.min(maxX, newX));
      newY = Math.max(0, Math.min(maxY, newY));
      
      // 타이거 위치 업데이트
      this.gameState.tigerPosition.x = newX;
      this.gameState.tigerPosition.y = newY;
      
      // 방향에 따라 타이거 이미지 방향 설정 (좌우 반전)
      let scaleX = event.deltaX < 0 ? -1 : 1;
      tiger.style.transform = `translate(${newX}px, ${newY}px) scaleX(${scaleX})`;
      
      // 충돌 확인
      checkCollision();
    };
    
    // 리셋 버튼 이벤트
    if (resetGameBtn) {
      resetGameBtn.addEventListener('click', initGame);
    }
    
    // 스와이프 이벤트 리스너 등록
    this.listenerIds.swipeTiger = window.unifiedPointerEvents.addEventListener(
      gameArea,
      'swipe',
      handleSwipe,
      { swipeThreshold: 30, swipeTimeout: 500, preventDefault: true }
    );
    
    // 드래그 이벤트 리스너 등록
    this.listenerIds.dragTiger = window.unifiedPointerEvents.addEventListener(
      tiger,
      'drag',
      handleDrag,
      { preventDefault: true }
    );
    
    // 더블 클릭으로 게임 시작/재시작
    this.listenerIds.dblclickGame = window.unifiedPointerEvents.addEventListener(
      gameArea,
      'doubleclick',
      () => {
        initGame();
      },
      { doubleClickDelay: 300, preventDefault: true }
    );
    
    // 초기화
    initGame();
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
      pinchzoom: null,
      rotate: null,
      fling: null,
      dragTiger: null,
      swipeTiger: null,
      dblclickGame: null
    };
  }
}