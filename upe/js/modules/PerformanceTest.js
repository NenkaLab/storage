/**
 * 성능 테스트 모듈
 * 이벤트 처리 성능 및 메모리 사용량을 테스트합니다.
 */
export default class PerformanceTest {
  /**
   * 생성자
   * @param {UIManager} ui - UI 관리자
   * @param {Utils} utils - 유틸리티 객체
   */
  constructor(ui, utils) {
    this.ui = ui;
    this.utils = utils;
    this.testListeners = [];
    this.testElements = [];
    this.stressTestListenerId = null;
    this.stressTestActive = false;
    this.stressTestStartTime = 0;
    this.stressTestMoveCount = 0;
    this.stressTestLastUpdate = 0;
    this.memoryUpdateInterval = null;
  }
  
  /**
   * 모듈 초기화
   * 성능 테스트를 설정합니다.
   */
  init() {
    // 이전 리스너 제거
    this.removeTestListeners();
    
    // 스트레스 테스트 중지
    this.stopStressTest();
    
    // 메모리 업데이트 중지
    this.stopMemoryUpdates();
    
    // 초기 성능 지표 업데이트
    this.updatePerformanceMetrics();
    
    // 주기적 메모리 사용량 업데이트 시작
    this.startMemoryUpdates();
    
    // 컨트롤 이벤트 설정
    this.setupControlEvents();
  }
  
  /**
   * 컨트롤 이벤트 설정
   */
  setupControlEvents() {
    // 리스너 생성 버튼
    const createListeners = document.getElementById('createListeners');
    if (createListeners) {
      createListeners.addEventListener('click', () => this.createTestListeners());
    }
    
    // 리스너 제거 버튼
    const removeListeners = document.getElementById('removeListeners');
    if (removeListeners) {
      removeListeners.addEventListener('click', () => this.removeTestListeners());
    }
    
    // 스트레스 테스트 버튼
    const stressTest = document.getElementById('stressTest');
    if (stressTest) {
      stressTest.addEventListener('click', () => {
        if (this.stressTestActive) {
          this.stopStressTest();
        } else {
          this.startStressTest();
        }
      });
    }
  }
  
  /**
   * 테스트 리스너 생성
   */
  createTestListeners() {
    // 이전 리스너 제거
    this.removeTestListeners();
    
    // 생성할 리스너 수
    const amount = parseInt(document.getElementById('listenerAmount')?.value || 100);
    if (isNaN(amount) || amount <= 0 || amount > 2000) {
      this.utils.showToast('올바른 리스너 수를 입력하세요 (1~2000)', 'error');
      return;
    }
    
    const logArea = document.getElementById('performanceLog');
    if (!logArea) return;
    
    const startTime = performance.now();
    
    // 임시 요소 및 리스너 생성
    const stressTestArea = document.getElementById('stressTestArea');
    if (!stressTestArea) return;
    
    for (let i = 0; i < amount; i++) {
      const element = document.createElement('div');
      element.style.position = 'absolute';
      element.style.width = '10px';
      element.style.height = '10px';
      element.style.backgroundColor = 'transparent';
      element.style.top = `${Math.random() * 100}%`;
      element.style.left = `${Math.random() * 100}%`;
      
      stressTestArea.appendChild(element);
      this.testElements.push(element);
      
      // 다양한 이벤트 리스너 추가
      this.testListeners.push(
        window.unifiedPointerEvents.addEventListener(element, 'start', () => {}),
        window.unifiedPointerEvents.addEventListener(element, 'move', () => {}),
        window.unifiedPointerEvents.addEventListener(element, 'end', () => {})
      );
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // 성능 지표 업데이트
    this.updatePerformanceMetrics();
    
    // 로그 출력
    this.utils.addLogEntry(
      logArea,
      `${this.testListeners.length}개의 리스너 생성 완료 - 소요 시간: ${duration.toFixed(2)}ms`,
      'success'
    );
    
    this.utils.showToast(`${this.testListeners.length}개의 리스너가 생성되었습니다.`, 'success');
  }
  
  /**
   * 테스트 리스너 제거
   */
  removeTestListeners() {
    if (this.testListeners.length === 0) {
      return;
    }
    
    const logArea = document.getElementById('performanceLog');
    if (!logArea) return;
    
    const startTime = performance.now();
    
    // 리스너 제거
    this.testListeners.forEach(id => {
      window.unifiedPointerEvents.removeEventListener(id);
    });
    
    // 임시 요소 제거
    this.testElements.forEach(element => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });
    
    // 배열 초기화
    const removedCount = this.testListeners.length;
    this.testListeners = [];
    this.testElements = [];
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // 성능 지표 업데이트
    this.updatePerformanceMetrics();
    
    // 로그 출력
    this.utils.addLogEntry(
      logArea,
      `${removedCount}개의 리스너 제거 완료 - 소요 시간: ${duration.toFixed(2)}ms`,
      'info'
    );
    
    this.utils.showToast('모든 테스트 리스너가 제거되었습니다.');
  }
  
  /**
   * 주기적 메모리 사용량 업데이트 시작
   */
  startMemoryUpdates() {
    this.stopMemoryUpdates();
    
    // 1초마다 메모리 사용량 업데이트
    this.memoryUpdateInterval = setInterval(() => {
      this.updateMemoryUsage();
    }, 1000);
  }
  
  /**
   * 메모리 업데이트 중지
   */
  stopMemoryUpdates() {
    if (this.memoryUpdateInterval) {
      clearInterval(this.memoryUpdateInterval);
      this.memoryUpdateInterval = null;
    }
  }
  
  /**
   * 성능 지표 업데이트
   */
  updatePerformanceMetrics() {
    // 리스너 수 표시
    const listenerCount = document.getElementById('listenerCount');
    if (listenerCount) {
      listenerCount.textContent = this.testListeners.length;
    }
    
    // 메모리 사용량 업데이트
    this.updateMemoryUsage();
  }
  
  /**
   * 메모리 사용량 업데이트
   */
  updateMemoryUsage() {
    const memoryUsage = document.getElementById('memoryUsage');
    if (!memoryUsage) return;
    
    // 메모리 정보 가져오기
    const memoryInfo = this.utils.getMemoryUsage();
    if (memoryInfo) {
      memoryUsage.textContent = memoryInfo.used;
    } else {
      memoryUsage.textContent = '측정 불가';
    }
  }
  
  /**
   * 스트레스 테스트 시작
   */
  startStressTest() {
    if (this.stressTestActive) {
      this.stopStressTest();
      return;
    }
    
    const stressTestArea = document.getElementById('stressTestArea');
    const stressTestTarget = document.getElementById('stressTestTarget');
    const stressTestStatus = document.getElementById('stressTestStatus');
    const processingTime = document.getElementById('processingTime');
    const logArea = document.getElementById('performanceLog');
    
    if (!stressTestArea || !stressTestTarget || !stressTestStatus || !processingTime || !logArea) {
      return;
    }
    
    this.stressTestActive = true;
    this.stressTestMoveCount = 0;
    this.stressTestStartTime = performance.now();
    this.stressTestLastUpdate = performance.now();
    
    stressTestStatus.textContent = '상태: 테스트 중...';
    document.getElementById('stressTest').textContent = '테스트 중지';
    
    // 이전 리스너 제거
    if (this.stressTestListenerId !== null) {
      window.unifiedPointerEvents.removeEventListener(this.stressTestListenerId);
    }
    
    // 이동 이벤트 리스너 등록
    this.stressTestListenerId = window.unifiedPointerEvents.addEventListener(
      stressTestArea,
      'move',
      (event) => {
        this.stressTestMoveCount++;
        
        // 타겟 요소 이동
        const rect = stressTestArea.getBoundingClientRect();
        const x = event.clientX - rect.left - (stressTestTarget.offsetWidth / 2);
        const y = event.clientY - rect.top - (stressTestTarget.offsetHeight / 2);
        stressTestTarget.style.transform = `translate(${x}px, ${y}px)`;
        
        // 초당 이벤트 처리량 계산 (200ms마다 업데이트)
        const now = performance.now();
        if (now - this.stressTestLastUpdate > 200) {
          const totalTime = (now - this.stressTestStartTime) / 1000; // 초 단위
          const eventsPerSecond = Math.round(this.stressTestMoveCount / totalTime);
          
          processingTime.textContent = `${eventsPerSecond}/초`;
          stressTestStatus.textContent = `상태: 테스트 중... (${this.stressTestMoveCount} 이벤트, ${eventsPerSecond}/초)`;
          
          this.stressTestLastUpdate = now;
        }
      },
      { preventDefault: true }
    );
    
    this.utils.showToast('스트레스 테스트가 시작되었습니다. 포인터를 이동해보세요.', 'info');
  }
  
  /**
   * 스트레스 테스트 중지
   */
  stopStressTest() {
    if (!this.stressTestActive) return;
    
    this.stressTestActive = false;
    
    const logArea = document.getElementById('performanceLog');
    const stressTestStatus = document.getElementById('stressTestStatus');
    const stressTestBtn = document.getElementById('stressTest');
    
    if (!logArea || !stressTestStatus || !stressTestBtn) return;
    
    // 리스너 제거
    if (this.stressTestListenerId !== null) {
      window.unifiedPointerEvents.removeEventListener(this.stressTestListenerId);
      this.stressTestListenerId = null;
    }
    
    // 테스트 결과
    const totalTime = (performance.now() - this.stressTestStartTime) / 1000; // 초 단위
    const eventsPerSecond = Math.round(this.stressTestMoveCount / totalTime);
    
    stressTestStatus.textContent = `상태: 대기 중`;
    stressTestBtn.textContent = '스트레스 테스트';
    
    // 로그 출력
    this.utils.addLogEntry(
      logArea,
      `스트레스 테스트 완료 - ${this.stressTestMoveCount} 이벤트 처리, ${eventsPerSecond}/초, 총 ${totalTime.toFixed(2)}초`,
      'success'
    );
    
    this.utils.showToast(`스트레스 테스트 완료: ${eventsPerSecond}이벤트/초`, 'success');
  }
  
  /**
   * 모듈 정리
   * 페이지를 벗어날 때 호출됩니다.
   */
  cleanup() {
    // 이전 리스너 제거
    this.removeTestListeners();
    
    // 스트레스 테스트 중지
    this.stopStressTest();
    
    // 메모리 업데이트 중지
    this.stopMemoryUpdates();
  }
}