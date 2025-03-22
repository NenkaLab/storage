/**
 * 기본 포인터 이벤트 테스트 모듈
 * start, move, end, cancel 이벤트 처리를 담당합니다.
 */
export default class BasicTest {
  /**
   * 생성자
   * @param {UIManager} ui - UI 관리자
   * @param {Utils} utils - 유틸리티 객체
   */
  constructor(ui, utils) {
    this.ui = ui;
    this.utils = utils;
    this.listenerIds = [];
  }
  
  /**
   * 모듈 초기화
   * 이벤트 리스너를 설정합니다.
   */
  init() {
    // 이전 리스너 제거
    this.removeEventListeners();
    
    // 필요한 DOM 요소 참조
    const testArea = document.getElementById('basicTestArea');
    const logArea = document.getElementById('basicLog');
    
    if (!testArea || !logArea) {
      console.error('기본 테스트: 필요한 DOM 요소를 찾을 수 없습니다.');
      return;
    }
    
    // 이벤트 옵션 가져오기
    const filterValue = document.querySelector('input[name="deviceFilter"]:checked')?.value || 'all';
    const preventDefault = document.getElementById('preventDefaultBasic')?.checked || false;
    
    // 이벤트 옵션 설정
    const options = { preventDefault };
    
    // 필터 적용
    if (filterValue === 'mouse') {
      options.mouseOnly = true;
    } else if (filterValue === 'touch') {
      options.touchOnly = true;
    } else if (filterValue === 'pen') {
      options.penOnly = true;
    }
    
    // 이벤트 타입별 핸들러
    const eventTypes = ['start', 'move', 'end', 'cancel'];
    
    // 각 이벤트 타입에 대한 리스너 등록
    eventTypes.forEach(eventType => {
      const listenerId = window.unifiedPointerEvents.addEventListener(
        testArea,
        eventType,
        (event) => this.handleBasicEvent(event, testArea, logArea),
        options
      );
      
      this.listenerIds.push(listenerId);
    });
    
    // 필터 변경 이벤트
    const radioButtons = document.querySelectorAll('input[name="deviceFilter"]');
    radioButtons.forEach(radio => {
      radio.addEventListener('change', () => this.init());
    });
    
    // preventDefault 변경 이벤트
    const preventDefaultCheck = document.getElementById('preventDefaultBasic');
    if (preventDefaultCheck) {
      preventDefaultCheck.addEventListener('change', () => this.init());
    }
    
    // 초기화 로그
    const filterName = filterValue === 'all' 
      ? '모든' 
      : this.utils.pointerTypeToKorean(filterValue);
      
    this.utils.addLogEntry(
      logArea, 
      `${filterName} 입력 장치에 대한 리스너가 설정되었습니다.`, 
      'info'
    );
  }
  
  /**
   * 기본 이벤트 핸들러
   * @param {Object} event - 통합 포인터 이벤트
   * @param {HTMLElement} testArea - 테스트 영역 요소
   * @param {HTMLElement} logArea - 로그 영역 요소
   */
  handleBasicEvent(event, testArea, logArea) {
    // 포인터 타입 및 이벤트 타입 한글화
    const pointerTypeKo = this.utils.pointerTypeToKorean(event.pointerType);
    const eventTypeKo = this.utils.eventTypeToKorean(event.type);
    
    // 로그 메시지 구성
    let message = `${pointerTypeKo} ${eventTypeKo} - X: ${Math.round(event.clientX)}, Y: ${Math.round(event.clientY)}`;
    
    // 추가 정보가 있으면 포함
    if (event.pressure > 0) {
      message += `, 압력: ${event.pressure.toFixed(2)}`;
    }
    
    if (event.isPrimary !== undefined) {
      message += `, 주입력: ${event.isPrimary ? '예' : '아니오'}`;
    }
    
    // 로그에 추가
    this.utils.addLogEntry(logArea, message);
    
    // 시각적 피드백
    if (event.type === 'start') {
      testArea.style.backgroundColor = 'var(--primary-light)';
    } else if (event.type === 'end' || event.type === 'cancel') {
      setTimeout(() => {
        testArea.style.backgroundColor = '';
      }, 300);
    }
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